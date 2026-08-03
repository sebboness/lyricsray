import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResultStorage } from '../storage/analysisResultStorage';
import { ApiError } from '../util/errors';
import { ok, fromError } from '../util/response';
import { logger } from '../util/logger';

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);

export async function getAnalysisHandler(event: APIGatewayProxyEvent, params: Record<string, string>): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const { songKey } = params;
    if (!songKey) {
      throw ApiError.badRequest('songKey parameter is required');
    }

    const result = await analysisResultDb.getAnalysisResult(songKey);

    if (!result) {
      throw ApiError.notFound('Analysis result');
    }

    logger.info('retrieved analysis result', { songKey, songName: result.song?.songName, artistName: result.song?.artistName });

    return ok({ result }, origin);
  } catch (err) {
    return fromError(err, origin);
  }
}
