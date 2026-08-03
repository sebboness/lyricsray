import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { logger } from '../util/logger';

export interface LyricsAnalysis {
  appropriate: number;
  analysis: string;
  recommendedAge: number;
  themes: string[];
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

    try {
      const analysis = JSON.parse(responseText);
      return {
        appropriate: analysis.appropriate,
        analysis: analysis.analysis,
        recommendedAge: analysis.recommendedAge,
        themes: analysis.themes || [],
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
      };
    } catch (parseError) {
      logger.error('error parsing claude response', { parseError, responseText });
      throw new Error('Unable to parse analysis response. Please try again.');
    }
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
    "themes": "string array: List of themes in the lyrics as keywords"
}

Be conservative in your assessment and err on the side of caution when determining the minimum recommended age. Consider what themes and content are generally appropriate for different age groups.`;
  }
}
