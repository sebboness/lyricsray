import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import moment from 'moment';
import { RateLimiter } from '@/services/rateLimiter';

// Mock dependencies
vi.mock('@/logger/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('@/config/rateLimitConfig', () => ({
    getRateLimitConfigForUser: vi.fn(() => ({
        hourlyLimit: 10,
        dailyLimit: 100,
        globalDailyLimit: 10000,
        burstLimit: 5,
        burstWindowMinutes: 10,
    })),
}));

describe('RateLimiter', () => {
    let mockDbClient: any;
    let rateLimiter: RateLimiter;
    let mockSend: any;
    
    beforeEach(() => {
        mockSend = vi.fn();
        mockDbClient = {
        send: mockSend,
        } as DynamoDBDocumentClient;
        rateLimiter = new RateLimiter(mockDbClient);
        
        // Mock moment to return consistent time
        vi.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('Constructor', () => {
        it('should initialize with default config', () => {
            expect(rateLimiter).toBeInstanceOf(RateLimiter);
        });

        it('should merge custom config with defaults', () => {
            const customConfig = { hourlyLimit: 20 };
            const customRateLimiter = new RateLimiter(mockDbClient, customConfig);
            expect(customRateLimiter).toBeInstanceOf(RateLimiter);
        });
    });

    describe('checkAndIncrementRateLimit', () => {
        it('should allow request when all limits are within bounds', async () => {
            // Mock successful global update
            mockSend
                .mockResolvedValueOnce({}) // Global update
                .mockResolvedValueOnce({ Item: null }) // IP record get
                .mockResolvedValueOnce({}); // IP update
            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeDefined();
            expect(mockSend).toHaveBeenCalledTimes(3);
        });

        it('should deny request when global daily limit exceeded', async () => {
            // Mock global limit exceeded
            mockSend.mockRejectedValueOnce(new ConditionalCheckFailedException({
                message: 'Condition failed',
                $metadata: {}
            }));
            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Global daily limit exceeded');
            expect(result.retryAfter).toBeDefined();
        });

        it('should fail open when database error occurs', async () => {
            mockSend.mockRejectedValueOnce(new Error('Database connection failed'));
            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            expect(result.allowed).toBe(true);
        });
    });

    describe('checkAndIncrementGlobal', () => {
        it('should allow request within global limit', async () => {
            mockSend.mockResolvedValueOnce({});
            const result = await rateLimiter['checkAndIncrementGlobal']('2023-01-01');
            expect(result.allowed).toBe(true);
            expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateCommand));
        });

        it('should deny request when global limit exceeded', async () => {
            mockSend.mockRejectedValueOnce(new ConditionalCheckFailedException({
                message: 'Condition failed',
                $metadata: {}
            }));
            const result = await rateLimiter['checkAndIncrementGlobal']('2023-01-01');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Global daily limit exceeded');
        });
    });

    describe('checkAndIncrementIp', () => {
        const mockNow = moment.utc('2023-01-01T12:00:00.000Z');
        
        it('should allow new IP with no existing record', async () => {
            mockSend
                .mockResolvedValueOnce({ Item: null }) // GET
                .mockResolvedValueOnce({}); // UPDATE
            const result = await rateLimiter['checkAndIncrementIp']('192.168.1.1', '2023-01-01', '2023-01-01-12', mockNow);
            expect(result.allowed).toBe(true);
        });

        it('should deny when daily limit exceeded', async () => {
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 5,
                dailyCount: 100, // At limit
                burstCount: 0,
            };
            mockSend
                .mockResolvedValueOnce({ Item: existingRecord }) // GET
                .mockRejectedValueOnce(new ConditionalCheckFailedException({
                message: 'Condition failed',
                $metadata: {}
                })); // UPDATE fails
            const result = await rateLimiter['checkAndIncrementIp']('192.168.1.1', '2023-01-01', '2023-01-01-12', mockNow);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Daily limit exceeded');
        });

        it('should deny when hourly limit exceeded', async () => {
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 10, // At limit
                dailyCount: 50,
                burstCount: 0,
            };
            mockSend
                .mockResolvedValueOnce({ Item: existingRecord }) // GET
                .mockRejectedValueOnce(new ConditionalCheckFailedException({
                message: 'Condition failed',
                $metadata: {}
                })); // UPDATE fails

            const result = await rateLimiter['checkAndIncrementIp']('192.168.1.1', '2023-01-01', '2023-01-01-12', mockNow);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Hourly limit exceeded');
        });
    });

    describe('calculateBurstState', () => {
        const mockNow = moment.utc('2023-01-01T12:00:00.000Z');

        it('should allow new burst window when no existing record', () => {
            const result = rateLimiter['calculateBurstState'](undefined, mockNow);
            expect(result.allowed).toBe(true);
            expect(result.newBurstCount).toBe(1);
            expect(result.remaining).toBe(4); // burstLimit - 1
        });

        it('should start new burst window when outside time window', () => {
            const oldRecord = {
                burstWindowStart: '2023-01-01T11:00:00.000Z', // 1 hour ago
                burstCount: 5,
            } as any;
            const result = rateLimiter['calculateBurstState'](oldRecord, mockNow);
            expect(result.allowed).toBe(true);
            expect(result.newBurstCount).toBe(1);
            expect(result.burstWindowStart).toBe(mockNow.toISOString());
        });

        it('should deny when burst limit exceeded within window', () => {
            const record = {
                burstWindowStart: '2023-01-01T11:55:00.000Z', // 5 minutes ago
                burstCount: 5, // At limit
            } as any;
            const result = rateLimiter['calculateBurstState'](record, mockNow);
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Rate limit exceeded');
            expect(result.retryAfter).toBeDefined();
        });

        it('should allow within burst window and under limit', () => {
            const record = {
                burstWindowStart: '2023-01-01T11:55:00.000Z', // 5 minutes ago
                burstCount: 3, // Under limit
            } as any;
            const result = rateLimiter['calculateBurstState'](record, mockNow);
            expect(result.allowed).toBe(true);
            expect(result.newBurstCount).toBe(4);
            expect(result.remaining).toBe(1);
        });
    });

    describe('getCurrentUsage', () => {
        it('should return zero usage for non-existent record', async () => {
            mockSend.mockResolvedValueOnce({ Item: null });
            const usage = await rateLimiter.getCurrentUsage('192.168.1.1');
            expect(usage).toEqual({ hourly: 0, daily: 0, burst: 0 });
        });

        it('should return current usage from existing record', async () => {
            const record = {
                hour: '2023-01-01-12',
                hourlyCount: 5,
                dailyCount: 25,
                burstWindowStart: '2023-01-01T11:55:00.000Z',
                burstCount: 3,
            };
            mockSend.mockResolvedValueOnce({ Item: record });
            const usage = await rateLimiter.getCurrentUsage('192.168.1.1');
            expect(usage.hourly).toBe(5);
            expect(usage.daily).toBe(25);
            expect(usage.burst).toBe(3);
        });

        it('should return zero burst usage when outside window', async () => {
            const record = {
                hour: '2023-01-01-12',
                hourlyCount: 5,
                dailyCount: 25,
                burstWindowStart: '2023-01-01T11:00:00.000Z', // 1 hour ago
                burstCount: 3,
            };
            mockSend.mockResolvedValueOnce({ Item: record });
            const usage = await rateLimiter.getCurrentUsage('192.168.1.1');
            expect(usage.burst).toBe(0);
        });

        it('should handle database errors gracefully', async () => {
            mockSend.mockRejectedValueOnce(new Error('Database error'));
            const usage = await rateLimiter.getCurrentUsage('192.168.1.1');
            expect(usage).toEqual({ hourly: 0, daily: 0, burst: 0 });
        });
    });

    describe('Time calculation helpers', () => {
        it('should calculate seconds until midnight correctly', () => {
            vi.setSystemTime(new Date('2023-01-01T23:30:00.000Z'));
            const seconds = rateLimiter['getSecondsUntilMidnight']();
            expect(seconds).toBe(1800); // 30 minutes
        });

        it('should calculate seconds until next hour correctly', () => {
            vi.setSystemTime(new Date('2023-01-01T12:45:00.000Z'));
            const seconds = rateLimiter['getSecondsUntilNextHour']();
            expect(seconds).toBe(900); // 15 minutes
        });
    });
});