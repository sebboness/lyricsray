import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import moment from 'moment';
import { RateLimiter } from '@/services/rateLimiter';

// Mock dependencies
vi.mock('@/logger/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/config/rateLimitConfig', () => ({
    getDefaultRateLimitConfig: vi.fn(() => ({
        hourlyLimit: 10,
        dailyLimit: 100,
        globalDailyLimit: 10000,
        burstLimit: 5,
        burstWindowMinutes: 10,
    })),
}));

// Mock environment variables
vi.mock('process', () => ({
    env: {
        APP_NAME: 'TestApp',
        ENV: 'test'
    }
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
            // Mock getting current record (no existing record)
            mockSend
                .mockResolvedValueOnce({ Item: null }) // GetCommand for current record
                .mockResolvedValueOnce({}); // TransactWriteCommand succeeds

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeDefined();
            expect(result.remaining.hourly).toBe(9); // 10 - 1
            expect(result.remaining.daily).toBe(99); // 100 - 1
            expect(result.remaining.burst).toBe(4); // 5 - 1
            expect(mockSend).toHaveBeenCalledTimes(2);
            
            // Verify transaction was called with correct structure
            const transactCall = mockSend.mock.calls[1][0];
            expect(transactCall).toBeInstanceOf(TransactWriteCommand);
            expect(transactCall.input.TransactItems).toHaveLength(2);
        });

        it('should deny request when transaction fails due to limits', async () => {
            // Mock existing record at daily limit
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 5,
                dailyCount: 100, // At limit
                burstCount: 0,
            };

            mockSend
                .mockResolvedValueOnce({ Item: existingRecord }) // GetCommand
                .mockRejectedValueOnce(new TransactionCanceledException({
                    message: 'Transaction cancelled',
                    $metadata: {},
                    CancellationReasons: [
                        { Code: 'ConditionalCheckFailed' },
                        { Code: 'ConditionalCheckFailed' }
                    ]
                })); // TransactWriteCommand fails

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Daily limit exceeded');
            expect(result.retryAfter).toBeDefined();
            expect(result.remaining.daily).toBe(0);
        });

        it('should deny request when hourly limit exceeded', async () => {
            // Mock existing record at hourly limit but not daily limit
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 10, // At hourly limit
                dailyCount: 50,
                burstCount: 0,
            };

            mockSend
                .mockResolvedValueOnce({ Item: existingRecord }) // GetCommand
                .mockRejectedValueOnce(new TransactionCanceledException({
                    message: 'Transaction cancelled',
                    $metadata: {},
                })); // TransactWriteCommand fails

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Hourly limit exceeded');
            expect(result.remaining.hourly).toBe(0);
            expect(result.remaining.daily).toBe(50); // Still has daily remaining
        });

        it('should deny request when global limit causes transaction failure', async () => {
            // Mock no existing record (new user)
            mockSend
                .mockResolvedValueOnce({ Item: null }) // GetCommand
                .mockRejectedValueOnce(new TransactionCanceledException({
                    message: 'Transaction cancelled',
                    $metadata: {},
                })); // TransactWriteCommand fails (likely global limit)

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Service capacity exceeded');
            expect(result.retryAfter).toBeDefined();
        });

        it('should deny request when burst limit exceeded', async () => {
            // Mock existing record with burst at limit
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 3,
                dailyCount: 10,
                burstCount: 5, // At burst limit
                burstWindowStart: '2023-01-01T11:55:00.000Z', // 5 minutes ago
            };

            mockSend.mockResolvedValueOnce({ Item: existingRecord }); // GetCommand

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Rate limit exceeded');
            expect(result.retryAfter).toBeDefined();
            expect(result.remaining.burst).toBe(0);
            // Should not attempt transaction since burst check fails first
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should fail open when unexpected database error occurs', async () => {
            mockSend
                .mockResolvedValueOnce({ Item: null }) // GetCommand succeeds
                .mockRejectedValueOnce(new Error('Database connection failed')); // Unexpected error

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(true); // Fail open
            expect(result.remaining).toBeDefined();
        });

        it('should handle new hour correctly in transaction', async () => {
            // Mock existing record from previous hour
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-11', // Previous hour
                hourlyCount: 8,
                dailyCount: 20,
                burstCount: 0,
            };

            mockSend
                .mockResolvedValueOnce({ Item: existingRecord }) // GetCommand
                .mockResolvedValueOnce({}); // TransactWriteCommand succeeds

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');
            
            expect(result.allowed).toBe(true);
            expect(result.remaining.hourly).toBe(9); // New hour, so 10 - 1
            expect(result.remaining.daily).toBe(79); // 100 - 20 - 1
        });
    });

    describe('getCurrentRecord', () => {
        it('should return undefined when record does not exist', async () => {
            mockSend.mockResolvedValueOnce({ Item: null });
            
            const record = await rateLimiter['getCurrentRecord']('test-id');
            
            expect(record).toBeNull();
            expect(mockSend).toHaveBeenCalledWith(expect.any(GetCommand));
        });

        it('should return record when it exists', async () => {
            const existingRecord = { id: 'test-id', dailyCount: 5 };
            mockSend.mockResolvedValueOnce({ Item: existingRecord });
            
            const record = await rateLimiter['getCurrentRecord']('test-id');
            
            expect(record).toEqual(existingRecord);
        });

        it('should return undefined on database error', async () => {
            mockSend.mockRejectedValueOnce(new Error('Database error'));
            
            const record = await rateLimiter['getCurrentRecord']('test-id');
            
            expect(record).toBeUndefined();
        });
    });

    describe('buildIpUpdateExpression', () => {
        it('should return correct expression for new hour', () => {
            const expression = rateLimiter['buildIpUpdateExpression'](true);
            expect(expression).toContain('SET hourlyCount = :hourlyCount');
            expect(expression).toContain('ADD dailyCount :dailyInc');
        });

        it('should return correct expression for same hour', () => {
            const expression = rateLimiter['buildIpUpdateExpression'](false);
            expect(expression).toContain('ADD hourlyCount :dailyInc, dailyCount :dailyInc');
            expect(expression).toContain('SET #date = :date');
        });
    });

    describe('buildIpConditionExpression', () => {
        it('should return condition with daily and hourly limits', () => {
            const condition = rateLimiter['buildIpConditionExpression']();
            expect(condition).toContain('dailyCount < :dailyLimit');
            expect(condition).toContain('hourlyCount <= :hourlyLimit');
            expect(condition).toContain('AND');
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