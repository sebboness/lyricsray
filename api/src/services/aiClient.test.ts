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
      })));

      const result = await client.analyzeLyrics('la la la');

      expect(result).toEqual({
        appropriate: 2,
        analysis: 'Some mature themes',
        recommendedAge: '16',
        themes: ['violence'],
        tokensIn: 10,
        tokensOut: 20,
      });
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
});
