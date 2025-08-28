import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js environment variables
process.env.APP_NAME = 'LyricsRay'
process.env.APP_VERSION = '1.0.0'
process.env.APP_URL = 'https://lyricsray.com'
process.env.ANTHROPIC_MODEL = 'claude-4-sonnet-20250514';
process.env.ANTHROPIC_API_KEY = 'test1234!';
process.env.AWS_REGION = 'us-west-2;'
process.env.AWS_ACCESS_KEY_ID = 'TEST1234!';
process.env.AWS_SECRET_ACCESS_KEY = 'TEST1234!';
process.env.ALTCHA_KEY = 'test1234!';
process.env.ALTCHA_SECRET = 'test1234!';

// Mock fetch globally
global.fetch = vi.fn()

// Setup console mocks to reduce noise in tests
global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
}