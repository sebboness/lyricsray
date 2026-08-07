'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

const PRESETS = [
    { label: '7d', days: 7 },
    { label: '14d', days: 14 },
    { label: '30d', days: 30 },
];

const DEFAULT_DAYS = 30;

export function DayRangeFilter() {
    const searchParams = useSearchParams();
    const current = parseInt(searchParams.get('days') ?? String(DEFAULT_DAYS), 10);
    const active = PRESETS.find((p) => p.days === current)?.days ?? DEFAULT_DAYS;

    return (
        <ToggleButtonGroup value={active} exclusive size="small" aria-label="Date range">
            {PRESETS.map(({ label, days }) => (
                <ToggleButton
                    key={days}
                    value={days}
                    component={Link}
                    href={`/admin?days=${days}`}
                    sx={{ px: 2, fontWeight: 500 }}
                >
                    {label}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
}
