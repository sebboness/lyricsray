import { NextRequest, NextResponse } from 'next/server';
import { logPrefix } from '@/util/log';
import { logger } from '@/logger/logger';
import { verifyAltchaSolution } from '@/util/altcha';
import { makeKey } from '@/util/hash';
import { AnalysisResult, AnalysisResultStorage } from '@/storage/AnalysisResultStorage';
import moment from 'moment';
import { AiClient } from '@/services/aiClient';
import { LYRICS_MAX_LENGTH } from '@/util/defaults';
import { getDynamoDbClient } from '@/storage/dynamodb';

interface AnalyzeSongRequest {
    altchaPayload: string;
    childAge: number;
    lyrics: string;
    albumName?: string;
    songName?: string;
    artistName?: string;
}

interface AnalyzeSongResponse {
    appropriate: number;
    analysis: string;
    recommendedAge: string;
    error?: string;
}

const moduleName = "analyze-song";

const aiClient = new AiClient(process.env.ANTHROPIC_MODEL!, process.env.ANTHROPIC_API_KEY!);

/**
 * Cleans up lyrics by trimming the string, removing any html elements, and removing any "[" and "]" groups.
 * @param lyrics The lyrics to clean
 * @returns Cleaned up lyrics string
 */
const cleanUpLyrics = (lyrics?: string): string => {
    if (!lyrics)
        return "";
    
    return lyrics.trim().replace(/(<[^>]*>)|(\[[^\]]*\])/g, '');
}

export async function POST(request: NextRequest) {
    try {

        const ddbClient = getDynamoDbClient();
        const analysisResultDb = new AnalysisResultStorage(ddbClient);
        const body: AnalyzeSongRequest = await request.json();

        const {
            albumName,
            altchaPayload,
            childAge,
            songName,
            artistName
        } = body;

        let { lyrics } = body;

        const age = parseInt(childAge + "");

        logger.info(`${logPrefix(moduleName)} altchaPayload`, altchaPayload);

        if (!altchaPayload || !await verifyAltchaSolution(altchaPayload)) {
            return NextResponse.json(
                { error: 'Human verification failed' },
                { status: 400 }
            );
        }

        lyrics = cleanUpLyrics(lyrics);

        if (!lyrics) {
            return NextResponse.json(
                { error: 'Lyrics are required' },
                { status: 400 }
            );
        }

        if (!lyrics && lyrics.length > LYRICS_MAX_LENGTH) {
            lyrics = lyrics.substring(0, LYRICS_MAX_LENGTH);
        }

        if (!age || age < 2 || age > 21) {
            return NextResponse.json(
                { error: 'Child age must be between 2 and 21' },
                { status: 400 }
            );
        }

        // Try to get analysis from storage if it was previously analyzed
        const songKeyPrefix = `${age}|${artistName}|${songName}`;
        const songKey = makeKey(lyrics, songKeyPrefix);
        let song: AnalysisResult | null = null;

        try {
            song = await analysisResultDb.getAnalysisResult(age, songKey);

            const message = !!song
                ? "Retrieved existing analysis result from storage"
                : "Analysis result not found in storage";

            logger.info(message, {
                moduleName,
                age,
                artistName,
                songName,
                songKey,
            });
        }
        catch (err) {
            logger.error("Error ocurred while retrieving analysis result from storage", {
                moduleName,
                age,
                artistName,
                songName,
                err,
            })
        }

        if (song != null) {
            const response: AnalyzeSongResponse = {
                appropriate: song.appropriate,
                analysis: song.analysis,
                recommendedAge: song.recommendedAge.toString(),
            };

            return NextResponse.json(response);
        }
        else {
            // Get an estimate prior to analyzing with AI
            const prompt = aiClient.getLyricsPrompt(lyrics, age);
            const estimateTokensIn = await aiClient.getTokenInputEstimate(prompt);

            logger.info("Estimated token input for prompt", { moduleName, estimateTokensIn });

            // Analyze lyrics with AI
            const analysis = await aiClient.analyzeLyrics(lyrics, age);

            const analysisResult: AnalysisResult = {
                age,
                appropriate: analysis.appropriate,
                analysis: analysis.analysis,
                recommendedAge: analysis.recommendedAge,
                date: moment.utc().toISOString(),
                songKey,
                song: {
                    albumName,
                    artistName,
                    lyrics,
                    songName,
                    thumbnailUrl: undefined,
                    yearReleased: undefined,
                }
            }

            // Try saving to database
            try {
                await analysisResultDb.saveAnalysisResult(analysisResult);

                logger.info("Analysis result saved to storage", {
                    moduleName,
                    age,
                    artistName,
                    songName,
                })
            }
            catch (err) {
                logger.error("Failed to save analysis result to storage", {
                    moduleName,
                    age,
                    artistName,
                    songName,
                    err,
                })
            }

            const response: AnalyzeSongResponse = {
                appropriate: analysis.appropriate,
                analysis: analysis.analysis,
                recommendedAge: analysis.recommendedAge.toString(),
            };

            return NextResponse.json(response);
        }

    } catch (error) {
        logger.error(`${logPrefix(moduleName)} Error analyzing song:`, error);
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