import { logger } from '@/logger/logger';
import { createChallenge, verifySolution } from 'altcha-lib';
import { logPrefix } from './log';

const moduleName = "util/altcha";

// Configuration
const ALTCHA_SECRET = process.env.ALTCHA_SECRET!;

export async function createAltchaChallenge() {
    try {
        const challenge = await createChallenge({
            hmacKey: ALTCHA_SECRET,
            // Optional: set expiration (default: 5 minutes)
            expires: new Date(Date.now() + 5 * 60 * 1000)
        });
        
        return challenge;
    } catch (error) {
        logger.error(`${logPrefix(moduleName)}Error creating ALTCHA challenge:`, error);
        throw new Error('Failed to create challenge');
    }
}

export async function verifyAltchaSolution(payload: string) {
    try {
        const isValid = await verifySolution(payload, ALTCHA_SECRET);
        return isValid;
    } catch (error) {
        logger.error(`${logPrefix(moduleName)}Error verifying ALTCHA solution:`, error);
        return false;
    }
}