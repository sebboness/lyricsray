// Global Vitest setup — runs before any test file's module graph is imported,
// so module-scope reads of process.env (e.g. tableName in storage/services) see
// these values. See vitest.config.ts's `test.setupFiles`.
process.env.APP_NAME = 'testapp';
process.env.ENV = 'test';
process.env.AWS_REGION = 'us-west-2';
process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.ALTCHA_SECRET = 'test-secret';
process.env.APP_FREE_TIER_GLOBAL_DAILY_LIMIT = '10000';
process.env.APP_FREE_TIER_HOURLY_LIMIT = '10';
process.env.APP_FREE_TIER_DAILY_LIMIT = '100';
process.env.APP_FREE_TIER_BURST_LIMIT = '5';
process.env.APP_FREE_TIER_BURST_WINDOW_MINUTES = '10';
