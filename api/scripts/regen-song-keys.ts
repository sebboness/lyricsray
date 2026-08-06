/**
 * Migration script: regenerates songKey for all analysis records.
 *
 * Because DynamoDB primary keys are immutable, each migration is:
 *   1. PutItem with new songKey (conditional: new key must not already exist)
 *   2. DeleteItem with old songKey
 *
 * Records are skipped when:
 *   - Both artistName and songName are absent (lyrics-only analyses)
 *   - lyrics are absent (can't recompute the hash without them)
 *   - The recomputed key already matches the stored key (no change needed)
 *
 * Run from the api/ directory:
 *
 *   npx ts-node scripts/regen-song-keys.ts --env dev --dry-run
 *   npx ts-node scripts/regen-song-keys.ts --env dev
 *   npx ts-node scripts/regen-song-keys.ts --env prod --dry-run
 *   npx ts-node scripts/regen-song-keys.ts --env prod
 *
 * Required:
 *   --env dev|prod       Target environment.
 *
 * Optional:
 *   --dry-run            Print what would change; make no writes.
 *   --yes                Skip the prod safety confirmation prompt.
 *   --region <region>    AWS region (default: us-west-2).
 *   --profile <profile>  AWS named profile to use.
 *
 * AWS credentials are resolved from the standard chain:
 *   ~/.aws/credentials, AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars, etc.
 */

import crypto from 'crypto';
import * as readline from 'readline';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

// ── argument helpers ──────────────────────────────────────────────────────────

function argValue(flag: string): string | undefined {
    const i = process.argv.indexOf(flag);
    if (i !== -1 && i + 1 < process.argv.length && !process.argv[i + 1].startsWith('--'))
        return process.argv[i + 1];
    return process.argv.find(a => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
}

const ENV     = argValue('--env');
const REGION  = argValue('--region') ?? 'us-west-2';
const PROFILE = argValue('--profile');
const DRY_RUN = process.argv.includes('--dry-run');
const YES     = process.argv.includes('--yes');

if (!ENV || !['dev', 'prod'].includes(ENV)) {
    console.error('Error: --env dev|prod is required.');
    console.error('Usage: npx ts-node scripts/regen-song-keys.ts --env <dev|prod> [--dry-run] [--yes] [--region <region>] [--profile <profile>]');
    process.exit(1);
}

const TABLE_NAME = `lyricsray-${ENV}-analysis-results`;

// ── key generation (mirrors src/util/songKey.ts exactly) ─────────────────────

const encodeUri = (s: string) => encodeURIComponent(s).replace(/(%20)+/g, '-');

function makeKey(input: string, prefix = 'K'): string {
    return prefix + crypto.createHash('sha1').update(input).digest('hex').slice(0, 24);
}

function makeSongKey(artistName: string | undefined, songName: string | undefined, lyrics: string): string {
    const artistPart = artistName ? encodeUri(artistName.slice(0, 50).trim()) : '-';
    const songPart   = songName   ? encodeUri(songName.slice(0, 50).trim())   : '-';
    return makeKey(lyrics, `${artistPart}/${songPart}/`).replace(/\s+/g, '-');
}

// ── DynamoDB client ───────────────────────────────────────────────────────────

if (PROFILE) process.env.AWS_PROFILE = PROFILE;

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

// ── types ─────────────────────────────────────────────────────────────────────

interface AnalysisRecord {
    songKey: string;
    song?: {
        artistName?: string;
        songName?: string;
        lyrics?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

// ── confirmation prompt ───────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, answer => { rl.close(); resolve(answer.trim().toLowerCase() === 'yes'); });
    });
}

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n========================================');
    console.log(`Table   : ${TABLE_NAME}`);
    console.log(`Region  : ${REGION}`);
    console.log(`Mode    : ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
    console.log('========================================\n');

    if (ENV === 'prod' && !DRY_RUN && !YES) {
        const ok = await confirm('About to WRITE to PRODUCTION. Type "yes" to continue: ');
        if (!ok) { console.log('Aborted.'); process.exit(0); }
        console.log();
    }

    let scanned = 0, toMigrate = 0, migrated = 0;
    let skippedNoName = 0, skippedNoLyrics = 0, skippedNoChange = 0, failed = 0;
    let lastKey: Record<string, unknown> | undefined;

    do {
        const { Items = [], LastEvaluatedKey } = await db.send(new ScanCommand({
            TableName: TABLE_NAME,
            ExclusiveStartKey: lastKey,
        }));
        lastKey = LastEvaluatedKey as Record<string, unknown> | undefined;
        scanned += Items.length;

        for (const raw of Items) {
            const item       = raw as AnalysisRecord;
            const oldKey     = item.songKey;
            const artistName = item.song?.artistName?.trim() || undefined;
            const songName   = item.song?.songName?.trim()   || undefined;
            const lyrics     = item.song?.lyrics?.trim()     || '';

            if (!artistName && !songName) { skippedNoName++; continue; }
            if (!lyrics) {
                console.warn(`  SKIP (no lyrics stored): ${oldKey}`);
                skippedNoLyrics++;
                continue;
            }

            const newKey = makeSongKey(artistName, songName, lyrics);
            if (newKey === oldKey) { skippedNoChange++; continue; }

            toMigrate++;
            console.log(`  OLD: ${oldKey}`);
            console.log(`  NEW: ${newKey}\n`);
            if (DRY_RUN) continue;

            try {
                await db.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: { ...item, songKey: newKey },
                    ConditionExpression: 'attribute_not_exists(songKey)',
                }));
            } catch (err: unknown) {
                const name = (err as { name?: string }).name;
                if (name !== 'ConditionalCheckFailedException') {
                    console.error(`  ERROR during Put for ${oldKey}:`, err);
                    failed++;
                    continue;
                }
                // New key already exists (song re-analyzed after format change).
                // Fall through to delete the now-duplicate old key.
                console.log(`  INFO: new key already exists, cleaning up old key.`);
            }

            try {
                await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { songKey: oldKey } }));
                migrated++;
            } catch (err: unknown) {
                console.error(`  ERROR during Delete for ${oldKey} (new key written; old is now a duplicate):`, err);
                failed++;
            }
        }

        if (lastKey) console.log(`  ... scanned ${scanned} items so far`);
    } while (lastKey);

    console.log('========================================');
    console.log(`Scanned             : ${scanned}`);
    console.log(`Needs migration     : ${toMigrate}`);
    console.log(`Migrated            : ${migrated}${DRY_RUN ? ' (dry run — no writes made)' : ''}`);
    console.log(`Skipped (no change) : ${skippedNoChange}`);
    console.log(`Skipped (no name)   : ${skippedNoName}`);
    console.log(`Skipped (no lyrics) : ${skippedNoLyrics}`);
    if (failed > 0) console.error(`Failed              : ${failed}`);
    console.log('========================================\n');

    if (failed > 0) process.exit(1);
}

run().catch(err => {
    const name = (err as { name?: string }).name;
    if (name === 'ResourceNotFoundException') {
        console.error(`Error: table "${TABLE_NAME}" not found in region "${REGION}".`);
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
