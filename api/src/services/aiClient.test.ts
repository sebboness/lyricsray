import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate, mockCountTokens } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockCountTokens: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate, countTokens: mockCountTokens },
  })),
}));

vi.mock('../util/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { AiClient } from './aiClient';

function textResponse(text: string, usage = { input_tokens: 10, output_tokens: 20 }) {
  return { content: [{ type: 'text', text }], usage };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AiClient', () => {
  const client = new AiClient('claude-test-model', 'test-key');

  describe('getTokenInputEstimate', () => {
    it('returns the input token count', async () => {
      mockCountTokens.mockResolvedValue({ input_tokens: 42 });

      const result = await client.getTokenInputEstimate('some prompt');

      expect(result).toBe(42);
    });

    it('throws a generic error when the Anthropic call fails', async () => {
      mockCountTokens.mockRejectedValue(new Error('rate limited'));

      await expect(client.getTokenInputEstimate('prompt')).rejects.toThrow('Failed to fetch prompt estimate');
    });
  });

  describe('analyzeLyrics', () => {
    it('parses a well-formed JSON response', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify({
        appropriate: 2,
        analysis: 'Some mature themes',
        recommendedAge: '16',
        themes: ['violence'],
        summary: 'Violence, mild language',
        themePercentages: [{ theme: 'violence', percentage: 60 }],
      })));

      const result = await client.analyzeLyrics('la la la');

      expect(result).toEqual({
        appropriate: 2,
        analysis: 'Some mature themes',
        recommendedAge: '16',
        themes: ['violence'],
        summary: 'Violence, mild language',
        themePercentages: [{ theme: 'violence', percentage: 60 }],
        tokensIn: 10,
        tokensOut: 20,
      });
    });

    it('defaults summary to an empty string and themePercentages to an empty array when omitted', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify({ appropriate: 1, analysis: 'clean', recommendedAge: 'All' })));

      const result = await client.analyzeLyrics('la la la');

      expect(result.summary).toBe('');
      expect(result.themePercentages).toEqual([]);
    });

    it('clamps out-of-range theme percentages into 0-100 and drops malformed entries', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify({
        appropriate: 2,
        analysis: 'Some mature themes',
        recommendedAge: '16',
        themes: ['violence', 'drugs'],
        themePercentages: [
          { theme: 'violence', percentage: 150 },
          { theme: 'drugs', percentage: -10 },
          { percentage: 40 },
        ],
      })));

      const result = await client.analyzeLyrics('la la la');

      expect(result.themePercentages).toEqual([
        { theme: 'violence', percentage: 100 },
        { theme: 'drugs', percentage: 0 },
      ]);
    });

    it('extracts JSON even when the model wraps it in prose', async () => {
      mockCreate.mockResolvedValue(textResponse(
        `Sure, here's my analysis:\n${JSON.stringify({ appropriate: 1, analysis: 'clean', recommendedAge: 'All', themes: [] })}\nHope that helps!`
      ));

      const result = await client.analyzeLyrics('la la la');

      expect(result.appropriate).toBe(1);
      expect(result.recommendedAge).toBe('All');
    });

    it('defaults themes to an empty array when omitted', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify({ appropriate: 1, analysis: 'clean', recommendedAge: 'All' })));

      const result = await client.analyzeLyrics('la la la');

      expect(result.themes).toEqual([]);
    });

    it('passes through artistName and songName when the AI provides them', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify({
        appropriate: 1, analysis: 'clean', recommendedAge: 'All', themes: [],
        artistName: 'Taylor Swift', songName: 'Shake It Off',
      })));

      const result = await client.analyzeLyrics('la la la');

      expect(result.artistName).toBe('Taylor Swift');
      expect(result.songName).toBe('Shake It Off');
    });

    it('handles bare undefined literals in JSON response without throwing', async () => {
      const raw = '{\n  "appropriate": 3,\n  "analysis": "Heavy themes",\n  "recommendedAge": "18",\n  "themes": ["self-harm"],\n  "artistName": undefined,\n  "songName": undefined\n}';
      mockCreate.mockResolvedValue(textResponse(raw));

      const result = await client.analyzeLyrics('la la la');

      expect(result.appropriate).toBe(3);
      expect(result.artistName).toBeUndefined();
      expect(result.songName).toBeUndefined();
    });

    it('returns undefined for artistName and songName when the AI omits them', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify({
        appropriate: 1, analysis: 'clean', recommendedAge: 'All', themes: [],
      })));

      const result = await client.analyzeLyrics('la la la');

      expect(result.artistName).toBeUndefined();
      expect(result.songName).toBeUndefined();
    });

    it('throws when the response has no content blocks', async () => {
      mockCreate.mockResolvedValue({ content: [], usage: { input_tokens: 1, output_tokens: 1 } });

      await expect(client.analyzeLyrics('la la la')).rejects.toThrow('No message response returned');
    });

    it('throws when the response text is not JSON (no braces found)', async () => {
      mockCreate.mockResolvedValue(textResponse('I cannot analyze this.'));

      await expect(client.analyzeLyrics('la la la')).rejects.toThrow('Analysis response is not a valid JSON');
    });

    it('throws a friendly error when the extracted text is malformed JSON', async () => {
      mockCreate.mockResolvedValue(textResponse('{ "appropriate": 1, "analysis": "trailing comma", }'));

      await expect(client.analyzeLyrics('la la la')).rejects.toThrow('Unable to parse analysis response. Please try again.');
    });

    it('falls back to a placeholder payload when the content block is not text (e.g. tool use)', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'x', name: 'x', input: {} }],
        usage: { input_tokens: 1, output_tokens: 1 },
      });

      const result = await client.analyzeLyrics('la la la');

      expect(result.appropriate).toBe(false);
      expect(result.analysis).toContain('Unable to parse analysis response');
    });

    it('propagates the underlying error when the Anthropic API call itself fails', async () => {
      mockCreate.mockRejectedValue(new Error('upstream 500'));

      await expect(client.analyzeLyrics('la la la')).rejects.toThrow('upstream 500');
    });
  });

  describe('getLyricsPrompt', () => {
    it('embeds the given lyrics in the prompt', () => {
      const prompt = client.getLyricsPrompt('some lyrics here');
      expect(prompt).toContain('some lyrics here');
      expect(prompt).toContain('<lyrics>');
    });
  });

  describe('getBatchLyricsPrompt', () => {
    it('embeds each song in its own indexed, id-tagged block', () => {
      const prompt = client.getBatchLyricsPrompt([
        { id: 'song-1', lyrics: 'first song lyrics' },
        { id: 'song-2', lyrics: 'second song lyrics' },
      ]);

      expect(prompt).toContain('<song index="1" id="song-1">');
      expect(prompt).toContain('first song lyrics');
      expect(prompt).toContain('<song index="2" id="song-2">');
      expect(prompt).toContain('second song lyrics');
      expect(prompt).toContain('exactly 2 objects');
      expect(prompt).toContain('MUST include the "id" field');
    });
  });

  describe('analyzeLyricsBatch', () => {
    it('returns an empty results array with zero token usage, without calling Anthropic, when given no songs', async () => {
      const result = await client.analyzeLyricsBatch([]);

      expect(result).toEqual({ results: [], tokensIn: 0, tokensOut: 0 });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('matches results to songs by id, alongside token usage', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify([
        { id: 'song-a', themes: ['violence'], summary: 'Violence', themePercentages: [{ theme: 'violence', percentage: 60 }], artistName: 'A1', songName: 'S1' },
        { id: 'song-b', themes: [], summary: 'Clean', themePercentages: [] },
      ]), { input_tokens: 500, output_tokens: 150 }));

      const result = await client.analyzeLyricsBatch([
        { id: 'song-a', lyrics: 'lyrics one' },
        { id: 'song-b', lyrics: 'lyrics two' },
      ]);

      expect(result.tokensIn).toBe(500);
      expect(result.tokensOut).toBe(150);
      expect(result.results).toEqual([
        { themes: ['violence'], summary: 'Violence', themePercentages: [{ theme: 'violence', percentage: 60 }], artistName: 'A1', songName: 'S1' },
        { themes: [], summary: 'Clean', themePercentages: [], artistName: undefined, songName: undefined },
      ]);
    });

    it('matches results to songs by id even when Claude returns them out of order', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify([
        { id: 'song-b', themes: [], summary: 'Clean' },
        { id: 'song-a', themes: ['violence'], summary: 'Violence' },
      ])));

      const result = await client.analyzeLyricsBatch([
        { id: 'song-a', lyrics: 'lyrics one' },
        { id: 'song-b', lyrics: 'lyrics two' },
      ]);

      // Still index-aligned to the *input* order, not the response order.
      expect(result.results[0]?.summary).toBe('Violence');
      expect(result.results[1]?.summary).toBe('Clean');
    });

    it('returns undefined for a song whose id is missing from the response, without shifting the others', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify([
        { id: 'song-a', themes: ['violence'], summary: 'Violence' },
        // song-b's result is missing entirely
        { id: 'song-c', themes: [], summary: 'Clean' },
      ])));

      const result = await client.analyzeLyricsBatch([
        { id: 'song-a', lyrics: 'lyrics one' },
        { id: 'song-b', lyrics: 'lyrics two' },
        { id: 'song-c', lyrics: 'lyrics three' },
      ]);

      expect(result.results[0]?.summary).toBe('Violence');
      expect(result.results[1]).toBeUndefined();
      expect(result.results[2]?.summary).toBe('Clean');
    });

    it('uses the first match and does not crash when the response has a duplicate id', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify([
        { id: 'song-a', themes: [], summary: 'First' },
        { id: 'song-a', themes: [], summary: 'Duplicate' },
      ])));

      const result = await client.analyzeLyricsBatch([{ id: 'song-a', lyrics: 'lyrics one' }]);

      expect(result.results[0]?.summary).toBe('First');
    });

    it('extracts the JSON array even when the model wraps it in prose', async () => {
      mockCreate.mockResolvedValue(textResponse(
        `Sure, here you go:\n${JSON.stringify([{ id: 'song-a', themes: [], summary: 'ok', themePercentages: [] }])}\nLet me know if you need more!`
      ));

      const result = await client.analyzeLyricsBatch([{ id: 'song-a', lyrics: 'lyrics one' }]);

      expect(result.results[0]?.summary).toBe('ok');
    });

    it('clamps out-of-range theme percentages per item', async () => {
      mockCreate.mockResolvedValue(textResponse(JSON.stringify([
        { id: 'song-a', themes: ['drugs'], summary: 'x', themePercentages: [{ theme: 'drugs', percentage: 250 }] },
      ])));

      const result = await client.analyzeLyricsBatch([{ id: 'song-a', lyrics: 'lyrics one' }]);

      expect(result.results[0]?.themePercentages).toEqual([{ theme: 'drugs', percentage: 100 }]);
    });

    it('throws when the response has no bracketed JSON array', async () => {
      mockCreate.mockResolvedValue(textResponse('I cannot analyze these songs.'));

      await expect(client.analyzeLyricsBatch([{ id: 'song-a', lyrics: 'lyrics one' }])).rejects.toThrow('Batch analysis response is not a valid JSON array');
    });

    it('throws a friendly error when the extracted array text is malformed JSON', async () => {
      mockCreate.mockResolvedValue(textResponse('[ { "summary": "trailing comma", }, ]'));

      await expect(client.analyzeLyricsBatch([{ id: 'song-a', lyrics: 'lyrics one' }])).rejects.toThrow('Unable to parse batch analysis response. Please try again.');
    });

    it('propagates the underlying error when the Anthropic API call itself fails', async () => {
      mockCreate.mockRejectedValue(new Error('upstream 500'));

      await expect(client.analyzeLyricsBatch([{ id: 'song-a', lyrics: 'lyrics one' }])).rejects.toThrow('upstream 500');
    });
  });
});
