import { describe, it, expect } from 'vitest';
import { getBotRateLimitConfig, getDefaultRateLimitConfig } from './rateLimitConfig';

// APP_FREE_TIER_* env vars are set in src/test/setup.ts
describe('getBotRateLimitConfig', () => {
    it('enforces dailyLimit, hourlyLimit, and burstLimit of 1 regardless of env defaults', () => {
        const config = getBotRateLimitConfig();
        expect(config.dailyLimit).toBe(1);
        expect(config.hourlyLimit).toBe(1);
        expect(config.burstLimit).toBe(1);
    });

    it('preserves globalDailyLimit and burstWindowMinutes from the env defaults', () => {
        const defaults = getDefaultRateLimitConfig();
        const config = getBotRateLimitConfig();
        expect(config.globalDailyLimit).toBe(defaults.globalDailyLimit);
        expect(config.burstWindowMinutes).toBe(defaults.burstWindowMinutes);
    });
});
