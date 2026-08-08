/**
 * Backfill script: adds the top-level `artistKey` attribute to all existing
 * analysis records that use the current 3-segment songKey format
 * (artist/song/hash). This attribute is required by the new ArtistAnalysesIndex
 * GSI. Legacy single-segment songKeys (Artist|Song#hash) are skipped.
 *
 * Run from the api/ directory after `terraform apply` has created the GSI:
 *
 *   npx ts-node scripts/backfill-artist-key.ts --env dev --dry-run
 *   npx ts-node scripts/backfill-artist-key.ts --env dev
 *   npx ts-node scripts/backfill-artist-key.ts --env prod --dry-run
 *   npx ts-node scripts/backfill-artist-key.ts --env prod
 *
 * Required:
 *   --env dev|prod       Target environment.
 *
 * Optional:
 *   --dry-run            Print what would change; make no writes.
 *   --yes                Skip the prod safety confirmation prompt.
 *   --region <region>    AWS region (default: us-west-2).
 *   --profile <profile>  AWS named profile to use.
 */

import * as readline from 'readline';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    ScanCommand,
    UpdateCommand,
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
    console.error('Usage: npx ts-node scripts/backfill-artist-key.ts --env <dev|prod> [--dry-run] [--yes] [--region <region>] [--profile <profile>]');
    process.exit(1);
}

const TABLE_NAME = `lyricsray-${ENV}-analysis-results`;

// ── DynamoDB client ───────────────────────────────────────────────────────────

if (PROFILE) process.env.AWS_PROFILE = PROFILE;

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

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

    let scanned = 0, updated = 0, skippedLegacy = 0, skippedAlready = 0, failed = 0;
    let lastKey: Record<string, unknown> | undefined;

    do {
        const { Items = [], LastEvaluatedKey } = await db.send(new ScanCommand({
            TableName: TABLE_NAME,
            ExclusiveStartKey: lastKey,
            ProjectionExpression: 'songKey, artistKey',
        }));
        lastKey = LastEvaluatedKey as Record<string, unknown> | undefined;
        scanned += Items.length;

        for (const raw of Items) {
            const item = raw as { songKey: string; artistKey?: string };
            const { songKey } = item;

            // Skip legacy single-segment keys (Artist|Song#hash — no '/')
            if (!songKey.includes('/')) {
                skippedLegacy++;
                continue;
            }

            // Skip items that already have artistKey set
            if (item.artistKey) {
                skippedAlready++;
                continue;
            }

            const artistKey = songKey.split('/')[0];
            console.log(`  SET artistKey="${artistKey}" on songKey="${songKey}"`);
            if (DRY_RUN) { updated++; continue; }

            try {
                await db.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { songKey },
                    UpdateExpression: 'SET artistKey = :artistKey',
                    ExpressionAttributeValues: { ':artistKey': artistKey },
                }));
                updated++;
            } catch (err) {
                console.error(`  ERROR updating songKey="${songKey}":`, err);
                failed++;
            }
        }

        if (lastKey) console.log(`  ... scanned ${scanned} items so far`);
    } while (lastKey);

    console.log('========================================');
    console.log(`Scanned              : ${scanned}`);
    console.log(`Updated              : ${updated}${DRY_RUN ? ' (dry run — no writes made)' : ''}`);
    console.log(`Skipped (legacy key) : ${skippedLegacy}`);
    console.log(`Skipped (has key)    : ${skippedAlready}`);
    if (failed > 0) console.error(`Failed               : ${failed}`);
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
