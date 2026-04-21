import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockVerify, mockSearchLyrics } = vi.hoisted(() => ({
    mockVerify: vi.fn(),
    mockSearchLyrics: vi.fn(),
}));

vi.mock('@/logger/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/util/altcha', () => ({
    verifyAltchaSolution: mockVerify,
}));

vi.mock('@/services/lrclib', () => ({
    LrcLibApi: {
        getInstance: () => ({ searchLyrics: mockSearchLyrics }),
    },
}));

import { POST } from '@/app/api/search-song/route';
import { SongSearchResult } from '@/services/lrclib';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/search-song', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

function makeSong(overrides: {
    id?: string;
    trackName?: string;
    artistName?: string;
    albumName?: string;
    plainLyrics?: string;
    duration?: number;
    instrumental?: boolean;
    name?: string;
} = {}): SongSearchResult {
    return {
        id: "1",
        duration: 100,
        instrumental: false,
        name: 'Test Song',
        trackName: 'Test Song',
        artistName: 'Test Artist',
        albumName: 'Test Album',
        plainLyrics: 'Some lyrics here',
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
    mockVerify.mockResolvedValue(true);
});

describe('POST /api/search-song', () => {

    // ── Validation ────────────────────────────────────────────────────────────

    describe('validation', () => {
        it('returns 400 when altchaPayload is missing', async () => {
            const res = await POST(makeRequest({ songName: 'Hello' }));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Human verification failed');
        });

        it('returns 400 when altcha verification fails', async () => {
            mockVerify.mockResolvedValue(false);
            const res = await POST(makeRequest({ altchaPayload: 'bad', songName: 'Hello' }));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Human verification failed');
        });

        it('returns 400 when songName is missing', async () => {
            const res = await POST(makeRequest({ altchaPayload: 'valid' }));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Song name is required');
        });

        it('returns 400 when songName is whitespace only', async () => {
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: '   ' }));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Song name is required');
        });
    });

    // ── Filtering ─────────────────────────────────────────────────────────────

    describe('filtering', () => {
        it('excludes songs without plainLyrics', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "1", plainLyrics: 'has lyrics' }),
                makeSong({ id: "2", plainLyrics: undefined }),
                makeSong({ id: "3", plainLyrics: '' }),
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Test Song' }));
            const body = await res.json();
            expect(body.songs).toHaveLength(1);
            expect(body.songs[0].id).toBe('1');
        });

        it('deduplicates songs with the same artist and title', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "1", trackName: 'Song A', artistName: 'Artist X' }),
                makeSong({ id: "2", trackName: 'Song A', artistName: 'Artist X' }),
                makeSong({ id: "3", trackName: 'Song A', artistName: 'Artist Y' }),
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Song A' }));
            const body = await res.json();
            expect(body.songs).toHaveLength(2);
        });

        it('limits results to 20 songs', async () => {
            mockSearchLyrics.mockResolvedValue(
                Array.from({ length: 30 }, (_, i) =>
                    makeSong({ id: (i + 1).toString(), trackName: `Song ${i}`, artistName: `Artist ${i}` })
                )
            );
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Song' }));
            const body = await res.json();
            expect(body.songs).toHaveLength(20);
        });
    });

    // ── Sorting / Relevance ───────────────────────────────────────────────────

    describe('relevance sorting', () => {
        it('ranks artist+title match (score 1) first', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "10", trackName: 'Other Song', artistName: 'Other Artist' }),  // score 4
                makeSong({ id: "20", trackName: 'Hello', artistName: 'Adele' }),              // score 1
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' }));
            const body = await res.json();
            expect(body.songs[0].id).toBe('20');
        });

        it('ranks title-only match (score 2) above artist-only match (score 3)', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "1", trackName: 'Other Song', artistName: 'Adele' }),   // score 3
                makeSong({ id: "2", trackName: 'Hello', artistName: 'Other Artist' }), // score 2
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' }));
            const body = await res.json();
            expect(body.songs[0].id).toBe('2');
            expect(body.songs[1].id).toBe('1');
        });

        it('ranks artist-only match (score 3) above no match (score 4)', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "1", trackName: 'Random Song', artistName: 'Random Artist' }), // score 4
                makeSong({ id: "2", trackName: 'Another Song', artistName: 'Adele' }),        // score 3
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' }));
            const body = await res.json();
            expect(body.songs[0].id).toBe('2');
        });

        it('uses full order: score 1 > 2 > 3 > 4', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "4", trackName: 'Unrelated', artistName: 'Nobody' }),  // score 4
                makeSong({ id: "3", trackName: 'Unrelated', artistName: 'Adele' }),   // score 3
                makeSong({ id: "2", trackName: 'Hello', artistName: 'Nobody' }),      // score 2
                makeSong({ id: "1", trackName: 'Hello', artistName: 'Adele' }),       // score 1
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' }));
            const body = await res.json();
            expect(body.songs.map((s: { id: string }) => s.id)).toEqual(['1', '2', '3', '4']);
        });

        it('matches case-insensitively', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "1", trackName: 'HELLO', artistName: 'ADELE' }),
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'hello', artist: 'adele' }));
            const body = await res.json();
            expect(body.songs).toHaveLength(1);
            expect(body.songs[0].id).toBe('1');
        });

        it('matches when query is a substring of track/artist name', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "1", trackName: 'Hello World', artistName: 'Adele Smith' }),
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' }));
            const body = await res.json();
            expect(body.songs[0].id).toBe('1');
        });

        it('sorts before slicing so top 20 are the most relevant', async () => {
            // 11 no-match filler songs + 1 perfect match — the perfect match must survive the slice
            mockSearchLyrics.mockResolvedValue([
                ...Array.from({ length: 21 }, (_, i) =>
                    makeSong({ id: (i + 20).toString(), trackName: `Filler ${i}`, artistName: `Filler Artist ${i}` })
                ),
                makeSong({ id: "99", trackName: 'Hello', artistName: 'Adele' }), // score 1
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' }));
            const body = await res.json();
            expect(body.songs[0].id).toBe('99');
            expect(body.songs).toHaveLength(20);
        });

        it('handles missing artist query gracefully', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "1", trackName: 'Hello', artistName: 'Adele' }),
                makeSong({ id: "2", trackName: 'Unrelated', artistName: 'Nobody' }),
            ]);
            // No artist provided — title match should still rank above no match
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello' }));
            const body = await res.json();
            expect(body.songs[0].id).toBe('1');
        });
    });

    // ── Response Shape ────────────────────────────────────────────────────────

    describe('response shape', () => {
        it('maps LrcLib fields to SongSearchResult correctly', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: "42", trackName: 'My Song', artistName: 'My Artist', albumName: 'My Album', plainLyrics: 'la la la' }),
            ]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'My Song' }));
            const body = await res.json();
            expect(body.songs[0]).toMatchObject({
                id: '42',
                title: 'My Song',
                artist: 'My Artist',
                album: 'My Album',
                lyrics: 'la la la',
                thumbnail: '',
            });
        });

        it('returns empty songs array when no results have lyrics', async () => {
            mockSearchLyrics.mockResolvedValue([makeSong({ plainLyrics: undefined })]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Anything' }));
            const body = await res.json();
            expect(body.songs).toEqual([]);
        });

        it('returns empty songs array when API returns no results', async () => {
            mockSearchLyrics.mockResolvedValue([]);
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Anything' }));
            const body = await res.json();
            expect(body.songs).toEqual([]);
        });
    });

    // ── Error Handling ────────────────────────────────────────────────────────

    describe('error handling', () => {
        it('returns 500 when the LrcLib API throws', async () => {
            mockSearchLyrics.mockRejectedValue(new Error('upstream failure'));
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello' }));
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe('Failed to search songs. Please try pasting lyrics directly.');
        });

        it('returns 500 when altcha throws unexpectedly', async () => {
            mockVerify.mockRejectedValue(new Error('altcha crash'));
            const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello' }));
            expect(res.status).toBe(500);
        });
    });
});
