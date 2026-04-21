import { logger } from '@/logger/logger';
import { createChallenge, verifySolution } from 'altcha-lib';
import { logPrefix } from './log';
import { ALTCHA_EXPIRY_MS } from './altchaClient';

const moduleName = "util/altcha";

export async function createAltchaChallenge() {
    try {
        const challenge = await createChallenge({
            hmacKey: process.env.ALTCHA_SECRET!,
            expires: new Date(Date.now() + ALTCHA_EXPIRY_MS),
        });
        
        return challenge;
    } catch (error) {
        logger.error(`${logPrefix(moduleName)}Error creating ALTCHA challenge:`, error);
        throw new Error('Failed to create challenge');
    }
}

export async function verifyAltchaSolution(payload: string) {
    try {
        const isValid = await verifySolution(payload, process.env.ALTCHA_SECRET!);
        return isValid;
    } catch (error) {
        logger.error(`${logPrefix(moduleName)}Error verifying ALTCHA solution:`, error);
        return false;
    }
}