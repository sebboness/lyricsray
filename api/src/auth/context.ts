import { VerifiedIdTokenClaims } from './verifyJwt';

/**
 * Typed access to a verified admin id token's claims. There's a single admin user in
 * the pool, so no group/role checks are needed — presence of a verified token is
 * equivalent to "is admin".
 */
export class AuthorizerInfo {
  constructor(private readonly claims: VerifiedIdTokenClaims | null = null) {}

  hasInfo(): boolean {
    return this.claims !== null && !!this.claims.sub;
  }

  getUserId(): string {
    return this.claims?.sub ?? '';
  }

  getUsername(): string {
    return this.claims?.['cognito:username'] ?? '';
  }

  getEmail(): string {
    return this.claims?.email ?? '';
  }

  getFullName(): string {
    return this.claims?.name ?? '';
  }
}
