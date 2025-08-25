// app/api/analyze-song/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Model, TextBlock } from '@anthropic-ai/sdk/resources';
import { logPrefix } from '@/util/log';
import { logger } from '@/logger/logger';

interface AnalyzeSongRequest {
    childAge: number;
    lyrics: string;
}

interface AnalyzeSongResponse {
    appropriate: number;
    analysis: string;
    recommendedAge: string;
    error?: string;
}

const logName = "analyze-song";

async function analyzeLyricsWithClaude(lyrics: string, childAge: number): Promise<{
    appropriate: number;
    analysis: string;
    recommendedAge: string;
}> {
    const prompt = `You are tasked with analyzing song lyrics for age-appropriateness for a specific child's age. Your goal is to provide a thoughtful assessment considering various factors that may impact the suitability of the content for young listeners.

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

    try {
        const client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY!,
        });

        const response = await client.messages.create({
            max_tokens: 2048,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: process.env.ANTHROPIC_MODEL as Model,
        })
        .catch(async (err) => {
            logger.error(`${logPrefix(logName)} Claude fetch threw error`, err);
            throw err;
        });

        logger.info(`${logPrefix(logName)} Claude response`, response);

        if (!response) {
            throw new Error("Claude API error: Nothing returned");
        }

        if (!response.content || response.content.length === 0)
            throw new Error("Claude API error: No message response returned");

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
            return {
                appropriate: analysis.appropriate,
                analysis: analysis.analysis,
                recommendedAge: analysis.recommendedAge
            };
        } catch (parseError) {
            logger.error(`${logName} Error parsing Claude response:`, {
                parseError,
                responseText,
            });

            // Fallback if JSON parsing fails
            return {
                appropriate: 0,
                analysis: "Unable to parse analysis response. Please try again.",
                recommendedAge: "Unknown"
            };
        }

    } catch (error) {
        logger.error(`${logName} Error calling Claude API:`, error);
        throw new Error('Failed to analyze lyrics with Claude AI');
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeSongRequest = await request.json();
        const { childAge, lyrics } = body;

        if (!childAge || childAge < 2 || childAge > 21) {
            return NextResponse.json(
                { error: 'Child age must be between 2 and 21' },
                { status: 400 }
            );
        }

        if (!lyrics.trim()) {
            return NextResponse.json(
                { error: 'Lyrics are required' },
                { status: 400 }
            );
        }

        const lyricsToAnalyze = lyrics.trim();

        // Analyze lyrics with Claude
        const analysis = await analyzeLyricsWithClaude(lyricsToAnalyze, childAge);

        const response: AnalyzeSongResponse = {
            appropriate: analysis.appropriate,
            analysis: analysis.analysis,
            recommendedAge: analysis.recommendedAge
        };

        return NextResponse.json(response);

    } catch (error) {
        logger.error(`${logPrefix(logName)} Error analyzing song:`, error);
        return NextResponse.json(
            { 
                error: 'Internal server error. Please try again.',
                appropriate: false,
                analysis: '',
                recommendedAge: ''
            },
            { status: 500 }
        );
    }
}