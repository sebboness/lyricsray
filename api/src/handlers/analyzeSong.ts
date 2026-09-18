import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import moment from 'moment';
import { verifyAltchaSolution } from '../util/altcha';
import { makeSongKey } from '../util/songKey';
import { AnalysisResult, AnalysisResultStorage } from '../storage/analysisResultStorage';
import { AiClient } from '../services/aiClient';
import { RateLimiter } from '../services/rateLimiter';
import { getBotRateLimitConfig } from '../config/rateLimitConfig';
import { getDynamoDbClient } from '../storage/dynamodb';
import { getClientIp } from '../util/request';
import { hashIp } from '../util/hash';
import { ApiError } from '../util/errors';
import { ok, tooManyRequests, fromError } from '../util/response';
import { logger } from '../util/logger';

const LYRICS_MAX_LENGTH = 4500;

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);
const rateLimiter = new RateLimiter(ddbClient);
const botRateLimiter = new RateLimiter(ddbClient, getBotRateLimitConfig());
const aiClient = new AiClient(process.env.ANTHROPIC_MODEL!, process.env.ANTHROPIC_API_KEY!);

interface AnalyzeSongRequest {
  altchaPayload: string;
  lyrics: string;
  albumName?: string;
  songName?: string;
  artistName?: string;
  uaType?: string;
}

/**
 * Cleans up lyrics by trimming the string, removing any html elements, and removing any "[" and "]" groups.
 */
const cleanUpLyrics = (lyrics?: string): string => {
  if (!lyrics) return '';
  return lyrics.trim().replace(/(<[^>]*>)|(\[[^\]]*\])/g, '');
};

const tryParseInt = (value: any, defaultValue: number = 0): number => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export async function analyzeSongHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: AnalyzeSongRequest = JSON.parse(event.body || '{}');
    const { albumName, altchaPayload, songName, artistName, uaType } = body;
    let { lyrics } = body;

    if (!altchaPayload || !(await verifyAltchaSolution(altchaPayload))) {
      throw ApiError.badRequest('Human verification failed');
    }

    lyrics = cleanUpLyrics(lyrics);

    if (!lyrics) {
      throw ApiError.badRequest('Lyrics are required');
    }

    if (lyrics.length > LYRICS_MAX_LENGTH) {
      lyrics = lyrics.substring(0, LYRICS_MAX_LENGTH);
    }

    // Try to get analysis from storage if it was previously analyzed
    const songKey = makeSongKey(artistName, songName, lyrics);
    let song: AnalysisResult | null = null;

    try {
      song = await analysisResultDb.getAnalysisResult(songKey);
      logger.info(song ? 'retrieved existing analysis result from storage' : 'analysis result not found in storage', {
        artistName,
        songName,
        songKey,
      });
    } catch (err) {
      logger.error('error occurred while retrieving analysis result from storage', { artistName, songName, songKey, err });
    }

    if (song != null) {
      return ok({
        appropriate: song.appropriate,
        analysis: song.analysis,
        recommendedAge: song.recommendedAge.toString(),
        themes: song.themes || [],
        summary: song.summary || '',
        themePercentages: song.themePercentages || [],
        songKey,
        cacheHit: true,
      }, origin);
    }

    const clientIp = getClientIp(event);
    const isNonPerson = uaType && uaType !== 'person';
    const limiter = isNonPerson ? botRateLimiter : rateLimiter;
    const rateLimitResult = await limiter.checkAndIncrementRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      logger.warn('rate limit exceeded', {
        hashedIp: hashIp(clientIp),
        reason: rateLimitResult.reason,
        retryAfter: rateLimitResult.retryAfter,
      });

      return tooManyRequests(
        ApiError.tooManyRequests(rateLimitResult.reason || 'Rate limit exceeded'),
        origin,
        {
          'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
          'X-RateLimit-Remaining-Hourly': rateLimitResult.remaining.hourly.toString(),
          'X-RateLimit-Remaining-Daily': rateLimitResult.remaining.daily.toString(),
          'X-RateLimit-Limit-Type': rateLimitResult.limitType ?? 'ip',
        },
      );
    }

    // Get an estimate prior to analyzing with AI
    const prompt = aiClient.getLyricsPrompt(lyrics);
    const estimateTokensIn = await aiClient.getTokenInputEstimate(prompt);
    logger.info('estimated token input for prompt', { estimateTokensIn });

    // Analyze lyrics with AI
    const analysis = await aiClient.analyzeLyrics(lyrics);
    analysis.appropriate = tryParseInt(analysis.appropriate);

    // Use AI-inferred artist/song names only when the request was lyrics-only
    const resolvedArtistName = artistName || analysis.artistName;
    const resolvedSongName = songName || analysis.songName;

    if (!artistName && !songName)
      logger.info('ai name inference for lyrics-only request', {
        artistName: analysis.artistName ?? null,
        songName: analysis.songName ?? null,
        bothResolved: !!analysis.artistName && !!analysis.songName,
      });

    // Re-generate the key only when both names are resolved — a partial key (one placeholder '-')
    // is not addressable by the artist page and not worth overwriting the original.
    const bothNamesResolved = !!resolvedArtistName && !!resolvedSongName;
    const resolvedSongKey = (bothNamesResolved && (resolvedArtistName !== artistName || resolvedSongName !== songName))
      ? makeSongKey(resolvedArtistName, resolvedSongName, lyrics)
      : songKey;

    // For lyrics-only submissions, check if any analysis for the same artist+song already exists.
    // Uses prefix matching on the GSI (same approach as the 2-segment URL lookup) so that minor
    // lyric variations — which produce a different hash — still resolve to the existing record.
    if (!artistName && !songName && resolvedSongKey !== songKey) {
      try {
        const resolvedArtistKey = resolvedSongKey.split('/')[0];
        const resolvedSongPrefix = resolvedSongKey.split('/').slice(0, 2).join('/');
        const artistResults = await analysisResultDb.getAnalysesByArtist(resolvedArtistKey, 100);
        const existing = artistResults.find(item => item.songKey.startsWith(resolvedSongPrefix + '/'));
        if (existing) {
          logger.info('found existing analysis for resolved artist+song', { resolvedArtistKey, resolvedSongPrefix });
          return ok({
            appropriate: existing.appropriate,
            analysis: existing.analysis,
            recommendedAge: existing.recommendedAge.toString(),
            themes: existing.themes || [],
            summary: existing.summary || '',
            themePercentages: existing.themePercentages || [],
            songKey: existing.songKey,
            cacheHit: true,
          }, origin);
        }
      } catch (err) {
        logger.error('error checking storage for resolved artist+song', { resolvedSongKey, err });
      }
    }

    const analysisResult: AnalysisResult = {
      appropriate: analysis.appropriate,
      analysis: analysis.analysis,
      recommendedAge: analysis.recommendedAge,
      themes: analysis.themes || [],
      summary: analysis.summary || '',
      themePercentages: analysis.themePercentages || [],
      date: moment.utc().toISOString(),
      songKey: resolvedSongKey,
      entityType: 'ANALYSIS',
      song: {
        albumName,
        artistName: resolvedArtistName,
        lyrics,
        songName: resolvedSongName,
        thumbnailUrl: undefined,
        yearReleased: undefined,
      },
    };

    try {
      await analysisResultDb.saveAnalysisResult(analysisResult);
      logger.info('analysis result saved to storage', { artistName: resolvedArtistName, songName: resolvedSongName, resolvedSongKey });
    } catch (err) {
      logger.error('failed to save analysis result to storage', { artistName: resolvedArtistName, songName: resolvedSongName, err });
    }

    return ok({
      appropriate: analysis.appropriate,
      analysis: analysis.analysis,
      recommendedAge: analysis.recommendedAge.toString(),
      themes: analysis.themes || [],
      summary: analysis.summary || '',
      themePercentages: analysis.themePercentages || [],
      songKey: resolvedSongKey,
      cacheHit: false,
    }, origin, {
      'X-RateLimit-Remaining-Hourly': rateLimitResult.remaining.hourly.toString(),
      'X-RateLimit-Remaining-Daily': rateLimitResult.remaining.daily.toString(),
    });
  } catch (error) {
    logger.error('error analyzing song', { error });
    return fromError(error, origin);
  }
}
