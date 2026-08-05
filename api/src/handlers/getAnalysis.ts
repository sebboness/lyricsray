import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResultStorage } from '../storage/analysisResultStorage';
import { ApiError } from '../util/errors';
import { ok, fromError } from '../util/response';
import { logger } from '../util/logger';

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);

export async function getAnalysisHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    // Passed as a query param rather than a path param — song keys can contain "/"
    // (e.g. "artist/song/hash"), and API Gateway REST APIs decode %2F back into a
    // literal "/" before invoking the Lambda, which breaks a single :songKey path
    // segment's expected segment count. Query values aren't subject to that.
    const songKey = event.queryStringParameters?.songKey;
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
