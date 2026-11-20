import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/auth.guard.js';
import { RawResponse } from '../common/response-envelope.interceptor.js';
import {
  deleteAccountPage,
  homePage,
  privacyPage,
  termsPage,
  type SiteSettings,
} from './pages.js';

const HTML = 'text/html; charset=utf-8';

/**
 * Public homepage, privacy policy and terms at the root of the API host
 * (outside /api/v1), linked from Google's OAuth consent screen.
 */
@Public()
@RawResponse()
@Controller()
export class SiteController {
  private readonly settings: SiteSettings;

  constructor(config: ConfigService) {
    this.settings = {
      supportEmail: config.get<string>('SUPPORT_EMAIL') || undefined,
      googleVerification: config.get<string>('GOOGLE_SITE_VERIFICATION') || undefined,
    };
  }

  @Get()
  @Header('Content-Type', HTML)
  @Header('Cache-Control', 'public, max-age=3600')
  home(): string {
    return homePage(this.settings);
  }

  @Get('privacy')
  @Header('Content-Type', HTML)
  @Header('Cache-Control', 'public, max-age=3600')
  privacy(): string {
    return privacyPage(this.settings);
  }

  @Get('delete-account')
  @Header('Content-Type', HTML)
  @Header('Cache-Control', 'public, max-age=3600')
  deleteAccount(): string {
    return deleteAccountPage(this.settings);
  }

  @Get('terms')
  @Header('Content-Type', HTML)
  @Header('Cache-Control', 'public, max-age=3600')
  terms(): string {
    return termsPage(this.settings);
  }
}
