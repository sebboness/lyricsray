const defaults = {
    globalDailyLimit: parseInt(process.env.FREE_TIER_GLOBAL_DAILY_LIMIT || "0"),
    hourlyLimit: parseInt(process.env.FREE_TIER_HOURLY_LIMIT || "0"),
    dailyLimit: parseInt(process.env.FREE_TIER_DAILY_LIMIT || "0"),
    burstLimit: parseInt(process.env.FREE_TIER_BURST_LIMIT || "0"),
    burstWindowMinutes: parseInt(process.env.FREE_TIER_BURST_WINDOW_MINUTES || "0"),
};

export interface RateLimitTier {
    name: string;
    hourlyLimit: number;
    dailyLimit: number;
    burstLimit: number;
    burstWindowMinutes: number;
    description: string;
}

export interface RateLimitSettings {
    globalDailyLimit: number;
    tiers: {
        free: RateLimitTier;
        premium?: RateLimitTier; // For future paid plans
    };
    enableRateLimit: boolean;
    fallbackBehavior: 'allow' | 'deny'; // What to do if rate limit service fails
}

// Configuration based on environment
// const isDevelopment = process.env.NODE_ENV === 'development';

export const rateLimitConfig: RateLimitSettings = {
    // Global limit across all users - adjust based on your Anthropic budget
    // Assuming ~$0.0085 per request, 1000 requests = ~$8.50/day
    globalDailyLimit: defaults.globalDailyLimit,

    enableRateLimit: true, // !isDevelopment, // Disable in dev, enable in prod

    fallbackBehavior: 'allow', // Fail open - don't block users if service is down

    tiers: {
        free: {
            name: 'Free Tier',
            hourlyLimit: defaults.hourlyLimit,
            dailyLimit: defaults.dailyLimit,
            burstLimit: defaults.burstLimit,
            burstWindowMinutes: defaults.burstWindowMinutes,
            description: 'Perfect for trying out LyricsRay with a few songs'
        },
    }
};

// Helper function to get the default rate limit config for the "free" tier
export function getDefaultRateLimitConfig() {
    const userTier = 'free';
    const config = rateLimitConfig.tiers[userTier];

    if (!config) {
        throw new Error(`Unknown rate limit tier: ${userTier}`);
    }

    return {
        hourlyLimit: config.hourlyLimit,
        dailyLimit: config.dailyLimit,
        globalDailyLimit: rateLimitConfig.globalDailyLimit,
        burstLimit: config.burstLimit,
        burstWindowMinutes: config.burstWindowMinutes,
    };
}