import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { logger } from "../logger/logger";

const moduleName = "AI Client";

export interface LyricsAnalysis {
    appropriate: number;
    analysis: string;
    recommendedAge: number;
    tokensIn: number;
    tokensOut: number;
}

export class AiClient {
    private model: string;
    private client: Anthropic;

    constructor(model: string, apiKey: string) {
        this.model = model;
        this.client = new Anthropic({
            apiKey,
        });
    }

    /**
     * Gets an estimate of input tokens for the given prompt.
     * @param prompt The prompt to estimate
     * @returns The number of estimated input tokens
     */
    public getTokenInputEstimate = async (prompt: string): Promise<number> => {
        return new Promise((resolve, reject) => {
            try {
                this.client.messages.countTokens({
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    model: this.model,
                })
                .then((response) => {
                    if (response === undefined || response === null) {
                        logger.error("Invalid response from Anthropic for prompt estimate.", { prompt });
                        reject(new Error("Invalid response from Anthropic for prompt estimate."))
                    }

                    resolve(response.input_tokens);
                })
                .catch((err) => {
                    logger.error("Error occurred while fetching prompt estimate", { moduleName, err });
                    reject(new Error('Error occurred while fetching prompt estimate'));
                })
            }
            catch (err) {
                logger.error("Failed to fetch prompt estimate from Anthropic", { moduleName, err });
                reject(new Error('Failed to fetch prompt estimate from Anthropic'));
            }
        });
    }

    /**
     * Analizes the given lyrics for the given child's age and returns a promise with the analysis result.
     * @param lyrics The lyrics to analyze.
     * @param childAge The child's age.
     * @returns The lyrics analysis result
     */
    public analyzeLyrics = async (lyrics: string, childAge: number): Promise<LyricsAnalysis> => {
        return new Promise((resolve, reject) => {
            const prompt = this.getLyricsPrompt(lyrics, childAge);

            try {

                this.client.messages.create({
                    max_tokens: 2048,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    model: this.model,
                })
                .then((response) => {
                    logger.info(`Received response from Anthropic`, { moduleName, response});

                    if (!response || !response.content || response.content.length === 0)
                        reject("Claude API error: No message response returned");

                    const data = response.content[0];
                    let responseText = data.type === "text"
                        ? (data as TextBlock).text
                        : JSON.stringify({
                            appropriate: false,
                            analysis: "Unable to parse analysis response. Please try again.",
                            recommendedAge: "Unknown"
                        });

                    const braceOpenIdx = responseText.indexOf('{');
                    const braceCloseIdx = responseText.lastIndexOf('}');

                    if (braceOpenIdx < 0 || braceCloseIdx < 0)
                        throw new Error("Analysis response is not a valid JSON");

                    responseText = responseText.substring(braceOpenIdx, braceCloseIdx + 1);
                    
                    // Parse JSON response from Claude
                    try {
                        const analysis = JSON.parse(responseText);
                        resolve({
                            appropriate: analysis.appropriate,
                            analysis: analysis.analysis,
                            recommendedAge: analysis.recommendedAge,
                            tokensIn: response.usage.input_tokens,
                            tokensOut: response.usage.output_tokens,
                        });
                    } catch (parseError) {
                        logger.error(`${moduleName} Error parsing Claude response:`, {
                            parseError,
                            responseText,
                        });

                        // Fallback if JSON parsing fails
                        reject(new Error("Unable to parse analysis response. Please try again."));
                    }
                })
                .catch(async (err) => {
                    logger.error("Failed to post message to Anthropic", { moduleName, err });
                    reject(err);
                });

            } catch (error) {
                logger.error(`${moduleName} Error calling Claude API:`, error);
                reject(new Error('Failed to analyze lyrics with Claude AI'));
            }
        });
    }

    /**
     * Gets the prompt to analyze lyrics based on the given child's age and the content of the lyrics
     * @param lyrics The lyrics to analyze
     * @param childAge The child's age
     * @returns The prompt to analyze lyrics
     */
    public getLyricsPrompt = (lyrics: string, childAge: number): string => `You are tasked with analyzing song lyrics for age-appropriateness for a specific child's age. Your goal is to provide a thoughtful assessment considering various factors that may impact the suitability of the content for young listeners.

Here are the lyrics to analyze:

<lyrics>
${lyrics}
</lyrics>

The age of the child in question is: ${childAge} years old

When analyzing the lyrics, consider the following factors:

1. Explicit language or profanity
2. Sexual content or suggestive themes
3. Violence or disturbing imagery
4. Drug/alcohol references
5. Mature themes (relationships, mental health, etc.)
6. Overall message and values conveyed

Instructions for analysis:
1. Carefully read through the entire set of lyrics.
2. Identify any content related to the factors listed above.
3. Consider the context and how the themes are presented.
4. Assess the overall appropriateness for a ${childAge}-year-old child.
5. Determine a minimum recommended age for the song.

Provide your analysis in the following JSON format:

{
    "appropriate": "integer: Level of appropriateness, 1 through 3, where 1 = appropriate, 2 = exercise caution, 3 = not appropriate",
    "analysis": "Brief explanation of your assessment, including specific concerns if any",
    "recommendedAge": "Minimum recommended age (e.g., '13', 'All', '16')"
}

Please tailor your assessment to the age of ${childAge} years old. Consider what themes and content are generally appropriate for children of this age, and err on the side of caution if you're unsure about certain elements.`;
}
