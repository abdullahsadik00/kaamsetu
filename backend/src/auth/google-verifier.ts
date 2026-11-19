import { HttpStatus, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../common/app-error.js';

export interface GoogleIdentity {
  /** Stable Google account id ("sub"). */
  subject: string;
  email: string | null;
  name: string | null;
}

/** Checks a Google ID token from the app (D-025). Replaced by a fake in tests. */
export abstract class GoogleVerifier {
  abstract verify(idToken: string): Promise<GoogleIdentity>;
}

const invalid = () =>
  new AppError(
    HttpStatus.UNAUTHORIZED,
    'GOOGLE_TOKEN_INVALID',
    'Google sign-in failed. Please try again.',
  );

/** Verifies signature, expiry, issuer and audience against our OAuth client IDs. */
@Injectable()
export class GoogleAuthLibraryVerifier extends GoogleVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly audiences: string[]) {
    super();
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw invalid();
    }
    if (!payload?.sub) throw invalid();
    return {
      subject: payload.sub,
      email: payload.email_verified ? (payload.email ?? null) : null,
      name: payload.name ?? null,
    };
  }
}

/** No GOOGLE_CLIENT_IDS configured: refuse clearly. */
export class GoogleNotConfiguredVerifier extends GoogleVerifier {
  async verify(): Promise<GoogleIdentity> {
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'GOOGLE_NOT_CONFIGURED',
      'Google sign-in is not set up on this server yet.',
    );
  }
}
