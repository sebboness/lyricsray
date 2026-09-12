import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildResolvedRecord, chunk, resolveNames } from './backfillSummariesLogic';
import { AnalysisResult } from '../src/storage/analysisResultStorage';

function makeRecord(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    songKey: '-/-/abc123',
    date: '2026-01-01T00:00:00.000Z',
    song: { lyrics: 'la la la' },
    recommendedAge: 13,
    themes: [],
    analysis: 'Some analysis',
    appropriate: 1,
    entityType: 'ANALYSIS',
    ...overrides,
  };
}

describe('resolveNames', () => {
  const makeSongKey = vi.fn((artistName?: string, songName?: string) => `${artistName}/${songName}/newkey`);

  beforeEach(() => {
    makeSongKey.mockClear();
  });

  it('keeps the original songKey when both names are already present and match', () => {
    const result = resolveNames('Artist/Song/abc', 'Artist', 'Song', { artistName: 'Other', songName: 'Other Song' }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(false);
    expect(result.resolvedSongKey).toBe('Artist/Song/abc');
    expect(result.resolvedArtistName).toBe('Artist');
    expect(result.resolvedSongName).toBe('Song');
    expect(makeSongKey).not.toHaveBeenCalled();
  });

  it('resolves both names from the AI and regenerates the key when neither name was stored', () => {
    const result = resolveNames('-/-/abc', undefined, undefined, { artistName: 'Taylor Swift', songName: 'Shake It Off' }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(true);
    expect(result.resolvedArtistName).toBe('Taylor Swift');
    expect(result.resolvedSongName).toBe('Shake It Off');
    expect(result.resolvedSongKey).toBe('Taylor Swift/Shake It Off/newkey');
  });

  it('fills in only the missing name and regenerates the key when the other was already stored', () => {
    const result = resolveNames('Taylor-Swift/-/abc', 'Taylor Swift', undefined, { artistName: undefined, songName: 'Shake It Off' }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(true);
    expect(result.resolvedArtistName).toBe('Taylor Swift');
    expect(result.resolvedSongName).toBe('Shake It Off');
  });

  it('does not change the key when only one of the two names resolves', () => {
    const result = resolveNames('-/-/abc', undefined, undefined, { artistName: undefined, songName: 'Two Moons' }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(false);
    expect(result.resolvedSongKey).toBe('-/-/abc');
    expect(result.resolvedArtistName).toBeUndefined();
    expect(result.resolvedSongName).toBe('Two Moons');
    expect(makeSongKey).not.toHaveBeenCalled();
  });

  it('does not change the key when neither the record nor the AI provides any names', () => {
    const result = resolveNames('-/-/abc', undefined, undefined, { artistName: undefined, songName: undefined }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(false);
    expect(result.resolvedSongKey).toBe('-/-/abc');
  });

  it('prefers the already-stored names over conflicting AI-inferred names', () => {
    const result = resolveNames('Real-Artist/Real-Song/abc', 'Real Artist', 'Real Song', { artistName: 'AI Guessed Artist', songName: 'AI Guessed Song' }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(false);
    expect(result.resolvedArtistName).toBe('Real Artist');
    expect(result.resolvedSongName).toBe('Real Song');
  });

  it('treats a stored "-" placeholder name as unset, resolving from the AI instead', () => {
    const result = resolveNames('-/-/abc', '-', '-', { artistName: 'Taylor Swift', songName: 'Shake It Off' }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(true);
    expect(result.resolvedArtistName).toBe('Taylor Swift');
    expect(result.resolvedSongName).toBe('Shake It Off');
    expect(result.resolvedSongKey).toBe('Taylor Swift/Shake It Off/newkey');
  });

  it('treats a "-" placeholder on just one side as unset while keeping the other real stored name', () => {
    const result = resolveNames('Taylor-Swift/-/abc', 'Taylor Swift', '-', { artistName: undefined, songName: 'Shake It Off' }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(true);
    expect(result.resolvedArtistName).toBe('Taylor Swift');
    expect(result.resolvedSongName).toBe('Shake It Off');
  });

  it('does not regenerate the key when both stored names are "-" and the AI cannot resolve them either', () => {
    const result = resolveNames('-/-/abc', '-', '-', { artistName: undefined, songName: undefined }, 'lyrics', makeSongKey);

    expect(result.keyChanged).toBe(false);
    expect(result.resolvedSongKey).toBe('-/-/abc');
    expect(result.resolvedArtistName).toBeUndefined();
    expect(result.resolvedSongName).toBeUndefined();
  });
});

describe('buildResolvedRecord', () => {
  it('carries over rating data and other song fields unchanged, overriding only the key, names, and backfilled fields', () => {
    const original = makeRecord({
      songKey: '-/-/abc123',
      recommendedAge: 16,
      appropriate: 2,
      analysis: 'Original long analysis text',
      themes: ['old-theme'],
      summary: undefined,
      themePercentages: undefined,
      song: { lyrics: 'la la la', albumName: 'Some Album', thumbnailUrl: 'http://thumb' },
    });

    const resolution = {
      resolvedArtistName: 'Taylor Swift',
      resolvedSongName: 'Shake It Off',
      resolvedSongKey: 'Taylor-Swift/Shake-It-Off/xyz789',
      keyChanged: true,
    };

    const analysis = {
      themes: ['pop', 'breakup'],
      summary: 'Breakup, mild language',
      themePercentages: [{ theme: 'pop', percentage: 80 }],
    };

    const result = buildResolvedRecord(original, resolution, analysis, '2026-06-15T12:00:00.000Z');

    // Overridden fields
    expect(result.songKey).toBe('Taylor-Swift/Shake-It-Off/xyz789');
    expect(result.themes).toEqual(['pop', 'breakup']);
    expect(result.summary).toBe('Breakup, mild language');
    expect(result.themePercentages).toEqual([{ theme: 'pop', percentage: 80 }]);
    expect(result.song.artistName).toBe('Taylor Swift');
    expect(result.song.songName).toBe('Shake It Off');

    // date is a NEW creation date, not carried over from the original — otherwise this
    // brand-new record would silently sort as old on the RecentAnalysesIndex GSI and
    // never show up as "recent" on the recent-searches/popular-songs pages.
    expect(result.date).toBe('2026-06-15T12:00:00.000Z');
    expect(result.date).not.toBe(original.date);

    // Untouched rating/identity fields
    expect(result.recommendedAge).toBe(16);
    expect(result.appropriate).toBe(2);
    expect(result.analysis).toBe('Original long analysis text');
    expect(result.entityType).toBe(original.entityType);

    // Other song fields preserved
    expect(result.song.lyrics).toBe('la la la');
    expect(result.song.albumName).toBe('Some Album');
    expect(result.song.thumbnailUrl).toBe('http://thumb');
  });

  it('defaults date to now (a valid, recent ISO timestamp) when no date is given', () => {
    const original = makeRecord({ date: '2020-01-01T00:00:00.000Z' });
    const resolution = { resolvedArtistName: 'A', resolvedSongName: 'S', resolvedSongKey: 'A/S/xyz', keyChanged: true };

    const before = Date.now();
    const result = buildResolvedRecord(original, resolution, { themes: [], summary: '', themePercentages: [] });
    const after = Date.now();

    const resultTime = new Date(result.date).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(before);
    expect(resultTime).toBeLessThanOrEqual(after);
  });

  it('does not mutate the original record', () => {
    const original = makeRecord({ song: { lyrics: 'la la la' } });
    const resolution = { resolvedArtistName: 'A', resolvedSongName: 'S', resolvedSongKey: 'A/S/xyz', keyChanged: true };

    buildResolvedRecord(original, resolution, { themes: ['x'], summary: 'y', themePercentages: [] });

    expect(original.songKey).toBe('-/-/abc123');
    expect(original.song.artistName).toBeUndefined();
  });
});

describe('chunk', () => {
  it('returns an empty array when given no items', () => {
    expect(chunk([], 5)).toEqual([]);
  });

  it('splits evenly when the length is a multiple of the chunk size', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it('puts the remainder in a smaller final chunk', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns a single chunk when size is larger than the array', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });
});
