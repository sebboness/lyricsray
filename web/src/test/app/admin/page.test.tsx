import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockGetSession, mockGetDailyStats } = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockGetDailyStats: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ getSession: mockGetSession }));
vi.mock('@/storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));
vi.mock('@/storage/DailyStatsStorage', () => ({
    DailyStatsStorage: vi.fn().mockImplementation(() => ({
        getDailyStats: mockGetDailyStats,
    })),
}));
vi.mock('@/components/admin/AnalysisChart', () => ({ AnalysisChart: () => null }));
vi.mock('@/components/admin/UaBreakdownChart', () => ({ UaBreakdownChart: () => null }));
vi.mock('@/components/admin/TopSongsTable', () => ({ TopSongsTable: () => null }));
vi.mock('@/components/admin/StatTile', () => ({ StatTile: ({ label, value }: { label: string; value: string | number }) => <div>{label}: {value}</div> }));

import AdminDashboardPage from '@/app/admin/page';

beforeEach(() => {
    vi.clearAllMocks();
    mockGetDailyStats.mockResolvedValue([]);
});

describe('AdminDashboardPage', () => {
    it('greets the user by their first name, derived from fullName', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'admin@example.com', fullName: 'Admin Person', username: 'admin' });

        render(await AdminDashboardPage());

        expect(screen.getByText('Welcome, Admin')).toBeInTheDocument();
    });

    it('falls back to the email local part when fullName is empty', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'zed@example.com', fullName: '', username: 'some-uuid' });

        render(await AdminDashboardPage());

        expect(screen.getByText('Welcome, zed')).toBeInTheDocument();
    });

    it('falls back to "there" when neither fullName nor email is available', async () => {
        mockGetSession.mockResolvedValue(null);

        render(await AdminDashboardPage());

        expect(screen.getByText('Welcome, there')).toBeInTheDocument();
    });
});
