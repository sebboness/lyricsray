import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCommand, PutCommand, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { AnalysisResultStorage, AnalysisResult } from './analysisResultStorage';

vi.mock('../util/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    songKey: 'artist/song/abc123',
    date: '2026-07-20T00:00:00.000Z',
    song: { songName: 'Song', artistName: 'Artist' },
    recommendedAge: 13,
    themes: ['romance'],
    analysis: 'Some analysis',
    appropriate: 1,
    entityType: 'ANALYSIS',
    summary: 'Romantic themes',
    themePercentages: [{ theme: 'romance', percentage: 55 }],
    ...overrides,
  };
}

describe('AnalysisResultStorage', () => {
  let mockSend: any;
  let storage: AnalysisResultStorage;

  beforeEach(() => {
    mockSend = vi.fn();
    storage = new AnalysisResultStorage({ send: mockSend } as any);
  });

  describe('getAnalysisResult', () => {
    it('returns the item when found', async () => {
      const item = makeResult();
      mockSend.mockResolvedValueOnce({ Item: item });

      const result = await storage.getAnalysisResult('artist/song/abc123');

      expect(result).toEqual(item);
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(GetCommand);
    });

    it('returns null when not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await storage.getAnalysisResult('missing-key');

      expect(result).toBeNull();
    });

    it('rethrows when the DynamoDB call fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('ddb down'));

      await expect(storage.getAnalysisResult('key')).rejects.toThrow('ddb down');
    });
  });

  describe('saveAnalysisResult', () => {
    it('saves and returns the given result', async () => {
      const item = makeResult();
      mockSend.mockResolvedValueOnce({});

      const result = await storage.saveAnalysisResult(item);

      expect(result).toEqual(item);
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(PutCommand);
    });

    it('rethrows when the DynamoDB call fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('ddb down'));

      await expect(storage.saveAnalysisResult(makeResult())).rejects.toThrow('ddb down');
    });
  });

  describe('getRecentAnalyses', () => {
    it('defaults to a limit of 5 and entityType ANALYSIS', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      await storage.getRecentAnalyses();

      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(QueryCommand);
      expect(command.input.Limit).toBe(5);
      expect(command.input.ExpressionAttributeValues[':entityType']).toBe('ANALYSIS');
    });

    it('queries by the given entityType and limit', async () => {
      mockSend.mockResolvedValueOnce({ Items: [makeResult({ entityType: 'POPULAR' })] });

      const results = await storage.getRecentAnalyses(20, 'POPULAR');

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Limit).toBe(20);
      expect(command.input.ExpressionAttributeValues[':entityType']).toBe('POPULAR');
      expect(results).toHaveLength(1);
    });

    it('returns an empty array when Items is undefined', async () => {
      mockSend.mockResolvedValueOnce({});

      const results = await storage.getRecentAnalyses();

      expect(results).toEqual([]);
    });

    it('rethrows when the DynamoDB call fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('ddb down'));

      await expect(storage.getRecentAnalyses()).rejects.toThrow('ddb down');
    });
  });

  describe('getRecentAnalysesPage', () => {
    it('queries by the given entityType, limit, and exclusiveStartKey', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      await storage.getRecentAnalysesPage(20, 'ANALYSIS', { entityType: 'ANALYSIS', date: '2026-07-20' });

      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(QueryCommand);
      expect(command.input.Limit).toBe(20);
      expect(command.input.ExpressionAttributeValues[':entityType']).toBe('ANALYSIS');
      expect(command.input.ExclusiveStartKey).toEqual({ entityType: 'ANALYSIS', date: '2026-07-20' });
    });

    it('returns the items and lastEvaluatedKey from the response', async () => {
      const item = makeResult();
      mockSend.mockResolvedValueOnce({ Items: [item], LastEvaluatedKey: { songKey: 'artist/song/abc123' } });

      const page = await storage.getRecentAnalysesPage(20, 'ANALYSIS');

      expect(page.items).toEqual([item]);
      expect(page.lastEvaluatedKey).toEqual({ songKey: 'artist/song/abc123' });
    });

    it('returns an empty items array and no lastEvaluatedKey when nothing more is found', async () => {
      mockSend.mockResolvedValueOnce({});

      const page = await storage.getRecentAnalysesPage(20, 'ANALYSIS');

      expect(page.items).toEqual([]);
      expect(page.lastEvaluatedKey).toBeUndefined();
    });

    it('rethrows when the DynamoDB call fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('ddb down'));

      await expect(storage.getRecentAnalysesPage(20, 'ANALYSIS')).rejects.toThrow('ddb down');
    });

    it('applies a FilterExpression on appropriate when given', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      await storage.getRecentAnalysesPage(20, 'ANALYSIS', undefined, 2);

      const command = mockSend.mock.calls[0][0];
      expect(command.input.FilterExpression).toBe('appropriate = :appropriate');
      expect(command.input.ExpressionAttributeValues[':appropriate']).toBe(2);
    });

    it('omits the FilterExpression when appropriate is not given', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      await storage.getRecentAnalysesPage(20, 'ANALYSIS');

      const command = mockSend.mock.calls[0][0];
      expect(command.input.FilterExpression).toBeUndefined();
      expect(command.input.ExpressionAttributeValues[':appropriate']).toBeUndefined();
    });
  });

  describe('getBatchAnalysisResults', () => {
    it('returns an empty array without calling DynamoDB when songKeys is empty', async () => {
      const results = await storage.getBatchAnalysisResults([]);

      expect(results).toEqual([]);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('truncates to 100 keys when more are requested', async () => {
      const keys = Array.from({ length: 150 }, (_, i) => `key-${i}`);
      mockSend.mockResolvedValueOnce({ Responses: {} });

      await storage.getBatchAnalysisResults(keys);

      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(BatchGetCommand);
      const tableName = Object.keys(command.input.RequestItems)[0];
      expect(command.input.RequestItems[tableName].Keys).toHaveLength(100);
    });

    it('returns the responses for the requested table', async () => {
      mockSend.mockImplementationOnce((command: BatchGetCommand) => {
        const tableName = Object.keys(command.input.RequestItems!)[0];
        return Promise.resolve({ Responses: { [tableName]: [makeResult()] } });
      });

      const results = await storage.getBatchAnalysisResults(['key-1']);

      expect(results).toHaveLength(1);
    });

    it('returns an empty array when no Responses are returned', async () => {
      mockSend.mockResolvedValueOnce({});

      const results = await storage.getBatchAnalysisResults(['key-1']);

      expect(results).toEqual([]);
    });

    it('logs but does not throw when there are unprocessed keys', async () => {
      mockSend.mockImplementationOnce((command: BatchGetCommand) => {
        const tableName = Object.keys(command.input.RequestItems!)[0];
        return Promise.resolve({
          Responses: { [tableName]: [] },
          UnprocessedKeys: { [tableName]: { Keys: [{ songKey: 'key-1' }] } },
        });
      });

      const results = await storage.getBatchAnalysisResults(['key-1']);

      expect(results).toEqual([]);
    });

    it('rethrows when the DynamoDB call fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('ddb down'));

      await expect(storage.getBatchAnalysisResults(['key-1'])).rejects.toThrow('ddb down');
    });
  });
});
