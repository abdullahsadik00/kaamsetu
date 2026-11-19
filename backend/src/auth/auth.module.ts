import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import {
  CapturingOtpSender,
  DevConsoleOtpSender,
  OtpSender,
  SmsNotConfiguredSender,
} from './otp-sender.js';
import { OtpService } from './otp.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { algorithm: 'HS256', issuer: 'kaamsetu' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'kaamsetu' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    OtpService,
    TokenService,
    {
      provide: OtpSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService): OtpSender => {
        switch (config.get<string>('NODE_ENV')) {
          case 'development':
            return new DevConsoleOtpSender();
          case 'test':
            return new CapturingOtpSender();
          default:
            return new SmsNotConfiguredSender();
        }
      },
    },
    // Every route needs a valid token unless marked @Public() (docs/10 §3).
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
