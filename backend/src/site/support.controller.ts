import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeIndianMobile } from '../auth/phone.js';

/**
 * Where people in the app ask for help (T7.3): More / Profile › Help.
 * From the server's settings, so the number can change without a new app.
 * Any signed-in person may read it, also before joining a business (the join
 * screen shows help too). Null = not set, the app hides that row.
 */
@Controller('support')
export class SupportController {
  private readonly contacts: { whatsapp: string | null; email: string | null };

  constructor(config: ConfigService) {
    this.contacts = {
      whatsapp: normalizeIndianMobile(config.get<string>('SUPPORT_WHATSAPP') ?? ''),
      email: config.get<string>('SUPPORT_EMAIL') || null,
    };
  }

  @Get()
  get() {
    return this.contacts;
  }
}
