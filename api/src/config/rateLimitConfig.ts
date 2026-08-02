const defaults = {
  globalDailyLimit: parseInt(process.env.APP_FREE_TIER_GLOBAL_DAILY_LIMIT || '0'),
  hourlyLimit: parseInt(process.env.APP_FREE_TIER_HOURLY_LIMIT || '0'),
  dailyLimit: parseInt(process.env.APP_FREE_TIER_DAILY_LIMIT || '0'),
  burstLimit: parseInt(process.env.APP_FREE_TIER_BURST_LIMIT || '0'),
  burstWindowMinutes: parseInt(process.env.APP_FREE_TIER_BURST_WINDOW_MINUTES || '0'),
};

export interface RateLimitConfig {
  hourlyLimit: number;
  dailyLimit: number;
  globalDailyLimit: number;
  burstLimit: number;
  burstWindowMinutes: number;
}

export function getDefaultRateLimitConfig(): RateLimitConfig {
  return { ...defaults };
}
