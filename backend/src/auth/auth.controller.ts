import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppError } from '../common/app-error.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CurrentAuth, Public } from './auth.guard.js';
import {
  RefreshSchema,
  RequestOtpSchema,
  VerifyOtpSchema,
} from './auth.schemas.js';
import type { Refresh, RequestOtp, VerifyOtp } from './auth.schemas.js';
import { OtpService } from './otp.service.js';
import { TokenService } from './token.service.js';
import type { AuthContext, IssuedTokens } from './token.service.js';

/** Stricter per-IP limit on login endpoints (docs/10 §1). */
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 20 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('request-otp')
  @HttpCode(HttpStatus.ACCEPTED)
  requestOtp(@Body(new ZodValidationPipe(RequestOtpSchema)) body: RequestOtp) {
    return this.otp.request(body.phone);
  }

  /** Logs in (and signs up a new user) with phone + code. Creates a device session. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body(new ZodValidationPipe(VerifyOtpSchema)) body: VerifyOtp,
  ) {
    await this.otp.verify(body.phone, body.code);
    const user = await this.prisma.user.upsert({
      where: { phone: body.phone },
      create: { phone: body.phone },
      update: {},
    });
    if (user.status !== 'ACTIVE') {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_DISABLED',
        'This account is not active. Contact the business owner.',
      );
    }
    return this.session(await this.tokens.loginNewDevice(user.id, body.device));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body(new ZodValidationPipe(RefreshSchema)) body: Refresh) {
    return this.session(await this.tokens.refresh(body.refreshToken));
  }

  /** Ends this phone's session: its refresh tokens stop working at once. */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentAuth() auth: AuthContext) {
    await this.tokens.revokeDevice(auth.deviceId);
    return { loggedOut: true };
  }

  @Get('me')
  async me(@CurrentAuth() auth: AuthContext) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: auth.userId },
    });
    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
      },
      membership: auth.memberId
        ? {
            organizationId: auth.organizationId,
            memberId: auth.memberId,
            role: auth.role,
          }
        : null,
      deviceId: auth.deviceId,
    };
  }

  private async session(t: IssuedTokens) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: t.auth.userId },
    });
    return {
      accessToken: t.accessToken,
      accessTokenExpiresIn: t.accessTokenExpiresIn,
      refreshToken: t.refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
      },
      membership: t.auth.memberId
        ? {
            organizationId: t.auth.organizationId,
            memberId: t.auth.memberId,
            role: t.auth.role,
          }
        : null,
    };
  }
}
