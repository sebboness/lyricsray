import { completeLogin } from '@/lib/session';

export interface RawLoginResult {
    challengeName: string | null;
    session: string | null;
    tokens: { idToken: string; accessToken: string; refreshToken: string; expiresIn: number } | null;
}

export interface NormalizedLoginResult {
    done: boolean;
    challengeName?: string;
    session?: string;
}

/**
 * Login and new-password can each end either in a further challenge (e.g.
 * EMAIL_OTP) or completed tokens, depending on what Cognito decides — that isn't
 * something the client should have to guess at. This establishes the session when
 * tokens are present and normalizes both outcomes into one shape for the client.
 */
export async function finalizeLoginResult(data: RawLoginResult): Promise<NormalizedLoginResult> {
    if (data.tokens) {
        await completeLogin(data.tokens);
        return { done: true };
    }

    return { done: false, challengeName: data.challengeName ?? undefined, session: data.session ?? undefined };
}
