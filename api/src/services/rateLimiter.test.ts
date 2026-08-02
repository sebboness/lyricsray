import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import moment from 'moment';

vi.mock('../util/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('../config/rateLimitConfig', () => ({
    getDefaultRateLimitConfig: vi.fn(() => ({
        hourlyLimit: 10,
        dailyLimit: 100,
        globalDailyLimit: 10000,
        burstLimit: 5,
        burstWindowMinutes: 10,
    })),
}));

// APP_NAME/ENV (read at module-load time to build the DynamoDB table name) are
// set by the global src/test/setup.ts setup file, not mocked here.
import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
    let mockDbClient: any;
    let rateLimiter: RateLimiter;
    let mockSend: any;

    beforeEach(() => {
        mockSend = vi.fn();
        mockDbClient = { send: mockSend } as DynamoDBDocumentClient;
        rateLimiter = new RateLimiter(mockDbClient);
        vi.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('constructor', () => {
        it('merges custom config overrides with the defaults', async () => {
            const customRateLimiter = new RateLimiter(mockDbClient, { hourlyLimit: 2 });

            mockSend
                .mockResolvedValueOnce({ Item: null })
                .mockResolvedValueOnce({});

            const result = await customRateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            // hourlyLimit(2) - 1, daily/burst still come from the mocked defaults
            expect(result.remaining.hourly).toBe(1);
            expect(result.remaining.daily).toBe(99);
        });
    });

    describe('checkAndIncrementRateLimit', () => {
        it('allows the request and grants dynamodb:TransactWriteItems-shaped writes when within limits', async () => {
            mockSend
                .mockResolvedValueOnce({ Item: null }) // GetCommand for current record
                .mockResolvedValueOnce({}); // TransactWriteCommand succeeds

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(true);
            expect(result.remaining.hourly).toBe(9);
            expect(result.remaining.daily).toBe(99);
            expect(result.remaining.burst).toBe(4);
            expect(mockSend).toHaveBeenCalledTimes(2);

            const transactCall = mockSend.mock.calls[1][0];
            expect(transactCall).toBeInstanceOf(TransactWriteCommand);
            expect(transactCall.input.TransactItems).toHaveLength(2);
        });

        it('denies the request when the daily limit is exceeded', async () => {
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 5,
                dailyCount: 100,
                burstCount: 0,
            };

            mockSend
                .mockResolvedValueOnce({ Item: existingRecord })
                .mockRejectedValueOnce(new TransactionCanceledException({
                    message: 'Transaction cancelled',
                    $metadata: {},
                    CancellationReasons: [{ Code: 'ConditionalCheckFailed' }, { Code: 'ConditionalCheckFailed' }],
                }));

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Daily limit exceeded');
            expect(result.retryAfter).toBeDefined();
            expect(result.remaining.daily).toBe(0);
        });

        it('denies the request when the hourly limit is exceeded', async () => {
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 10,
                dailyCount: 50,
                burstCount: 0,
            };

            mockSend
                .mockResolvedValueOnce({ Item: existingRecord })
                .mockRejectedValueOnce(new TransactionCanceledException({ message: 'Transaction cancelled', $metadata: {} }));

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Hourly limit exceeded');
            expect(result.remaining.hourly).toBe(0);
            expect(result.remaining.daily).toBe(50);
        });

        it('denies the request when the global limit causes the transaction to fail', async () => {
            mockSend
                .mockResolvedValueOnce({ Item: null })
                .mockRejectedValueOnce(new TransactionCanceledException({ message: 'Transaction cancelled', $metadata: {} }));

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Service capacity exceeded');
            expect(result.retryAfter).toBeDefined();
        });

        it('denies the request when the burst limit is exceeded, without attempting a transaction', async () => {
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 3,
                dailyCount: 10,
                burstCount: 5,
                burstWindowStart: '2023-01-01T11:55:00.000Z',
            };

            mockSend.mockResolvedValueOnce({ Item: existingRecord });

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Rate limit exceeded');
            expect(result.remaining.burst).toBe(0);
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('fails open when an unexpected (non-throttling) database error occurs', async () => {
            mockSend
                .mockResolvedValueOnce({ Item: null })
                .mockRejectedValueOnce(new Error('Database connection failed'));

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeDefined();
        });

        it('resets the hourly count on a new hour while carrying the daily count forward', async () => {
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-11',
                hourlyCount: 8,
                dailyCount: 20,
                burstCount: 0,
            };

            mockSend
                .mockResolvedValueOnce({ Item: existingRecord })
                .mockResolvedValueOnce({});

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(true);
            expect(result.remaining.hourly).toBe(9);
            expect(result.remaining.daily).toBe(79);
        });

        it('never reports negative remaining counts even if usage exceeds the configured limit', async () => {
            // Simulates a race where the record was already over-limit by the time we read it,
            // but the transaction's own condition still happened to succeed (e.g. config changed).
            const existingRecord = {
                id: 'IP-192.168.1.1-2023-01-01',
                hour: '2023-01-01-12',
                hourlyCount: 999,
                dailyCount: 999,
                burstCount: 0,
            };

            mockSend
                .mockResolvedValueOnce({ Item: existingRecord })
                .mockResolvedValueOnce({});

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.remaining.hourly).toBe(0);
            expect(result.remaining.daily).toBe(0);
        });

        it('treats a hashed IP the same regardless of the raw IP format (IPv4 vs IPv6)', async () => {
            mockSend
                .mockResolvedValueOnce({ Item: null })
                .mockResolvedValueOnce({});

            const result = await rateLimiter.checkAndIncrementRateLimit('2001:db8::1');

            expect(result.allowed).toBe(true);
        });

        it('still attempts the transaction when the initial record lookup itself fails', async () => {
            // getCurrentRecord fails open (returns undefined) on GetCommand errors, so the
            // flow should still proceed to the transaction attempt as if no record existed.
            mockSend
                .mockRejectedValueOnce(new Error('describe table failed'))
                .mockResolvedValueOnce({});

            const result = await rateLimiter.checkAndIncrementRateLimit('192.168.1.1');

            expect(result.allowed).toBe(true);
            expect(mockSend).toHaveBeenCalledTimes(2);
        });
    });

    describe('getCurrentRecord', () => {
        it('returns undefined when no record exists', async () => {
            mockSend.mockResolvedValueOnce({ Item: undefined });
            const record = await rateLimiter['getCurrentRecord']('test-id');
            expect(record).toBeUndefined();
            expect(mockSend).toHaveBeenCalledWith(expect.any(GetCommand));
        });

        it('returns the record when it exists', async () => {
            const existingRecord = { id: 'test-id', dailyCount: 5 };
            mockSend.mockResolvedValueOnce({ Item: existingRecord });
            const record = await rateLimiter['getCurrentRecord']('test-id');
            expect(record).toEqual(existingRecord);
        });

        it('fails open (returns undefined) on a database error rather than throwing', async () => {
            mockSend.mockRejectedValueOnce(new Error('Database error'));
            const record = await rateLimiter['getCurrentRecord']('test-id');
            expect(record).toBeUndefined();
        });
    });

    describe('buildIpUpdateExpression', () => {
        it('sets hourlyCount directly and adds dailyCount on a new hour', () => {
            const expression = rateLimiter['buildIpUpdateExpression'](true);
            expect(expression).toContain('SET hourlyCount = :hourlyCount');
            expect(expression).toContain('ADD dailyCount :dailyInc');
        });

        it('adds both hourlyCount and dailyCount within the same hour', () => {
            const expression = rateLimiter['buildIpUpdateExpression'](false);
            expect(expression).toContain('ADD hourlyCount :dailyInc, dailyCount :dailyInc');
            expect(expression).toContain('SET #date = :date');
        });
    });

    describe('buildIpConditionExpression', () => {
        it('requires both the daily and hourly counters to be under their limits', () => {
            const condition = rateLimiter['buildIpConditionExpression']();
            expect(condition).toContain('dailyCount < :dailyLimit');
            expect(condition).toContain('hourlyCount < :hourlyLimit');
            expect(condition).toContain('AND');
        });
    });

    describe('handleTransactionError', () => {
        it('falls through to "Service capacity exceeded" when the cancelled transaction is neither at the daily nor hourly limit', () => {
            // e.g. the global counter's own condition was the one that failed.
            const result = rateLimiter['handleTransactionError'](
                new TransactionCanceledException({ message: 'cancelled', $metadata: {} }),
                'hashed-ip',
                { id: 'IP-x', hour: '2023-01-01-12', hourlyCount: 1, dailyCount: 1, burstCount: 0 },
                '2023-01-01-12',
            );
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Service capacity exceeded');
        });

        it('fails open with the full configured limits when currentRecord is undefined and a non-throttling error occurs', () => {
            const result = rateLimiter['handleTransactionError'](new Error('boom'), 'hashed-ip', undefined, '2023-01-01-12');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toEqual({ hourly: 10, daily: 100, burst: 5 });
        });
    });

    describe('calculateBurstState', () => {
        const mockNow = moment.utc('2023-01-01T12:00:00.000Z');

        it('allows a new burst window when there is no existing record', () => {
            const result = rateLimiter['calculateBurstState'](undefined, mockNow);
            expect(result.allowed).toBe(true);
            expect(result.newBurstCount).toBe(1);
            expect(result.remaining).toBe(4);
        });

        it('starts a new burst window once outside the previous window', () => {
            const oldRecord = { burstWindowStart: '2023-01-01T11:00:00.000Z', burstCount: 5 } as any;
            const result = rateLimiter['calculateBurstState'](oldRecord, mockNow);
            expect(result.allowed).toBe(true);
            expect(result.newBurstCount).toBe(1);
        });

        it('denies when the burst limit is exceeded within the window', () => {
            const record = { burstWindowStart: '2023-01-01T11:55:00.000Z', burstCount: 5 } as any;
            const result = rateLimiter['calculateBurstState'](record, mockNow);
            expect(result.allowed).toBe(false);
        });

        it('allows within the burst window and under the limit', () => {
            const record = { burstWindowStart: '2023-01-01T11:55:00.000Z', burstCount: 3 } as any;
            const result = rateLimiter['calculateBurstState'](record, mockNow);
            expect(result.allowed).toBe(true);
            expect(result.newBurstCount).toBe(4);
        });
    });

    describe('time calculation helpers', () => {
        it('calculates seconds until midnight correctly', () => {
            vi.setSystemTime(new Date('2023-01-01T23:30:00.000Z'));
            expect(rateLimiter['getSecondsUntilMidnight']()).toBe(1800);
        });

        it('calculates seconds until the next hour correctly', () => {
            vi.setSystemTime(new Date('2023-01-01T12:45:00.000Z'));
            expect(rateLimiter['getSecondsUntilNextHour']()).toBe(900);
        });
    });
});
