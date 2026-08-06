'use client';

import { Card, CardContent, Typography } from '@mui/material';

interface StatTileProps {
    label: string;
    value: string | number;
    sub?: string;
}

export function StatTile({ label, value, sub }: StatTileProps) {
    return (
        <Card variant="outlined" sx={{ flex: 1, minWidth: 140 }}>
            <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {label}
                </Typography>
                <Typography variant="h4" component="div" fontWeight={700}>
                    {value}
                </Typography>
                {sub && (
                    <Typography variant="caption" color="text.secondary">
                        {sub}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
