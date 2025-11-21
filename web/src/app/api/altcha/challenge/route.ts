import { NextResponse } from 'next/server';
import { logger } from '@/logger/logger';
import { createAltchaChallenge } from '@/util/altcha';
import { logPrefix } from '@/util/log';

const moduleName = "altcha/challenge";

export async function GET() {
    try {
        const challenge = await createAltchaChallenge();
        return NextResponse.json(challenge);
    } catch (error) {
        logger.error(`${logPrefix(moduleName)}Error creating ALTCHA challenge:`, error);
        return NextResponse.json(
            { error: 'Failed to create challenge' },
            { status: 500 }
        );
    }
}
