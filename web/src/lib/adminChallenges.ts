// Must match PASSWORD_RESET_REQUIRED in api/src/services/cognito.ts — the synthetic
// challenge name surfaced when an admin has run AdminResetUserPassword (distinct
// from Cognito's own NEW_PASSWORD_REQUIRED/EMAIL_OTP challenge names). Unlike those,
// it carries no `session` — it isn't part of the InitiateAuth/RespondToAuthChallenge
// flow at all, so callers must not require `session` to be present for this one.
export const PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED';

export interface LoginChallenge {
    username: string;
    challengeName: string;
    session?: string;
}
