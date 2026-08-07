import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

const { mockGetAnalysisResult, mockLoggerWarn } = vi.hoisted(() => ({
  mockGetAnalysisResult: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock('../storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));
vi.mock('../storage/analysisResultStorage', () => ({
  AnalysisResultStorage: vi.fn().mockImplementation(() => ({
    getAnalysisResult: mockGetAnalysisResult,
  })),
}));
vi.mock('../util/logger', () => ({
  logger: { error: vi.fn(), warn: mockLoggerWarn, info: vi.fn() },
}));

import { getAnalysisHandler } from './getAnalysis';

function makeEvent(queryStringParameters: Record<string, string> | null): APIGatewayProxyEvent {
  return { queryStringParameters, headers: {} } as unknown as APIGatewayProxyEvent;
}

async function call(queryStringParameters: Record<string, string> | null) {
  const result = await getAnalysisHandler(makeEvent(queryStringParameters));
  return { status: result.statusCode, body: JSON.parse(result.body) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAnalysisHandler', () => {
  it('returns 400 when the songKey query param is missing', async () => {
    const { status, body } = await call(null);

    expect(status).toBe(400);
    expect(body.errors).toContain('songKey parameter is required');
    expect(mockGetAnalysisResult).not.toHaveBeenCalled();
  });

  it('returns 400 when queryStringParameters is present but songKey is absent', async () => {
    const { status } = await call({});

    expect(status).toBe(400);
  });

  it('returns 404 when no analysis result is found for the songKey', async () => {
    mockGetAnalysisResult.mockResolvedValue(null);

    const { status, body } = await call({ songKey: 'Guster/Terrified/abc123' });

    expect(status).toBe(404);
    expect(body.errors).toContain('Analysis result not found');
  });

  it('logs a warning with the songKey when no analysis result is found', async () => {
    mockGetAnalysisResult.mockResolvedValue(null);

    await call({ songKey: 'Guster/Terrified/abc123' });

    expect(mockLoggerWarn).toHaveBeenCalledWith('analysis result not found', { songKey: 'Guster/Terrified/abc123' });
  });

  it('returns the stored result, using the songKey exactly as received (slashes and all)', async () => {
    const storedResult = { songKey: 'Guster/Terrified/abc123', song: { songName: 'Terrified', artistName: 'Guster' } };
    mockGetAnalysisResult.mockResolvedValue(storedResult);

    const { status, body } = await call({ songKey: 'Guster/Terrified/abc123' });

    expect(status).toBe(200);
    expect(body.data.result).toEqual(storedResult);
    expect(mockGetAnalysisResult).toHaveBeenCalledWith('Guster/Terrified/abc123');
  });

  // Regression coverage: legacy pre-migration keys contain "|" and "#" — this
  // handler must treat songKey as an opaque string and not choke on either.
  it('looks up a legacy pipe/hash-format songKey unchanged', async () => {
    const storedResult = { songKey: 'Guster|Terrified#b447180cf8ad8150', song: { songName: 'Terrified', artistName: 'Guster' } };
    mockGetAnalysisResult.mockResolvedValue(storedResult);

    const { status, body } = await call({ songKey: 'Guster|Terrified#b447180cf8ad8150' });

    expect(status).toBe(200);
    expect(body.data.result).toEqual(storedResult);
    expect(mockGetAnalysisResult).toHaveBeenCalledWith('Guster|Terrified#b447180cf8ad8150');
  });
});
