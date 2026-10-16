import { AnalysisResult } from '@/storage/AnalysisResultStorage';
import { apiGetPublic, ApiRequestError } from '@/lib/api';
import { logger } from '@/logger/logger';

/** Fetches a stored analysis by song key; returns null when missing or the lookup fails. */
export async function fetchAnalysisResult(songKey: string): Promise<AnalysisResult | null> {
    try {
        const { data } = await apiGetPublic<{ result: AnalysisResult }>(`/v1/analyze-song?songKey=${encodeURIComponent(songKey)}`);
        return data.result ?? null;
    } catch (error) {
        if (error instanceof ApiRequestError && error.statusCode === 404) return null;
        logger.error('Error fetching analysis result:', error);
        return null;
    }
}
