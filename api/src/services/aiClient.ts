import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { logger } from '../util/logger';

export interface ThemePercentage {
  theme: string;
  percentage: number;
}

export interface LyricsAnalysis {
  appropriate: number;
  analysis: string;
  recommendedAge: number;
  themes: string[];
  summary: string;
  themePercentages: ThemePercentage[];
  tokensIn: number;
  tokensOut: number;
  artistName?: string;
  songName?: string;
}

export interface BatchLyricsInput {
  /** Caller-supplied unique id (e.g. the record's songKey) echoed back by Claude on its result, so results are matched by id rather than trusted array position. */
  id: string;
  lyrics: string;
}

export interface BatchLyricsAnalysis {
  themes: string[];
  summary: string;
  themePercentages: ThemePercentage[];
  artistName?: string;
  songName?: string;
}

export interface BatchAnalysisResult {
  /** Index-aligned with the `songs` input passed to analyzeLyricsBatch. An entry is `undefined` when Claude's response had no result matching that song's id. */
  results: (BatchLyricsAnalysis | undefined)[];
  tokensIn: number;
  tokensOut: number;
}

export class AiClient {
  private readonly client: Anthropic;

  constructor(private readonly model: string, apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Gets an estimate of input tokens for the given prompt.
   */
  async getTokenInputEstimate(prompt: string): Promise<number> {
    try {
      const response = await this.client.messages.countTokens({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
      });
      return response.input_tokens;
    } catch (err) {
      logger.error('failed to fetch prompt estimate from anthropic', { err });
      throw new Error('Failed to fetch prompt estimate');
    }
  }

  /**
   * Analyzes the given lyrics and returns the analysis result including a minimum recommended age.
   */
  async analyzeLyrics(lyrics: string): Promise<LyricsAnalysis> {
    const prompt = this.getLyricsPrompt(lyrics);

    let response;
    try {
      response = await this.client.messages.create({
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
      });
    } catch (err) {
      logger.error('failed to post message to anthropic', { err });
      throw err;
    }

    logger.info('received response from anthropic', { usage: response.usage });

    if (!response?.content || response.content.length === 0) {
      throw new Error('Claude API error: No message response returned');
    }

    const data = response.content[0];
    let responseText = data.type === 'text'
      ? (data as TextBlock).text
      : JSON.stringify({ appropriate: false, analysis: 'Unable to parse analysis response. Please try again.', recommendedAge: 'Unknown' });

    const braceOpenIdx = responseText.indexOf('{');
    const braceCloseIdx = responseText.lastIndexOf('}');

    if (braceOpenIdx < 0 || braceCloseIdx < 0) {
      throw new Error('Analysis response is not a valid JSON');
    }

    responseText = responseText.substring(braceOpenIdx, braceCloseIdx + 1);
    // Guard against the model returning bare `undefined` (invalid JSON) instead of `null`
    responseText = responseText.replace(/:\s*undefined\b/g, ': null');

    try {
      const analysis = JSON.parse(responseText);

      return {
        appropriate: analysis.appropriate,
        analysis: analysis.analysis,
        recommendedAge: analysis.recommendedAge,
        themes: analysis.themes || [],
        summary: analysis.summary || '',
        themePercentages: this.normalizeThemePercentages(analysis.themePercentages),
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
        artistName: analysis.artistName ?? undefined,
        songName: analysis.songName ?? undefined,
      };
    } catch (parseError) {
      logger.error('error parsing claude response', { parseError, responseText });
      throw new Error('Unable to parse analysis response. Please try again.');
    }
  }

  /**
   * Analyzes a batch of songs' lyrics in a single Anthropic call, returning per-song
   * themes/summary/themePercentages/artistName/songName (no age rating or long analysis).
   * Used by the summary/themes backfill script to process many legacy records per API call.
   *
   * Each song is sent with a caller-supplied `id`, which Claude is required to echo back on
   * its corresponding result. Results are matched to `songs` by that id rather than by array
   * position, so a response that's reordered, missing an item, or has an extra/duplicate item
   * doesn't silently misalign the rest — the mismatched song(s) simply come back `undefined`.
   *
   * @param songs The id + lyrics of each song to analyze
   */
  async analyzeLyricsBatch(songs: BatchLyricsInput[]): Promise<BatchAnalysisResult> {
    if (songs.length === 0) return { results: [], tokensIn: 0, tokensOut: 0 };

    const prompt = this.getBatchLyricsPrompt(songs);

    let response;
    try {
      response = await this.client.messages.create({
        max_tokens: Math.min(8192, 300 * songs.length + 1000),
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
      });
    } catch (err) {
      logger.error('failed to post batch message to anthropic', { err, batchSize: songs.length });
      throw err;
    }

    logger.info('received batch response from anthropic', { usage: response.usage, batchSize: songs.length });

    if (!response?.content || response.content.length === 0) {
      throw new Error('Claude API error: No message response returned');
    }

    const data = response.content[0];
    if (data.type !== 'text') {
      throw new Error('Claude API error: batch response was not text');
    }

    let responseText = (data as TextBlock).text;
    const bracketOpenIdx = responseText.indexOf('[');
    const bracketCloseIdx = responseText.lastIndexOf(']');

    if (bracketOpenIdx < 0 || bracketCloseIdx < 0) {
      throw new Error('Batch analysis response is not a valid JSON array');
    }

    responseText = responseText.substring(bracketOpenIdx, bracketCloseIdx + 1);
    responseText = responseText.replace(/:\s*undefined\b/g, ': null');

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('error parsing claude batch response', { parseError, responseText });
      throw new Error('Unable to parse batch analysis response. Please try again.');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Batch analysis response was not a JSON array');
    }

    // Index by id (first occurrence wins if Claude ever duplicates one), then map back onto
    // the original songs — this is what makes results robust to reordering/missing/duplicate
    // items rather than trusting Claude's array position to match our input position.
    const byId = new Map<string, any>();
    for (const item of parsed) {
      if (item && typeof item.id === 'string' && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    const results: (BatchLyricsAnalysis | undefined)[] = songs.map((song) => {
      const item = byId.get(song.id);
      if (!item) {
        logger.warn('batch analysis response had no matching id for a song', { id: song.id });
        return undefined;
      }

      return {
        themes: item.themes || [],
        summary: item.summary || '',
        themePercentages: this.normalizeThemePercentages(item.themePercentages),
        artistName: item.artistName ?? undefined,
        songName: item.songName ?? undefined,
      };
    });

    return {
      results,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }

  /**
   * Clamps AI-provided theme percentages into [0, 100] and drops malformed entries.
   */
  private normalizeThemePercentages(raw: unknown): ThemePercentage[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((tp: any) => tp && typeof tp.theme === 'string')
      .map((tp: any) => ({
        theme: tp.theme,
        percentage: Math.min(100, Math.max(0, Number(tp.percentage) || 0)),
      }));
  }

  /**
   * Gets the prompt to analyze lyrics for age-appropriateness and determine a minimum recommended age.
   */
  getLyricsPrompt(lyrics: string): string {
    return `You are tasked with analyzing song lyrics for age-appropriateness and determining the minimum recommended age for the content. Your goal is to provide a thoughtful assessment considering various factors that may impact the suitability of the content for young listeners.

Here are the lyrics to analyze:

<lyrics>
${lyrics}
</lyrics>

When analyzing the lyrics, consider the following factors:

1. Explicit language or profanity
2. Sexual content or suggestive themes, including innuendo, double entendres, and euphemisms for sexual acts or availability, even if not explicitly stated
3. Violence or disturbing imagery
4. Drug/alcohol references
5. Mature themes (relationships, mental health, etc.)
6. Overall message and values conveyed

Important scoring rules:
- If lyrics contain sexual innuendo, double entendres, or euphemisms for sex/hookups, treat this as equivalent to mild explicit sexual content and score accordingly.
- Any song where a primary theme involves sexual availability, seduction, or casual sexual encounters should receive a recommendedAge of at least "16", regardless of how playfully or indirectly it is expressed.
- Reserve "13" for content with only very mild romantic themes (e.g., crushes, hand-holding, emotional longing) and no sexual undertones.

Instructions for analysis:
1. Carefully read through the entire set of lyrics.
2. Identify any content related to the factors listed above.
3. Consider the context and how the themes are presented.
4. Determine the minimum age at which this content would be appropriate.
5. Assess the overall appropriateness level based on the content found.

Provide your analysis in the following JSON format:

{
    "appropriate": "integer: Level of appropriateness, 1 through 3, where 1 = generally appropriate for most ages, 2 = exercise caution/parental guidance suggested, 3 = mature content/older audiences only",
    "analysis": "Brief explanation of your assessment, including specific concerns if any",
    "recommendedAge": "Minimum recommended age (e.g., '13', 'All', '16', '18')",
    "themes": "string array: List of top 6 themes in the lyrics as keywords, each keyword a single word or at most two words (e.g. 'violence', 'drug references', not full phrases)",
    "summary": "string: A single short, terse phrase or comma-separated list of short phrases naming the main reasons for the rating, under ~8 words, e.g. 'Explicit language, disturbing themes' or 'Mild innuendo'. No need for full grammar.",
    "themePercentages": "object array: For each entry in 'themes', an object { \"theme\": string, \"percentage\": integer 0-100 } estimating how prevalent/intense that theme is in the song overall",
    "artistName": "string | null: Name of the artist if known; null if unknown",
    "songName": "string | null: Name of the song if known; null if unknown"
}

Be conservative in your assessment and err on the side of caution when determining the minimum recommended age. Consider what themes and content are generally appropriate for different age groups.`;
  }

  /**
   * Gets the prompt to identify themes/summary/theme percentages for a batch of songs in a
   * single call. Deliberately excludes the age rating and long analysis text — this is used
   * to backfill those two fields (plus themes) onto existing records without re-litigating
   * their already-served rating.
   *
   * Each song carries an `id` that Claude must echo back on its result object, so the caller
   * can match results to songs by id instead of trusting response array order.
   */
  getBatchLyricsPrompt(songs: BatchLyricsInput[]): string {
    const songBlocks = songs
      .map((song, i) => `<song index="${i + 1}" id="${song.id}">\n<lyrics>\n${song.lyrics}\n</lyrics>\n</song>`)
      .join('\n\n');

    return `You are tasked with identifying the content themes in the lyrics of ${songs.length} songs, and writing a short summary of why each song's content might be flagged for parents. You are NOT determining an age rating or writing a long explanation here — only themes, a short summary, and per-theme percentages.

Here are the songs to analyze:

${songBlocks}

For each song, consider the following factors when identifying themes:

1. Explicit language or profanity
2. Sexual content or suggestive themes, including innuendo, double entendres, and euphemisms for sexual acts or availability, even if not explicitly stated
3. Violence or disturbing imagery
4. Drug/alcohol references
5. Mature themes (relationships, mental health, etc.)
6. Overall message and values conveyed

For each song, provide an object in this JSON format:

{
    "id": "string: the exact id attribute from that song's <song> tag above, copied verbatim, so the result can be matched back to the correct song",
    "themes": "string array: List of top 6 themes in the lyrics as keywords, each keyword a single word or at most two words (e.g. 'violence', 'drug references', not full phrases)",
    "summary": "string: A single short, terse phrase or comma-separated list of short phrases naming the main reasons for the rating, under ~8 words, e.g. 'Explicit language, disturbing themes' or 'Mild innuendo'. No need for full grammar.",
    "themePercentages": "object array: For each entry in 'themes', an object { \\"theme\\": string, \\"percentage\\": integer 0-100 } estimating how prevalent/intense that theme is in the song overall",
    "artistName": "string | null: Name of the artist if known; null if unknown",
    "songName": "string | null: Name of the song if known; null if unknown"
}

Return a JSON array of exactly ${songs.length} objects, one per song. Every object MUST include the "id" field, copied exactly from its corresponding <song> tag's id attribute — this is required to verify each result matches the correct song, regardless of the order you return them in. Do not include any other fields, and do not include any prose or explanation outside the JSON array.`;
  }
}
