import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../util/logger';

const tableName = `${process.env.APP_NAME!.toLowerCase()}-${process.env.ENV?.toLowerCase()}-analysis-results`;

export interface AnalysisResult {
  songKey: string;
  date: string;
  song: AnalysisSongDetails;
  recommendedAge: number;
  themes: string[];
  analysis: string;
  appropriate: number;
  entityType: string;
}

export interface AnalysisSongDetails {
  albumName?: string;
  artistName?: string;
  lyrics?: string;
  songName?: string;
  thumbnailUrl?: string;
  yearReleased?: number;
}

export type EntityType = 'ANALYSIS' | 'POPULAR';

export class AnalysisResultStorage {
  constructor(private readonly dbClient: DynamoDBDocumentClient) {}

  /**
   * Gets the analysis result for a song from storage.
   * @param songKey The unique song key
   */
  async getAnalysisResult(songKey: string): Promise<AnalysisResult | null> {
    try {
      const { Item } = await this.dbClient.send(new GetCommand({ TableName: tableName, Key: { songKey } }));
      return (Item as AnalysisResult) ?? null;
    } catch (err) {
      logger.error('getAnalysisResult failed', { err, songKey });
      throw err;
    }
  }

  /**
   * Saves the given song analysis result in storage.
   * @param analysisResult The song analysis result
   */
  async saveAnalysisResult(analysisResult: AnalysisResult): Promise<AnalysisResult> {
    try {
      await this.dbClient.send(new PutCommand({ TableName: tableName, Item: { ...analysisResult } }));
      return analysisResult;
    } catch (err) {
      logger.error('saveAnalysisResult failed', { err, songKey: analysisResult.songKey });
      throw err;
    }
  }

  /**
   * Gets the most recent analysis results using the GSI.
   * @param limit The maximum number of results to return
   * @param entityType The entity type to query for
   */
  async getRecentAnalyses(limit: number = 5, entityType: EntityType = 'ANALYSIS'): Promise<AnalysisResult[]> {
    try {
      const { Items } = await this.dbClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'RecentAnalysesIndex',
        KeyConditionExpression: 'entityType = :entityType',
        ExpressionAttributeValues: { ':entityType': entityType },
        ScanIndexForward: false,
        Limit: limit,
        ProjectionExpression: 'songKey, #dateField, song.songName, song.artistName, recommendedAge, themes, appropriate, analysis',
        ExpressionAttributeNames: { '#dateField': 'date' },
      }));
      return (Items as AnalysisResult[]) ?? [];
    } catch (err) {
      logger.error('getRecentAnalyses failed', { err, entityType });
      throw err;
    }
  }

  /**
   * Gets multiple analysis results by their songKeys using BatchGetItem.
   * @param songKeys Array of songKeys to fetch
   */
  async getBatchAnalysisResults(songKeys: string[]): Promise<AnalysisResult[]> {
    if (!songKeys || songKeys.length === 0) return [];

    if (songKeys.length > 100) {
      logger.warn(`too many songKeys requested (${songKeys.length}), limiting to 100`);
      songKeys = songKeys.slice(0, 100);
    }

    try {
      const { Responses, UnprocessedKeys } = await this.dbClient.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: songKeys.map((songKey) => ({ songKey })),
            ProjectionExpression: 'songKey, #dateField, song.songName, song.artistName, recommendedAge, themes, appropriate, analysis',
            ExpressionAttributeNames: { '#dateField': 'date' },
          },
        },
      }));

      if (UnprocessedKeys && Object.keys(UnprocessedKeys).length > 0) {
        logger.warn('some keys were unprocessed in batch get', { UnprocessedKeys });
      }

      return (Responses?.[tableName] as AnalysisResult[]) ?? [];
    } catch (err) {
      logger.error('getBatchAnalysisResults failed', { err });
      throw err;
    }
  }
}
