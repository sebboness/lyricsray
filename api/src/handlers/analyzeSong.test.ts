import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

const {
  mockVerify,
  mockGetClientIp,
  mockGetAnalysisResult,
  mockGetAnalysesByArtist,
  mockSaveAnalysisResult,
  mockCheckAndIncrementRateLimit,
  mockBotCheckAndIncrementRateLimit,
  mockGetLyricsPrompt,
  mockGetTokenInputEstimate,
  mockAnalyzeLyrics,
} = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockGetClientIp: vi.fn(),
  mockGetAnalysisResult: vi.fn(),
  mockGetAnalysesByArtist: vi.fn(),
  mockSaveAnalysisResult: vi.fn(),
  mockCheckAndIncrementRateLimit: vi.fn(),
  mockBotCheckAndIncrementRateLimit: vi.fn(),
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
    getAnalysesByArtist: mockGetAnalysesByArtist,
    saveAnalysisResult: mockSaveAnalysisResult,
  })),
}));
vi.mock('../services/rateLimiter', () => ({
  // First constructor call → person limiter; second → bot limiter (matches module-level ordering).
  RateLimiter: vi.fn()
    .mockImplementationOnce(() => ({ checkAndIncrementRateLimit: mockCheckAndIncrementRateLimit }))
    .mockImplementation(() => ({ checkAndIncrementRateLimit: mockBotCheckAndIncrementRateLimit })),
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
  mockBotCheckAndIncrementRateLimit.mockResolvedValue({
    allowed: true,
    remaining: { hourly: 1, daily: 1, burst: 1 },
  });
  mockGetAnalysesByArtist.mockResolvedValue([]);
  mockGetLyricsPrompt.mockReturnValue('prompt');
  mockGetTokenInputEstimate.mockResolvedValue(50);
  mockAnalyzeLyrics.mockResolvedValue({
    appropriate: 2,
    analysis: 'Some mature themes',
    recommendedAge: '16',
    themes: ['violence'],
    summary: 'Violence, mild language',
    themePercentages: [{ theme: 'violence', percentage: 60 }],
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
        summary: 'Drug references',
        themePercentages: [{ theme: 'drugs', percentage: 40 }],
      });

      const { status, body } = await callHandler(VALID_BODY);

      expect(status).toBe(200);
      expect(body.data).toMatchObject({
        appropriate: 3,
        analysis: 'cached analysis',
        recommendedAge: '18',
        themes: ['drugs'],
        summary: 'Drug references',
        themePercentages: [{ theme: 'drugs', percentage: 40 }],
        cacheHit: true,
      });
      expect(mockCheckAndIncrementRateLimit).not.toHaveBeenCalled();
      expect(mockAnalyzeLyrics).not.toHaveBeenCalled();
    });

    it('defaults summary and themePercentages when a legacy cached result lacks them', async () => {
      mockGetAnalysisResult.mockResolvedValue({
        songKey: 'k1',
        appropriate: 3,
        analysis: 'cached analysis',
        recommendedAge: 18,
        themes: ['drugs'],
      });

      const { body } = await callHandler(VALID_BODY);

      expect(body.data.summary).toBe('');
      expect(body.data.themePercentages).toEqual([]);
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
      expect(body.data).toMatchObject({
        appropriate: 2,
        analysis: 'Some mature themes',
        recommendedAge: '16',
        themes: ['violence'],
        summary: 'Violence, mild language',
        themePercentages: [{ theme: 'violence', percentage: 60 }],
        cacheHit: false,
      });
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

  describe('AI-inferred artist/song names', () => {
    it('uses AI-inferred names when the request omits artistName and songName', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 2, analysis: 'Some mature themes', recommendedAge: '16', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: 'Taylor Swift', songName: 'Shake It Off',
      });

      await callHandler({ altchaPayload: 'valid', lyrics: 'la la la' });

      const saved = mockSaveAnalysisResult.mock.calls[0][0];
      expect(saved.song.artistName).toBe('Taylor Swift');
      expect(saved.song.songName).toBe('Shake It Off');
    });

    it('regenerates songKey using AI-inferred names so the saved record is addressable by artist/song', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 2, analysis: 'Some mature themes', recommendedAge: '16', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: 'Taylor Swift', songName: 'Shake It Off',
      });

      const { body } = await callHandler({ altchaPayload: 'valid', lyrics: 'la la la' });

      const saved = mockSaveAnalysisResult.mock.calls[0][0];
      expect(saved.songKey).toContain('Taylor-Swift');
      expect(saved.songKey).toContain('Shake-It-Off');
      expect(body.data.songKey).toBe(saved.songKey);
    });

    it('does not regenerate songKey when request already provided names', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 2, analysis: 'Some mature themes', recommendedAge: '16', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: 'AI Guessed Artist', songName: 'AI Guessed Song',
      });

      await callHandler({ altchaPayload: 'valid', lyrics: 'la la la', artistName: 'Real Artist', songName: 'Real Song' });

      const saved = mockSaveAnalysisResult.mock.calls[0][0];
      expect(saved.song.artistName).toBe('Real Artist');
      expect(saved.song.songName).toBe('Real Song');
      expect(saved.songKey).toContain('Real-Artist');
      expect(saved.songKey).not.toContain('AI-Guessed');
    });

    it('returns existing result as cache hit when lyrics-only and artist+song prefix matches an existing record', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 1, analysis: 'Clean', recommendedAge: 'All', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: 'Taylor Swift', songName: 'Shake It Off',
      });
      mockGetAnalysesByArtist.mockResolvedValue([
        {
          songKey: 'Taylor-Swift/Shake-It-Off/differenthash',
          appropriate: 1,
          analysis: 'Cached',
          recommendedAge: 13,
          themes: ['pop'],
          summary: 'Upbeat, nothing explicit',
          themePercentages: [{ theme: 'pop', percentage: 90 }],
        },
      ]);

      const { status, body } = await callHandler({ altchaPayload: 'valid', lyrics: 'la la la' });

      expect(status).toBe(200);
      expect(body.data.cacheHit).toBe(true);
      expect(body.data.analysis).toBe('Cached');
      expect(body.data.songKey).toBe('Taylor-Swift/Shake-It-Off/differenthash');
      expect(body.data.summary).toBe('Upbeat, nothing explicit');
      expect(body.data.themePercentages).toEqual([{ theme: 'pop', percentage: 90 }]);
      expect(mockSaveAnalysisResult).not.toHaveBeenCalled();
    });

    it('defaults summary and themePercentages when the resolved artist+song match lacks them', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 1, analysis: 'Clean', recommendedAge: 'All', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: 'Taylor Swift', songName: 'Shake It Off',
      });
      mockGetAnalysesByArtist.mockResolvedValue([
        { songKey: 'Taylor-Swift/Shake-It-Off/differenthash', appropriate: 1, analysis: 'Cached', recommendedAge: 13, themes: [] },
      ]);

      const { body } = await callHandler({ altchaPayload: 'valid', lyrics: 'la la la' });

      expect(body.data.summary).toBe('');
      expect(body.data.themePercentages).toEqual([]);
    });

    it('skips the artist+song lookup when the request included artist or song name', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 2, analysis: 'Some mature themes', recommendedAge: '16', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: 'AI Guessed Artist', songName: 'AI Guessed Song',
      });

      await callHandler({ altchaPayload: 'valid', lyrics: 'la la la', artistName: 'Real Artist', songName: 'Real Song' });

      expect(mockGetAnalysesByArtist).not.toHaveBeenCalled();
    });

    it('still saves with resolved key when the artist+song lookup throws', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 2, analysis: 'Some mature themes', recommendedAge: '16', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: 'Taylor Swift', songName: 'Shake It Off',
      });
      mockGetAnalysesByArtist.mockRejectedValue(new Error('ddb read failed'));

      const { status } = await callHandler({ altchaPayload: 'valid', lyrics: 'la la la' });

      expect(status).toBe(200);
      expect(mockSaveAnalysisResult).toHaveBeenCalledTimes(1);
      const saved = mockSaveAnalysisResult.mock.calls[0][0];
      expect(saved.songKey).toContain('Taylor-Swift');
    });

    it('does not regenerate songKey when AI only resolves one of the two names', async () => {
      mockAnalyzeLyrics.mockResolvedValue({
        appropriate: 2, analysis: 'Some mature themes', recommendedAge: '16', themes: [],
        tokensIn: 50, tokensOut: 100,
        artistName: undefined, songName: 'Two Moons',
      });

      await callHandler({ altchaPayload: 'valid', lyrics: 'la la la' });

      const saved = mockSaveAnalysisResult.mock.calls[0][0];
      // Key should stay as the anonymous '-/-/{hash}' form, not '-/Two-Moons/{hash}'
      expect(saved.songKey.startsWith('-/-/')).toBe(true);
      expect(mockGetAnalysesByArtist).not.toHaveBeenCalled();
    });

    it('stores undefined artist/song when neither request nor AI provides them', async () => {
      await callHandler({ altchaPayload: 'valid', lyrics: 'la la la' });

      const saved = mockSaveAnalysisResult.mock.calls[0][0];
      expect(saved.song.artistName).toBeUndefined();
      expect(saved.song.songName).toBeUndefined();
    });
  });

  describe('bot rate limiting', () => {
    it('routes bot uaType to the bot limiter', async () => {
      await callHandler({ ...VALID_BODY, uaType: 'bot' });
      expect(mockBotCheckAndIncrementRateLimit).toHaveBeenCalledTimes(1);
      expect(mockCheckAndIncrementRateLimit).not.toHaveBeenCalled();
    });

    it('routes aiCrawler uaType to the bot limiter', async () => {
      await callHandler({ ...VALID_BODY, uaType: 'aiCrawler' });
      expect(mockBotCheckAndIncrementRateLimit).toHaveBeenCalledTimes(1);
      expect(mockCheckAndIncrementRateLimit).not.toHaveBeenCalled();
    });

    it('routes searchEngine uaType to the bot limiter', async () => {
      await callHandler({ ...VALID_BODY, uaType: 'searchEngine' });
      expect(mockBotCheckAndIncrementRateLimit).toHaveBeenCalledTimes(1);
      expect(mockCheckAndIncrementRateLimit).not.toHaveBeenCalled();
    });

    it('routes person uaType to the person limiter', async () => {
      await callHandler({ ...VALID_BODY, uaType: 'person' });
      expect(mockCheckAndIncrementRateLimit).toHaveBeenCalledTimes(1);
      expect(mockBotCheckAndIncrementRateLimit).not.toHaveBeenCalled();
    });

    it('routes missing uaType to the person limiter', async () => {
      await callHandler(VALID_BODY);
      expect(mockCheckAndIncrementRateLimit).toHaveBeenCalledTimes(1);
      expect(mockBotCheckAndIncrementRateLimit).not.toHaveBeenCalled();
    });

    it('returns 429 when the bot limiter blocks a request', async () => {
      mockBotCheckAndIncrementRateLimit.mockResolvedValue({
        allowed: false,
        reason: 'Daily limit exceeded. Please try again tomorrow.',
        retryAfter: 3600,
        remaining: { hourly: 0, daily: 0, burst: 0 },
      });

      const { status } = await callHandler({ ...VALID_BODY, uaType: 'bot' });

      expect(status).toBe(429);
      expect(mockAnalyzeLyrics).not.toHaveBeenCalled();
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
