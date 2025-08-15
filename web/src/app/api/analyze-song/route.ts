// app/api/analyze-song/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSongById } from 'genius-lyrics-api';
import { Model, TextBlock } from '@anthropic-ai/sdk/resources';

interface AnalyzeSongRequest {
    childAge: string;
    songId?: string;  // For search method
    lyrics?: string;  // For direct lyrics method
    inputMethod: 'search' | 'lyrics';
}

interface AnalyzeSongResponse {
    appropriate: boolean;
    analysis: string;
    recommendedAge: string;
    error?: string;
}

interface ClaudeResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
}

async function fetchLyricsFromGenius(songId: string): Promise<string> {
    try {
        var song = await getSongById(songId, `${process.env.GENIUS_API_ACCESS_TOKEN}`);

        if (!song) {
            throw new Error(`Failed to retrieve lyrics for song ID ${songId}`);
        }

        console.log("lyrics", song.lyrics);

        return song.lyrics;

    } catch (error) {
        console.error('Error fetching lyrics from Genius:', error);
        throw new Error('Unable to retrieve lyrics. Please paste them directly.');
    }
    }

async function analyzeLyricsWithClaude(lyrics: string, childAge: string): Promise<{
    appropriate: boolean;
    analysis: string;
    recommendedAge: string;
}> {
    const prompt = `You are tasked with analyzing song lyrics for age-appropriateness for a specific child's age. Your goal is to provide a thoughtful assessment considering various factors that may impact the suitability of the content for young listeners.

Here are the lyrics you need to analyze:

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
	"appropriate": boolean,
	"analysis": "Brief explanation of your assessment, including specific concerns if any",
	"recommendedAge": "Minimum recommended age (e.g., '13+', 'All ages', '16+')"
}

Remember to tailor your assessment to the specific age of ${childAge} years old. Consider what themes and content are generally appropriate for children of this age, and err on the side of caution if you're unsure about certain elements.`;

    try {
        console.log("claude model", process.env.ANTHROPIC_MODEL);
        console.log("claude apikey", process.env.ANTHROPIC_API_KEY);

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
            console.log("claude err", err);
            if (err instanceof Anthropic.APIError) {
                console.log("claude err", err.status); // 400
                console.log("claude err", err.name); // BadRequestError
                console.log("claude err", err.headers); // {server: 'nginx', ...}
            } else {
                throw err;
            }
        });

        console.log("claude response", response);

        if (!response) {
            throw new Error("Claude API error: Nothing returned");
        }

        if (!response.content || response.content.length === 0)
            throw new Error("Claude API error: No message response returned");

        const data = response.content[0];
        const responseText = data.type === "text"
            ? (data as TextBlock).text
            : JSON.stringify({
                appropriate: false,
                analysis: "Unable to parse analysis response. Please try again.",
                recommendedAge: "Unknown"
            });
        
        // Parse JSON response from Claude
        try {
            const analysis = JSON.parse(responseText);
            return {
                appropriate: analysis.appropriate,
                analysis: analysis.analysis,
                recommendedAge: analysis.recommendedAge
            };
        } catch (parseError) {
            // Fallback if JSON parsing fails
            return {
                appropriate: false,
                analysis: "Unable to parse analysis response. Please try again.",
                recommendedAge: "Unknown"
            };
        }

    } catch (error) {
        console.error('Error calling Claude API:', error);
        throw new Error('Failed to analyze lyrics with Claude AI');
    }
    }

    export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeSongRequest = await request.json();
        const { childAge, songId, lyrics, inputMethod } = body;

        if (!childAge) {
            return NextResponse.json(
                { error: 'Child age is required' },
                { status: 400 }
            );
        }

        let lyricsToAnalyze: string;

        if (inputMethod === 'lyrics') {
            if (!lyrics?.trim()) {
                return NextResponse.json(
                    { error: 'Lyrics are required when using direct input method' },
                    { status: 400 }
                );
            }

            lyricsToAnalyze = lyrics.trim();
        } else if (inputMethod === 'search') {
            if (!songId) {
                return NextResponse.json(
                    { error: 'Song ID is required when using search method' },
                    { status: 400 }
                );
            }
            
            try {
                lyricsToAnalyze = await fetchLyricsFromGenius(songId);
            } catch (error) {
                return NextResponse.json({
                    error: 'Unable to retrieve lyrics for this song. Please try pasting the lyrics directly.',
                    appropriate: false,
                    analysis: '',
                    recommendedAge: ''
                });
            }
        } else {
            return NextResponse.json(
                { error: 'Invalid input method' },
                { status: 400 }
            );
        }

        // Analyze lyrics with Claude
        const analysis = await analyzeLyricsWithClaude(lyricsToAnalyze, childAge);

        const response: AnalyzeSongResponse = {
            appropriate: analysis.appropriate,
            analysis: analysis.analysis,
            recommendedAge: analysis.recommendedAge
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error analyzing song:', error);
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