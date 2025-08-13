// Add to your app/api/analyze-song/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getLyrics, getSong } from "genius-lyrics-api";

interface AnalyzeSongRequest {
    childAge: string;
    songName?: string;
    songArtist?: string;
    lyrics?: string;
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

async function analyzeLyricsWithClaude(lyrics: string, childAge: string): Promise<{
    appropriate: boolean;
    analysis: string;
    recommendedAge: string;
}> {
    const prompt = `Please analyze the following song lyrics for age-appropriateness for a ${childAge}-year-old child.

    Consider these factors:
    - Explicit language or profanity
    - Sexual content or suggestive themes
    - Violence or disturbing imagery
    - Drug/alcohol references
    - Mature themes (relationships, mental health, etc.)
    - Overall message and values conveyed

    Provide your response in this exact JSON format:
    {
        "appropriate": boolean,
        "analysis": "Brief explanation of your assessment, including specific concerns if any",
        "recommendedAge": "Minimum recommended age (e.g., '13+', 'All ages', '16+')"
    }

    Lyrics to analyze:
    ${lyrics}`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [
                {
                    role: 'user',
                    content: prompt
                }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data: ClaudeResponse = await response.json();
        const responseText = data.content[0]?.text || '';
        
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

async function fetchLyricsFromGenius(songName: string, artistName: string): Promise<string> {
    // This is a placeholder - you'll need to implement Genius API integration
    // For now, return a mock response
    throw new Error('Song not found in our database. Please try pasting the lyrics directly.');
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeSongRequest = await request.json();
        const { childAge, songName, songArtist, lyrics, inputMethod } = body;

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
        } else {
            if (!songName || !songArtist) {
                return NextResponse.json(
                { error: 'Song name and artist are required for search method' },
                { status: 400 }
                );
            }
        
            try {
                lyricsToAnalyze = await fetchLyricsFromGenius(songName, songArtist);
            } catch (error) {
                return NextResponse.json({
                    error: 'Song not found. Please try pasting the lyrics directly using the other tab.',
                    appropriate: false,
                    analysis: '',
                    recommendedAge: ''
                });
            }
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

// Environment variables you'll need to add to your .env.local:
// ANTHROPIC_API_KEY=your_claude_api_key_here
// GENIUS_API_KEY=your_genius_api_key_here (for future implementation)