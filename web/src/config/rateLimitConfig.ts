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
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const rateLimitConfig: RateLimitSettings = {
    // Global limit across all users - adjust based on your Anthropic budget
    // Assuming ~$0.0085 per request, 1000 requests = ~$8.50/day
    globalDailyLimit: isDevelopment ? 1000 : 300,

    enableRateLimit: !isDevelopment, // Disable in dev, enable in prod

    fallbackBehavior: 'allow', // Fail open - don't block users if service is down

    tiers: {
        free: {
            name: 'Free Tier',
            hourlyLimit: isDevelopment ? 20 : 12, // Higher limit for development testing
            dailyLimit: isDevelopment ? 50 : 25,
            burstLimit: isDevelopment ? 10 : 5,
            burstWindowMinutes: 10,
            description: 'Perfect for trying out LyricsRay with a few songs'
        },
    }
};

// Helper function to get rate limit config for a user
export function getRateLimitConfigForUser(userTier: 'free' | 'premium' = 'free') {
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

// Environment-specific adjustments
export const getEnvironmentConfig = () => {
    if (isDevelopment) {
        return {
            ...rateLimitConfig,
            enableRateLimit: false, // No limits in development
            globalDailyLimit: 999999,
        };
    }

    if (process.env.VERCEL_ENV === 'preview') {
        return {
            ...rateLimitConfig,
            globalDailyLimit: 200, // Lower limit for preview deployments
            tiers: {
                ...rateLimitConfig.tiers,
                free: {
                ...rateLimitConfig.tiers.free,
                hourlyLimit: 5,
                dailyLimit: 10,
                }
            }
        };
    }

    return rateLimitConfig;
};