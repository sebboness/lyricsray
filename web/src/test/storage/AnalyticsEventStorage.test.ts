import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { AnalyticsEventStorage } from '@/storage/AnalyticsEventStorage';

vi.mock('@/logger/logger', () => ({
    logger: { error: vi.fn(), info: vi.fn() },
}));

const baseParams = {
    date: '2026-08-06',
    timestamp: '2026-08-06T12:00:00.000Z',
    hashedIp: 'abc123def456abc123def456',
    uaType: 'person' as const,
    browser: 'Chrome',
    os: 'Windows',
    songKey: 'Artist/Song/hash123',
    artistName: 'Artist',
    songName: 'Song',
};

describe('AnalyticsEventStorage', () => {
    let mockSend: ReturnType<typeof vi.fn>;
    let storage: AnalyticsEventStorage;

    beforeEach(() => {
        mockSend = vi.fn().mockResolvedValue({});
        storage = new AnalyticsEventStorage({ send: mockSend } as any);
    });

    describe('writeAnalysisEvent', () => {
        it('sends a PutCommand with eventType analysis and correct fields', async () => {
            await storage.writeAnalysisEvent({ ...baseParams, cacheHit: true });

            expect(mockSend).toHaveBeenCalledTimes(1);
            const cmd = mockSend.mock.calls[0][0];
            expect(cmd).toBeInstanceOf(PutCommand);
            expect(cmd.input.Item).toMatchObject({
                eventType: 'analysis',
                cacheHit: true,
                songKey: baseParams.songKey,
                hashedIp: baseParams.hashedIp,
            });
        });

        it('includes a ttl and a generated eventId', async () => {
            await storage.writeAnalysisEvent({ ...baseParams, cacheHit: false });

            const item = mockSend.mock.calls[0][0].input.Item;
            expect(item.ttl).toBeTypeOf('number');
            expect(item.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
            expect(item.eventId).toBeTypeOf('string');
            expect(item.eventId).toHaveLength(36); // UUID
        });

        it('does not throw when the DynamoDB call fails', async () => {
            mockSend.mockRejectedValue(new Error('ddb down'));

            await expect(storage.writeAnalysisEvent({ ...baseParams, cacheHit: false })).resolves.not.toThrow();
        });
    });

    describe('writePageViewEvent', () => {
        it('sends a PutCommand with eventType pageView', async () => {
            await storage.writePageViewEvent(baseParams);

            const cmd = mockSend.mock.calls[0][0];
            expect(cmd).toBeInstanceOf(PutCommand);
            expect(cmd.input.Item.eventType).toBe('pageView');
        });

        it('does not throw when the DynamoDB call fails', async () => {
            mockSend.mockRejectedValue(new Error('ddb down'));

            await expect(storage.writePageViewEvent(baseParams)).resolves.not.toThrow();
        });
    });
});
