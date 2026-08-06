import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { DailyStatsStorage } from '@/storage/DailyStatsStorage';

const statsStorage = new DailyStatsStorage(getDynamoDbClient());

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stats = await statsStorage.getDailyStats(30);
    return NextResponse.json({ stats });
}
