import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

const { mockVerify, mockSearchLyrics } = vi.hoisted(() => ({
    mockVerify: vi.fn(),
    mockSearchLyrics: vi.fn(),
}));

vi.mock('../util/altcha', () => ({ verifyAltchaSolution: mockVerify }));
vi.mock('../services/lrclib', () => ({
    LrcLibApi: { getInstance: () => ({ searchLyrics: mockSearchLyrics }) },
}));

import { searchSongHandler } from './searchSong';
import { SongSearchResult } from '../services/lrclib';

function makeEvent(body: object): APIGatewayProxyEvent {
    return { body: JSON.stringify(body), headers: {} } as APIGatewayProxyEvent;
}

function makeSong(overrides: Partial<SongSearchResult> = {}): SongSearchResult {
    return {
        id: '1',
        duration: 100,
        instrumental: false,
        name: 'Test Song',
        trackName: 'Test Song',
        artistName: 'Test Artist',
        albumName: 'Test Album',
        plainLyrics: 'Some lyrics here',
        relevance: 0,
        ...overrides,
    };
}

async function callHandler(body: object) {
    const result = await searchSongHandler(makeEvent(body));
    return { status: result.statusCode, body: JSON.parse(result.body) };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockVerify.mockResolvedValue(true);
});

describe('searchSongHandler', () => {
    describe('validation', () => {
        it('returns 400 when altchaPayload is missing', async () => {
            const { status, body } = await callHandler({ songName: 'Hello' });
            expect(status).toBe(400);
            expect(body.errors).toContain('Human verification failed');
        });

        it('returns 400 when altcha verification fails', async () => {
            mockVerify.mockResolvedValue(false);
            const { status, body } = await callHandler({ altchaPayload: 'bad', songName: 'Hello' });
            expect(status).toBe(400);
            expect(body.errors).toContain('Human verification failed');
        });

        it('returns 400 when songName is missing', async () => {
            const { status, body } = await callHandler({ altchaPayload: 'valid' });
            expect(status).toBe(400);
            expect(body.errors).toContain('Song name is required');
        });
    });

    describe('filtering', () => {
        it('excludes songs without plainLyrics', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: '1', plainLyrics: 'has lyrics' }),
                makeSong({ id: '2', plainLyrics: undefined }),
            ]);
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'Test Song' });
            expect(body.data.songs).toHaveLength(1);
            expect(body.data.songs[0].id).toBe('1');
        });

        it('deduplicates songs with the same artist and title', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: '1', trackName: 'Song A', artistName: 'Artist X' }),
                makeSong({ id: '2', trackName: 'Song A', artistName: 'Artist X' }),
                makeSong({ id: '3', trackName: 'Song A', artistName: 'Artist Y' }),
            ]);
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'Song A' });
            expect(body.data.songs).toHaveLength(2);
        });

        it('limits results to 20 songs', async () => {
            mockSearchLyrics.mockResolvedValue(
                Array.from({ length: 30 }, (_, i) => makeSong({ id: (i + 1).toString(), trackName: `Song ${i}`, artistName: `Artist ${i}` }))
            );
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'Song' });
            expect(body.data.songs).toHaveLength(20);
        });
    });

    describe('relevance sorting', () => {
        it('ranks artist+title exact match first and collapses to it alone', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: '10', trackName: 'Other Song', artistName: 'Other Artist' }),
                makeSong({ id: '20', trackName: 'Hello', artistName: 'Adele' }),
            ]);
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' });
            expect(body.data.songs).toEqual([expect.objectContaining({ id: '20' })]);
        });

        it('orders non-exact matches: title match > artist match > no match', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: '5', trackName: 'Unrelated', artistName: 'Nobody' }),
                makeSong({ id: '4', trackName: 'Unrelated', artistName: 'Adele' }),
                makeSong({ id: '3', trackName: 'Hello', artistName: 'Nobody' }),
            ]);
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' });
            expect(body.data.songs.map((s: { id: string }) => s.id)).toEqual(['3', '4', '5']);
        });

        it('matches case-insensitively and as a substring', async () => {
            mockSearchLyrics.mockResolvedValue([makeSong({ id: '1', trackName: 'HELLO World', artistName: 'ADELE Smith' })]);
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'hello', artist: 'adele' });
            expect(body.data.songs).toHaveLength(1);
        });
    });

    describe('response shape', () => {
        it('maps LrcLib fields to the response shape', async () => {
            mockSearchLyrics.mockResolvedValue([
                makeSong({ id: '42', trackName: 'My Song', artistName: 'My Artist', albumName: 'My Album', plainLyrics: 'la la la' }),
            ]);
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'My Song' });
            expect(body.data.songs[0]).toMatchObject({
                id: '42',
                title: 'My Song',
                artist: 'My Artist',
                album: 'My Album',
                lyrics: 'la la la',
                thumbnail: '',
            });
        });

        it('returns an empty songs array when no results have lyrics', async () => {
            mockSearchLyrics.mockResolvedValue([makeSong({ plainLyrics: undefined })]);
            const { body } = await callHandler({ altchaPayload: 'valid', songName: 'Anything' });
            expect(body.data.songs).toEqual([]);
        });
    });

    describe('error handling', () => {
        it('returns 500 when the LrcLib API throws', async () => {
            mockSearchLyrics.mockRejectedValue(new Error('upstream failure'));
            const { status } = await callHandler({ altchaPayload: 'valid', songName: 'Hello' });
            expect(status).toBe(500);
        });
    });
});
