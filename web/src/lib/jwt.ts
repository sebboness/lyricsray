export const SESSION_COOKIE = 'lyricsray_admin_session';

// Long-lived cookie holding {username, refreshToken}, used to silently renew the
// short-lived id token in SESSION_COOKIE without re-prompting for a password/OTP.
// Its maxAge should not exceed the Cognito app client's configured refresh token
// validity (default 30 days) — see CLAUDE.md.
export const REFRESH_COOKIE = 'lyricsray_admin_refresh';
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface RefreshCookiePayload {
    username: string;
    refreshToken: string;
}

export interface IdTokenClaims {
    sub?: string;
    email?: string;
    'cognito:username'?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    exp?: number;
}

/**
 * Resolves a display name from an id token's claims. Cognito attributes are read-
 * permission-gated but not required to have a value — an admin user may have
 * `given_name`/`family_name` set instead of (or without) `name`, so this falls back
 * accordingly rather than assuming `name` is always populated.
 */
export function fullNameFromClaims(claims: IdTokenClaims | null): string {
    if (!claims) return '';
    if (claims.name) return claims.name;
    return [claims.given_name, claims.family_name].filter(Boolean).join(' ');
}

/**
 * Decodes (does not verify) a JWT's payload. This is only used for local exp/UX
 * checks and reading display fields — real cryptographic verification of the token
 * happens in the Lambda (api/src/auth/verifyJwt.ts) on every authenticated API call.
 *
 * Pure/runtime-agnostic (no next/headers import) so it can be shared between
 * middleware.ts (edge runtime) and lib/session.ts (node runtime).
 */
export function decodeIdToken(idToken: string): IdTokenClaims | null {
    try {
        const [, payload] = idToken.split('.');
        if (!payload) return null;
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    } catch {
        return null;
    }
}

export function isValidSessionToken(idToken: string | undefined | null): boolean {
    if (!idToken) return false;
    const claims = decodeIdToken(idToken);
    return !!(claims?.sub && claims.exp && claims.exp * 1000 >= Date.now());
}
