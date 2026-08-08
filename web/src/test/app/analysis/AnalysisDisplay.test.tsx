import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalysisDisplay } from '@/app/analysis/[artistName]/[songName]/[hash]/AnalysisDisplay';
import { AnalysisResult } from '@/storage/AnalysisResultStorage';

function buildResult(appropriate: number): AnalysisResult {
    return {
        songKey: 'Guster/Terrified/abc123',
        date: '2026-01-01T00:00:00.000Z',
        song: { songName: 'Terrified', artistName: 'Guster', lyrics: 'some lyrics here' },
        recommendedAge: 13,
        themes: [],
        analysis: 'Some analysis text',
        appropriate,
        entityType: 'song',
    } as AnalysisResult;
}

beforeEach(() => {
    localStorage.clear();
});

describe('AnalysisDisplay lyrics gating', () => {
    it('shows the mature content gate, and keeps real lyrics out of the DOM, when appropriate === 3', async () => {
        render(<AnalysisDisplay result={buildResult(3)} />);

        await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
        expect(screen.queryByText('some lyrics here')).not.toBeInTheDocument();
    });

    it('does not gate lyrics when appropriate is 1', async () => {
        render(<AnalysisDisplay result={buildResult(1)} />);

        expect(screen.getByText('some lyrics here')).toBeInTheDocument();
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('does not gate lyrics when appropriate is 2', async () => {
        render(<AnalysisDisplay result={buildResult(2)} />);

        expect(screen.getByText('some lyrics here')).toBeInTheDocument();
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
});
