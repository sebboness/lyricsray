// app/api/analyze-song/[songKey]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResultStorage } from '../storage/AnalysisResultStorage';
import { logger } from '../logger/logger';

const moduleName = "get-analysis-result";

interface RouteContext {
    params: Promise<{
        songKey: string;
    }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { songKey } = await context.params;

        if (!songKey) {
            return NextResponse.json(
                { error: 'songKey parameter is required' },
                { status: 400 }
            );
        }

        // Decode the songKey from URL encoding
        const decodedSongKey = decodeURIComponent(songKey);

        // Extract age from songKey (format: "age|artist|song")
        const songKeyParts = decodedSongKey.split('|');
        const age = parseInt(songKeyParts[0]);

        if (isNaN(age)) {
            logger.warn(`Invalid age in songKey: ${decodedSongKey}`, { moduleName });
            return NextResponse.json(
                { error: 'Invalid songKey format' },
                { status: 400 }
            );
        }

        // Retrieve analysis result from DynamoDB
        const ddbClient = getDynamoDbClient();
        const analysisResultDb = new AnalysisResultStorage(ddbClient);
        
        const result = await analysisResultDb.getAnalysisResult(age, decodedSongKey);

        if (!result) {
            logger.info(`Analysis result not found for songKey: ${decodedSongKey}`, { 
                moduleName, 
                age, 
                songKey: decodedSongKey 
            });
            return NextResponse.json(
                { error: 'Analysis result not found' },
                { status: 404 }
            );
        }

        logger.info(`Successfully retrieved analysis result`, {
            moduleName,
            age,
            songKey: decodedSongKey,
            songName: result.song?.songName,
            artistName: result.song?.artistName,
        });

        return NextResponse.json({ result });

    } catch (error) {
        logger.error(`Error retrieving analysis result:`, {
            moduleName,
            error,
        });
        
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}