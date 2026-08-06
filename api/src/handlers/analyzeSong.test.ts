import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

const {
  mockVerify,
  mockGetClientIp,
  mockGetAnalysisResult,
  mockSaveAnalysisResult,
  mockCheckAndIncrementRateLimit,
  mockGetLyricsPrompt,
  mockGetTokenInputEstimate,
  mockAnalyzeLyrics,
} = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockGetClientIp: vi.fn(),
  mockGetAnalysisResult: vi.fn(),
  mockSaveAnalysisResult: vi.fn(),
  mockCheckAndIncrementRateLimit: vi.fn(),
  mockGetLyricsPrompt: vi.fn(),
  mockGetTokenInputEstimate: vi.fn(),
  mockAnalyzeLyrics: vi.fn(),
}));

vi.mock('../util/altcha', () => ({ verifyAltchaSolution: mockVerify }));
vi.mock('../util/request', () => ({ getClientIp: mockGetClientIp }));
vi.mock('../storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));
vi.mock('../storage/analysisResultStorage', () => ({
  AnalysisResultStorage: vi.fn().mockImplementation(() => ({
    getAnalysisResult: mockGetAnalysisResult,
    saveAnalysisResult: mockSaveAnalysisResult,
  })),
}));
vi.mock('../services/rateLimiter', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    checkAndIncrementRateLimit: mockCheckAndIncrementRateLimit,
  })),
}));
vi.mock('../services/aiClient', () => ({
  AiClient: vi.fn().mockImplementation(() => ({
    getLyricsPrompt: mockGetLyricsPrompt,
    getTokenInputEstimate: mockGetTokenInputEstimate,
    analyzeLyrics: mockAnalyzeLyrics,
  })),
}));

import { analyzeSongHandler } from './analyzeSong';

function makeEvent(body: object): APIGatewayProxyEvent {
  return { body: JSON.stringify(body), headers: {} } as APIGatewayProxyEvent;
}

async function callHandler(body: object) {
  const result = await analyzeSongHandler(makeEvent(body));
  return { status: result.statusCode, headers: result.headers ?? {}, body: JSON.parse(result.body) };
}

const VALID_BODY = { altchaPayload: 'valid', lyrics: 'la la la', songName: 'Song', artistName: 'Artist' };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue(true);
  mockGetClientIp.mockReturnValue('192.168.1.1');
  mockGetAnalysisResult.mockResolvedValue(null);
  mockSaveAnalysisResult.mockResolvedValue(undefined);
  mockCheckAndIncrementRateLimit.mockResolvedValue({
    allowed: true,
    remaining: { hourly: 9, daily: 99, burst: 4 },
  });
  mockGetLyricsPrompt.mockReturnValue('prompt');
  mockGetTokenInputEstimate.mockResolvedValue(50);
  mockAnalyzeLyrics.mockResolvedValue({
    appropriate: 2,
    analysis: 'Some mature themes',
    recommendedAge: '16',
    themes: ['violence'],
    tokensIn: 50,
    tokensOut: 100,
  });
});

describe('analyzeSongHandler', () => {
  describe('validation', () => {
    it('returns 400 when altchaPayload is missing', async () => {
      const { status, body } = await callHandler({ lyrics: 'la la la' });
      expect(status).toBe(400);
      expect(body.errors).toContain('Human verification failed');
      expect(mockCheckAndIncrementRateLimit).not.toHaveBeenCalled();
    });

    it('returns 400 when altcha verification fails', async () => {
      mockVerify.mockResolvedValue(false);
      const { status } = await callHandler(VALID_BODY);
      expect(status).toBe(400);
    });

    it('returns 400 when lyrics are missing', async () => {
      const { status, body } = await callHandler({ altchaPayload: 'valid' });
      expect(status).toBe(400);
      expect(body.errors).toContain('Lyrics are required');
    });

    it('returns 400 when lyrics are only tags/brackets with nothing left after cleanup', async () => {
      // cleanUpLyrics trims once up front and does not re-trim after stripping tags/brackets,
      // so any surrounding whitespace between them would survive as a truthy string — this
      // input has none, so it collapses to '' and correctly fails validation.
      const { status } = await callHandler({ altchaPayload: 'valid', lyrics: '<br/>[Chorus]' });
      expect(status).toBe(400);
    });

    it('does not treat whitespace left over between stripped tags as empty lyrics', async () => {
      // Documents the actual (pre-existing) behavior: whitespace between a stripped tag and a
      // stripped bracket survives cleanup, so this is treated as valid, non-empty lyrics.
      const { status } = await callHandler({ altchaPayload: 'valid', lyrics: '<br/>  [Chorus]', songName: 'S', artistName: 'A' });
      expect(status).toBe(200);
    });
  });

  describe('lyrics cleanup', () => {
    it('strips html tags and bracketed sections before analysis', async () => {
      await callHandler({ altchaPayload: 'valid', lyrics: '<b>Hello</b> [Verse 1] world', songName: 'S', artistName: 'A' });

      expect(mockAnalyzeLyrics).toHaveBeenCalledWith('Hello  world');
    });

    it('truncates lyrics longer than the max length before storing/analyzing', async () => {
      const longLyrics = 'a'.repeat(5000);

      await callHandler({ altchaPayload: 'valid', lyrics: longLyrics, songName: 'S', artistName: 'A' });

      const analyzedLyrics = mockAnalyzeLyrics.mock.calls[0][0];
      expect(analyzedLyrics.length).toBe(4500);

      const saved = mockSaveAnalysisResult.mock.calls[0][0];
      expect(saved.song.lyrics.length).toBe(4500);
    });
  });

  describe('cache hit', () => {
    it('returns the cached result without calling the rate limiter or AI client', async () => {
      mockGetAnalysisResult.mockResolvedValue({
        songKey: 'k1',
        appropriate: 3,
        analysis: 'cached analysis',
        recommendedAge: 18,
        themes: ['drugs'],
      });

      const { status, body } = await callHandler(VALID_BODY);

      expect(status).toBe(200);
      expect(body.data).toMatchObject({ appropriate: 3, analysis: 'cached analysis', recommendedAge: '18', themes: ['drugs'], cacheHit: true });
      expect(mockCheckAndIncrementRateLimit).not.toHaveBeenCalled();
      expect(mockAnalyzeLyrics).not.toHaveBeenCalled();
    });

    it('falls through to the normal analysis flow when the cache lookup itself throws', async () => {
      mockGetAnalysisResult.mockRejectedValue(new Error('ddb read failed'));

      const { status } = await callHandler(VALID_BODY);

      expect(status).toBe(200);
      expect(mockAnalyzeLyrics).toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('returns 429 with Retry-After and rate-limit headers when the limit is exceeded', async () => {
      mockCheckAndIncrementRateLimit.mockResolvedValue({
        allowed: false,
        reason: 'Daily limit exceeded. Please try again tomorrow.',
        retryAfter: 3600,
        remaining: { hourly: 0, daily: 0, burst: 0 },
      });

      const { status, headers, body } = await callHandler(VALID_BODY);

      expect(status).toBe(429);
      expect(headers['Retry-After']).toBe('3600');
      expect(headers['X-RateLimit-Remaining-Hourly']).toBe('0');
      expect(headers['X-RateLimit-Remaining-Daily']).toBe('0');
      expect(body.errors).toContain('Daily limit exceeded. Please try again tomorrow.');
      expect(mockAnalyzeLyrics).not.toHaveBeenCalled();
    });

    it('defaults Retry-After to 3600 when the limiter does not provide one', async () => {
      mockCheckAndIncrementRateLimit.mockResolvedValue({
        allowed: false,
        reason: 'blocked',
        remaining: { hourly: 0, daily: 0, burst: 0 },
      });

      const { headers } = await callHandler(VALID_BODY);

      expect(headers['Retry-After']).toBe('3600');
    });
  });

  describe('successful analysis', () => {
    it('returns the analysis with rate-limit headers and saves it to storage', async () => {
      const { status, headers, body } = await callHandler(VALID_BODY);

      expect(status).toBe(200);
      expect(body.data).toMatchObject({ appropriate: 2, analysis: 'Some mature themes', recommendedAge: '16', themes: ['violence'], cacheHit: false });
      expect(headers['X-RateLimit-Remaining-Hourly']).toBe('9');
      expect(headers['X-RateLimit-Remaining-Daily']).toBe('99');
      expect(mockSaveAnalysisResult).toHaveBeenCalledTimes(1);
    });

    it('coerces a stringy "appropriate" field to an integer', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: '2' as unknown as number,
        analysis: 'text',
        recommendedAge: '16',
        themes: [],
      });

      const { body } = await callHandler(VALID_BODY);

      expect(body.data.appropriate).toBe(2);
    });

    it('defaults "appropriate" to 0 when it cannot be parsed as an integer', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 'not-a-number' as unknown as number,
        analysis: 'text',
        recommendedAge: '16',
        themes: [],
      });

      const { body } = await callHandler(VALID_BODY);

      expect(body.data.appropriate).toBe(0);
    });

    it('still returns a successful response when saving the result to storage fails', async () => {
      mockSaveAnalysisResult.mockRejectedValue(new Error('ddb write failed'));

      const { status, body } = await callHandler(VALID_BODY);

      expect(status).toBe(200);
      expect(body.data.analysis).toBe('Some mature themes');
    });
  });

  describe('error handling', () => {
    it('returns 500 when the AI client throws', async () => {
      mockAnalyzeLyrics.mockRejectedValue(new Error('anthropic down'));

      const { status } = await callHandler(VALID_BODY);

      expect(status).toBe(500);
    });

    it('returns 500 when the token estimate call throws', async () => {
      mockGetTokenInputEstimate.mockRejectedValue(new Error('anthropic down'));

      const { status } = await callHandler(VALID_BODY);

      expect(status).toBe(500);
    });
  });
});
