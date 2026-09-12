import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

const { mockGetRecentAnalysesPage } = vi.hoisted(() => ({
  mockGetRecentAnalysesPage: vi.fn(),
}));

vi.mock('../storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));
vi.mock('../storage/analysisResultStorage', () => ({
  AnalysisResultStorage: vi.fn().mockImplementation(() => ({
    getRecentAnalysesPage: mockGetRecentAnalysesPage,
  })),
}));

import { recentSearchesHandler } from './recentSearches';

function makeEvent(queryStringParameters: Record<string, string> | null): APIGatewayProxyEvent {
  return { queryStringParameters, headers: {} } as unknown as APIGatewayProxyEvent;
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    songKey: 'artist/song/abc123',
    date: '2026-07-20T00:00:00.000Z',
    song: { songName: 'Song', artistName: 'Artist' },
    recommendedAge: 13,
    themes: ['romance'],
    appropriate: 1,
    entityType: 'ANALYSIS',
    ...overrides,
  };
}

async function call(queryStringParameters: Record<string, string> | null = null) {
  const result = await recentSearchesHandler(makeEvent(queryStringParameters));
  return { status: result.statusCode, body: JSON.parse(result.body) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recentSearchesHandler', () => {
  it('defaults to a limit of 50 and no cursor', async () => {
    mockGetRecentAnalysesPage.mockResolvedValue({ items: [], lastEvaluatedKey: undefined });

    await call();

    expect(mockGetRecentAnalysesPage).toHaveBeenCalledWith(100, 'ANALYSIS', undefined, undefined);
  });

  it('excludes analyses submitted via raw lyrics (no song/artist name)', async () => {
    mockGetRecentAnalysesPage.mockResolvedValue({
      items: [makeItem({ songKey: 'lyrics-only', song: { songName: undefined, artistName: undefined } }), makeItem()],
      lastEvaluatedKey: undefined,
    });

    const { body } = await call();

    expect(body.data.songs).toHaveLength(1);
    expect(body.data.songs[0].songKey).toBe('artist/song/abc123');
  });

  it('has no nextCursor when fewer than the limit are found', async () => {
    mockGetRecentAnalysesPage.mockResolvedValue({ items: [makeItem()], lastEvaluatedKey: undefined });

    const { body } = await call({ limit: '10' });

    expect(body.data.songs).toHaveLength(1);
    expect(body.data.nextCursor).toBeUndefined();
  });

  it('returns a nextCursor and trims to the limit when more results exist', async () => {
    const items = Array.from({ length: 3 }, (_, i) => makeItem({ songKey: `key-${i}`, date: `2026-07-${20 - i}` }));
    mockGetRecentAnalysesPage.mockResolvedValue({ items, lastEvaluatedKey: undefined });

    const { body } = await call({ limit: '2' });

    expect(body.data.songs).toHaveLength(2);
    expect(body.data.songs.map((s: { songKey: string }) => s.songKey)).toEqual(['key-0', 'key-1']);
    expect(body.data.nextCursor).toBeDefined();
  });

  it('fetches subsequent DynamoDB pages when a raw page has too few valid items', async () => {
    mockGetRecentAnalysesPage
      .mockResolvedValueOnce({
        items: [makeItem({ songKey: 'invalid', song: { songName: undefined, artistName: undefined } })],
        lastEvaluatedKey: { songKey: 'invalid' },
      })
      .mockResolvedValueOnce({ items: [makeItem({ songKey: 'valid' })], lastEvaluatedKey: undefined });

    const { body } = await call({ limit: '1' });

    expect(mockGetRecentAnalysesPage).toHaveBeenCalledTimes(2);
    expect(mockGetRecentAnalysesPage).toHaveBeenNthCalledWith(2, 100, 'ANALYSIS', { songKey: 'invalid' }, undefined);
    expect(body.data.songs).toHaveLength(1);
    expect(body.data.songs[0].songKey).toBe('valid');
  });

  it('decodes the cursor query param into the exclusiveStartKey', async () => {
    mockGetRecentAnalysesPage.mockResolvedValue({ items: [], lastEvaluatedKey: undefined });
    const cursor = Buffer.from(JSON.stringify({ entityType: 'ANALYSIS', date: '2026-07-01', songKey: 'k' })).toString('base64url');

    await call({ cursor });

    expect(mockGetRecentAnalysesPage).toHaveBeenCalledWith(100, 'ANALYSIS', {
      entityType: 'ANALYSIS',
      date: '2026-07-01',
      songKey: 'k',
    }, undefined);
  });

  it('ignores a malformed cursor and starts from the beginning', async () => {
    mockGetRecentAnalysesPage.mockResolvedValue({ items: [], lastEvaluatedKey: undefined });

    await call({ cursor: 'not-valid-base64url-json' });

    expect(mockGetRecentAnalysesPage).toHaveBeenCalledWith(100, 'ANALYSIS', undefined, undefined);
  });

  it('passes a valid appropriate query param through to storage', async () => {
    mockGetRecentAnalysesPage.mockResolvedValue({ items: [], lastEvaluatedKey: undefined });

    await call({ appropriate: '2' });

    expect(mockGetRecentAnalysesPage).toHaveBeenCalledWith(100, 'ANALYSIS', undefined, 2);
  });

  it('ignores an invalid appropriate query param', async () => {
    mockGetRecentAnalysesPage.mockResolvedValue({ items: [], lastEvaluatedKey: undefined });

    await call({ appropriate: '7' });

    expect(mockGetRecentAnalysesPage).toHaveBeenCalledWith(100, 'ANALYSIS', undefined, undefined);
  });

  it('returns 500 when the DynamoDB call fails', async () => {
    mockGetRecentAnalysesPage.mockRejectedValue(new Error('ddb down'));

    const { status } = await call();

    expect(status).toBe(500);
  });
});
