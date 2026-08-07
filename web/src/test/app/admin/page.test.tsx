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
vi.mock('@/components/admin/VisitorsChart', () => ({ VisitorsChart: () => null }));
vi.mock('@/components/admin/HourlyActivityChart', () => ({ HourlyActivityChart: () => null }));
vi.mock('@/components/admin/NotFoundSongKeysTable', () => ({ NotFoundSongKeysTable: () => null }));
vi.mock('@/components/admin/DayRangeFilter', () => ({ DayRangeFilter: () => null }));
vi.mock('@/components/admin/StatTile', () => ({ StatTile: ({ label, value }: { label: string; value: string | number }) => <div>{label}: {value}</div> }));

import AdminDashboardPage from '@/app/admin/page';

const defaultProps = { searchParams: Promise.resolve({}) };

beforeEach(() => {
    vi.clearAllMocks();
    mockGetDailyStats.mockResolvedValue([]);
});

describe('AdminDashboardPage', () => {
    it('greets the user by their first name, derived from fullName', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'admin@example.com', fullName: 'Admin Person', username: 'admin' });

        render(await AdminDashboardPage(defaultProps));

        expect(screen.getByText('Welcome, Admin')).toBeInTheDocument();
    });

    it('falls back to the email local part when fullName is empty', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'zed@example.com', fullName: '', username: 'some-uuid' });

        render(await AdminDashboardPage(defaultProps));

        expect(screen.getByText('Welcome, zed')).toBeInTheDocument();
    });

    it('falls back to "there" when neither fullName nor email is available', async () => {
        mockGetSession.mockResolvedValue(null);

        render(await AdminDashboardPage(defaultProps));

        expect(screen.getByText('Welcome, there')).toBeInTheDocument();
    });

    it('renders the Stats last 24 hours heading', async () => {
        mockGetSession.mockResolvedValue(null);

        render(await AdminDashboardPage(defaultProps));

        expect(screen.getByText('Stats last 24 hours')).toBeInTheDocument();
    });

    it('fetches 30 days by default when no days param is present', async () => {
        mockGetSession.mockResolvedValue(null);

        await AdminDashboardPage(defaultProps);

        expect(mockGetDailyStats).toHaveBeenCalledWith(30);
    });

    it('fetches the requested number of days when a valid days param is given', async () => {
        mockGetSession.mockResolvedValue(null);

        await AdminDashboardPage({ searchParams: Promise.resolve({ days: '7' }) });

        expect(mockGetDailyStats).toHaveBeenCalledWith(7);
    });

    it('falls back to 30 days when an invalid days param is given', async () => {
        mockGetSession.mockResolvedValue(null);

        await AdminDashboardPage({ searchParams: Promise.resolve({ days: '999' }) });

        expect(mockGetDailyStats).toHaveBeenCalledWith(30);
    });
});
