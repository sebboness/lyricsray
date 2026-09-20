/**
 * Report script for analysis events. Two modes:
 *
 * Events mode (default): queries the analytics events table for individual analysis
 * events, showing timestamp, UA type, cache hit, artist, and song, sorted newest first.
 * Optionally roll up by hashed IP with --rollup-by-ip.
 *
 * Rollup mode (--source rollup): queries the daily-stats rollup table and shows
 * daily cached vs. non-cached (AI-hitting) analysis counts sorted oldest first,
 * giving a full picture of AI cost growth since recording began.
 *
 * Run from the api/ directory:
 *
 *   npx ts-node scripts/analysis-events-by-ua.ts --env prod
 *   npx ts-node scripts/analysis-events-by-ua.ts --env prod --days 14
 *   npx ts-node scripts/analysis-events-by-ua.ts --env prod --rollup-by-ip
 *   npx ts-node scripts/analysis-events-by-ua.ts --env prod --source rollup
 *
 * Required:
 *   --env dev|prod         Target environment.
 *
 * Optional:
 *   --source events|rollup Query the raw events table (default) or the daily-stats
 *                          rollup table. Rollup mode ignores --days and --rollup-by-ip.
 *   --days <n>             How many days back to query in events mode (default: 7).
 *                          Today counts as day 1. Ignored in rollup mode.
 *   --rollup-by-ip         Group events-mode results by hashed IP. Ignored in rollup mode.
 *   --region <region>      AWS region (default: us-west-2).
 *   --profile <profile>    AWS named profile to use.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// ── argument helpers ──────────────────────────────────────────────────────────

function argValue(flag: string): string | undefined {
    const i = process.argv.indexOf(flag);
    if (i !== -1 && i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--'))
        return process.argv[i + 1];
    return process.argv.find(a => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
}

const ENV          = argValue('--env');
const SOURCE       = argValue('--source') ?? 'events';
const DAYS         = parseInt(argValue('--days') ?? '7', 10);
const ROLLUP_BY_IP = process.argv.includes('--rollup-by-ip');
const REGION       = argValue('--region') ?? 'us-west-2';
const PROFILE      = argValue('--profile');

if (!ENV || !['dev', 'prod'].includes(ENV)) {
    console.error('Error: --env dev|prod is required.');
    console.error('Usage: npx ts-node scripts/analysis-events-by-ua.ts --env <dev|prod> [--source events|rollup] [--days <n>] [--rollup-by-ip] [--region <region>] [--profile <profile>]');
    process.exit(1);
}

if (!['events', 'rollup'].includes(SOURCE)) {
    console.error('Error: --source must be "events" or "rollup".');
    process.exit(1);
}

if (SOURCE === 'events' && (!Number.isFinite(DAYS) || DAYS <= 0)) {
    console.error('Error: --days must be a positive integer.');
    process.exit(1);
}

const EVENTS_TABLE = `lyricsray-${ENV}-analytics-events`;
const ROLLUP_TABLE = `lyricsray-${ENV}-daily-stats`;
const INDEX_NAME   = 'AnalyticsEventsByDate';

// ── DynamoDB client ───────────────────────────────────────────────────────────

if (PROFILE) process.env.AWS_PROFILE = PROFILE;

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

// ── types ─────────────────────────────────────────────────────────────────────

interface AnalysisEvent {
    timestamp: string;
    uaType?: string;
    cacheHit?: boolean;
    artistName?: string;
    songName?: string;
    hashedIp?: string;
}

interface IpRollup {
    hashedIp: string;
    total: number;
    person: number;
    bot: number;
    searchEngine: number;
    aiCrawler: number;
    unknown: number;
}

interface DailyStat {
    date: string;
    totalAnalyses: number;
    cacheHits: number;
    cacheMisses: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function utcDateString(daysAgo: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d.toISOString().split('T')[0];
}

async function fetchAnalysisEventsForDate(date: string): Promise<AnalysisEvent[]> {
    const events: AnalysisEvent[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
        const { Items = [], LastEvaluatedKey } = await db.send(new QueryCommand({
            TableName: EVENTS_TABLE,
            IndexName: INDEX_NAME,
            KeyConditionExpression: '#d = :date',
            FilterExpression: 'eventType = :eventType',
            ExpressionAttributeNames: { '#d': 'date', '#ts': 'timestamp' },
            ExpressionAttributeValues: { ':date': date, ':eventType': 'analysis' },
            ProjectionExpression: '#ts, uaType, cacheHit, artistName, songName, hashedIp',
            ExclusiveStartKey: lastKey,
        }));

        events.push(...(Items as AnalysisEvent[]));
        lastKey = LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return events;
}

async function fetchAllDailyStats(): Promise<DailyStat[]> {
    const rows: DailyStat[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
        const { Items = [], LastEvaluatedKey } = await db.send(new ScanCommand({
            TableName: ROLLUP_TABLE,
            ProjectionExpression: '#d, totalAnalyses, cacheHits, cacheMisses',
            ExpressionAttributeNames: { '#d': 'date' },
            ExclusiveStartKey: lastKey,
        }));

        rows.push(...(Items as DailyStat[]));
        lastKey = LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return rows;
}

function rollupByIp(events: AnalysisEvent[]): IpRollup[] {
    const map = new Map<string, IpRollup>();
    for (const e of events) {
        const key = e.hashedIp ?? '(no ip)';
        const entry = map.get(key) ?? { hashedIp: key, total: 0, person: 0, bot: 0, searchEngine: 0, aiCrawler: 0, unknown: 0 };
        entry.total++;
        const ua = e.uaType as keyof IpRollup | undefined;
        if (ua && ua in entry && ua !== 'hashedIp' && ua !== 'total') {
            (entry[ua] as number)++;
        } else {
            entry.unknown++;
        }
        map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function printEventTable(rows: AnalysisEvent[]): void {
    const cols: { key: keyof AnalysisEvent; label: string; width: number }[] = [
        { key: 'timestamp',  label: 'Timestamp',   width: 24 },
        { key: 'uaType',     label: 'UA type',     width: 12 },
        { key: 'cacheHit',   label: 'Cache',       width:  5 },
        { key: 'artistName', label: 'Artist',      width: 24 },
        { key: 'songName',   label: 'Song',        width: 28 },
        { key: 'hashedIp',   label: 'Hashed IP',   width: 16 },
    ];

    for (const col of cols) {
        for (const row of rows) {
            const val = String(row[col.key] ?? '');
            if (val.length > col.width) col.width = val.length;
        }
    }

    const header  = cols.map(c => c.label.padEnd(c.width)).join('  ');
    const divider = cols.map(c => '-'.repeat(c.width)).join('  ');

    console.log('\n' + header);
    console.log(divider);
    for (const row of rows) {
        console.log(cols.map(c => String(row[c.key] ?? '').padEnd(c.width)).join('  '));
    }
    console.log();
}

function printIpRollupTable(rows: IpRollup[]): void {
    const cols: { key: keyof IpRollup; label: string }[] = [
        { key: 'hashedIp',     label: 'Hashed IP'     },
        { key: 'total',        label: 'Total'         },
        { key: 'person',       label: 'Person'        },
        { key: 'bot',          label: 'Bot'           },
        { key: 'searchEngine', label: 'Search engine' },
        { key: 'aiCrawler',    label: 'AI crawler'    },
        { key: 'unknown',      label: 'Unknown'       },
    ];

    const widths = cols.map(col =>
        Math.max(col.label.length, ...rows.map(r => String(r[col.key]).length))
    );

    const header  = cols.map((col, i) => col.label.padEnd(widths[i])).join('  ');
    const divider = cols.map((_, i) => '-'.repeat(widths[i])).join('  ');

    console.log('\n' + header);
    console.log(divider);
    for (const row of rows) {
        console.log(cols.map((col, i) => String(row[col.key]).padEnd(widths[i])).join('  '));
    }
    console.log();
}

function printDailyRollupTable(rows: DailyStat[]): void {
    const cols: { key: keyof DailyStat; label: string }[] = [
        { key: 'date',           label: 'Date'          },
        { key: 'cacheMisses',    label: 'New (AI hits)' },
        { key: 'cacheHits',      label: 'Cached'        },
        { key: 'totalAnalyses',  label: 'Total'         },
    ];

    const widths = cols.map(col =>
        Math.max(col.label.length, ...rows.map(r => String(r[col.key] ?? 0).length))
    );

    const header  = cols.map((col, i) => col.label.padStart(widths[i])).join('  ');
    const divider = cols.map((_, i) => '-'.repeat(widths[i])).join('  ');

    console.log('\n' + header);
    console.log(divider);
    for (const row of rows) {
        console.log(cols.map((col, i) => String(row[col.key] ?? 0).padStart(widths[i])).join('  '));
    }

    const totals = rows.reduce(
        (acc, r) => ({
            cacheMisses:   acc.cacheMisses   + (r.cacheMisses   ?? 0),
            cacheHits:     acc.cacheHits     + (r.cacheHits     ?? 0),
            totalAnalyses: acc.totalAnalyses + (r.totalAnalyses ?? 0),
        }),
        { cacheMisses: 0, cacheHits: 0, totalAnalyses: 0 }
    );

    console.log(divider);
    console.log(
        'TOTAL'.padStart(widths[0]) + '  ' +
        String(totals.cacheMisses).padStart(widths[1])   + '  ' +
        String(totals.cacheHits).padStart(widths[2])     + '  ' +
        String(totals.totalAnalyses).padStart(widths[3])
    );
    console.log();
}

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n========================================');
    if (SOURCE === 'rollup') {
        console.log(`Table  : ${ROLLUP_TABLE}`);
        console.log(`Region : ${REGION}`);
        console.log(`Mode   : daily rollup (all time)`);
    } else {
        console.log(`Table  : ${EVENTS_TABLE}`);
        console.log(`Region : ${REGION}`);
        console.log(`Days   : ${DAYS}`);
        console.log(`Mode   : ${ROLLUP_BY_IP ? 'rollup by hashed IP' : 'individual events'}`);
    }
    console.log('========================================\n');

    if (SOURCE === 'rollup') {
        process.stdout.write('  Scanning daily-stats table...');
        const rows = await fetchAllDailyStats();
        process.stdout.write(` ${rows.length} rows\n`);

        rows.sort((a, b) => a.date.localeCompare(b.date));
        printDailyRollupTable(rows);
        return;
    }

    const dates = Array.from({ length: DAYS }, (_, i) => utcDateString(i));
    const allEvents: AnalysisEvent[] = [];

    for (const date of dates) {
        process.stdout.write(`  Querying ${date}...`);
        const events = await fetchAnalysisEventsForDate(date);
        allEvents.push(...events);
        process.stdout.write(` ${events.length} events\n`);
    }

    if (ROLLUP_BY_IP) {
        const rows = rollupByIp(allEvents);
        printIpRollupTable(rows);
        console.log(`Total: ${allEvents.length} analysis events across ${rows.length} unique hashed IPs\n`);
    } else {
        allEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        printEventTable(allEvents);
        console.log(`Total: ${allEvents.length} analysis events\n`);
    }
}

run().catch(err => {
    const name = (err as { name?: string }).name;
    if (name === 'ResourceNotFoundException') {
        const table = SOURCE === 'rollup' ? ROLLUP_TABLE : EVENTS_TABLE;
        console.error(`Error: table "${table}" not found in region "${REGION}".`);
        console.error('Check the region with: aws dynamodb list-tables --region <region>');
        console.error('Then re-run with: --region <correct-region>');
    } else if (name === 'UnrecognizedClientException' || name === 'InvalidSignatureException') {
        console.error('Error: AWS credentials missing or invalid.');
        console.error('Configure credentials via ~/.aws/credentials or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars.');
    } else {
        console.error('Fatal error:', err);
    }
    process.exit(1);
});
