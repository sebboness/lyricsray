import { AnalysisResult } from '../src/storage/analysisResultStorage';
import { BatchLyricsAnalysis } from '../src/services/aiClient';

export interface NameResolution {
  resolvedArtistName?: string;
  resolvedSongName?: string;
  resolvedSongKey: string;
  keyChanged: boolean;
}

/**
 * makeSongKey (src/util/songKey.ts) encodes a missing artist/song name as the literal
 * '-' segment. That placeholder is only meant for the songKey string, but some stored
 * records have it as the actual song.artistName/song.songName value too (a lyrics-only
 * submission whose name was never resolved). Treat it the same as unset here, so it
 * doesn't get treated as a real, already-known name.
 */
function normalizeStoredName(name: string | undefined): string | undefined {
  const trimmed = name?.trim();
  return trimmed && trimmed !== '-' ? trimmed : undefined;
}

/**
 * Resolves artist/song names the same way analyzeSongHandler does: prefer the name
 * already stored on the record, fall back to what the AI inferred this run. If both
 * names resolve and differ from what was stored, computes the songKey they'd be saved
 * under; otherwise the original songKey is unchanged.
 */
export function resolveNames(
  originalSongKey: string,
  existingArtistName: string | undefined,
  existingSongName: string | undefined,
  analysis: Pick<BatchLyricsAnalysis, 'artistName' | 'songName'>,
  lyrics: string,
  makeSongKey: (artistName: string | undefined, songName: string | undefined, lyrics: string) => string,
): NameResolution {
  const knownArtistName = normalizeStoredName(existingArtistName);
  const knownSongName = normalizeStoredName(existingSongName);

  const resolvedArtistName = knownArtistName || analysis.artistName;
  const resolvedSongName = knownSongName || analysis.songName;

  const bothNamesResolved = !!resolvedArtistName && !!resolvedSongName;
  const keyChanged = bothNamesResolved && (resolvedArtistName !== knownArtistName || resolvedSongName !== knownSongName);

  return {
    resolvedArtistName,
    resolvedSongName,
    resolvedSongKey: keyChanged ? makeSongKey(resolvedArtistName, resolvedSongName, lyrics) : originalSongKey,
    keyChanged,
  };
}

/**
 * Builds the second, resolved-name record to save alongside the original — same rating
 * data (appropriate/recommendedAge/analysis/date/lyrics) as the original, but with the
 * resolved names, resolved songKey, and the freshly backfilled themes/summary/themePercentages.
 */
export function buildResolvedRecord(
  original: AnalysisResult,
  resolution: NameResolution,
  analysis: Pick<BatchLyricsAnalysis, 'themes' | 'summary' | 'themePercentages'>,
): AnalysisResult {
  return {
    ...original,
    songKey: resolution.resolvedSongKey,
    themes: analysis.themes,
    summary: analysis.summary,
    themePercentages: analysis.themePercentages,
    song: {
      ...original.song,
      artistName: resolution.resolvedArtistName,
      songName: resolution.resolvedSongName,
    },
  };
}

/**
 * Splits an array into consecutive chunks of at most `size` items each.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
