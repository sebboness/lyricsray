import { createChallenge, verifySolution } from 'altcha-lib';
import { logger } from './logger';

const ALTCHA_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes

export async function createAltchaChallenge() {
  try {
    return await createChallenge({
      hmacKey: process.env.ALTCHA_SECRET!,
      expires: new Date(Date.now() + ALTCHA_EXPIRY_MS),
    });
  } catch (error) {
    logger.error('error creating altcha challenge', { error });
    throw new Error('Failed to create challenge');
  }
}

export async function verifyAltchaSolution(payload: string): Promise<boolean> {
  try {
    return await verifySolution(payload, process.env.ALTCHA_SECRET!);
  } catch (error) {
    logger.error('error verifying altcha solution', { error });
    return false;
  }
}
