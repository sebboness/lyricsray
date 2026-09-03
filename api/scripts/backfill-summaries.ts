/**
 * Backfill script: re-analyzes lyrics for existing analysis records that are missing
 * `summary`, or have no `themes` at all (very old records that predate themes), and
 * fills those fields in — plus `themePercentages`. `appropriate`, `recommendedAge`, and
 * `analysis` on the existing record are always left untouched, so this never silently
 * changes an already-served rating.
 *
 * Records are processed in batches: each Anthropic call sends up to --batch-size songs'
 * lyrics at once (each tagged with its songKey as an id) and gets back one JSON array of
 * { id, themes, summary, themePercentages, artistName, songName } — no age rating or long
 * analysis text. Results are matched back to songs by that echoed id rather than by array
 * position, so a reordered, missing, or duplicate-id response can't silently misalign a
 * result onto the wrong song — the mismatched song is just skipped and picked up next run.
 * This is far cheaper than one call per song. See AiClient.getBatchLyricsPrompt /
 * analyzeLyricsBatch (api/src/services/aiClient.ts).
 *
 * If a record was saved without an artist/song name (or only one of them) and the batch
 * response resolves both — the same artistName/songName inference logic used by the live
 * /v1/analyze-song endpoint (see analyzeSong.ts) — a SECOND record is created under the
 * resolved songKey (matching how the live endpoint would key it), with resolved names and
 * the fresh themes/summary/themePercentages, but otherwise identical rating data
 * (appropriate/recommendedAge/analysis) copied from the original. The original record is
 * kept as-is (beyond the themes/summary/themePercentages backfill), so any existing link
 * to it keeps working. If a record already exists at the resolved songKey, no duplicate
 * is created.
 *
 * Each batch costs a real Anthropic API call, so runs are capped by --limit (total
 * records, across all batches) and paced by --delay-ms between batches, to control cost
 * and avoid bursting the API. This calls the Anthropic API directly (via AiClient) rather
 * than the public /v1/analyze-song endpoint, so it is NOT subject to the app's
 * RateLimiter (per-IP/global daily+hourly+burst limits) — that limiter exists to protect
 * the public endpoint from end users, not this admin job.
 *
 * Run from the api/ directory:
 *
 *   npx ts-node scripts/backfill-summaries.ts --env dev --dry-run
 *   npx ts-node scripts/backfill-summaries.ts --env dev --dry-run-writes
 *   npx ts-node scripts/backfill-summaries.ts --env dev --limit 100
 *   npx ts-node scripts/backfill-summaries.ts --env prod --limit 100 --batch-size 10 --delay-ms 2000
 *   npx ts-node scripts/backfill-summaries.ts --env prod --limit 100 --yes
 *
 * Required:
 *   --env dev|prod       Target environment.
 *
 * Optional:
 *   --limit <n>          Max number of legacy records to re-analyze this run (default: 100).
 *   --batch-size <n>      Songs sent to Claude per Anthropic call (default: 10).
 *   --delay-ms <n>        Pause between batch calls, in milliseconds (default: 1000).
 *   --dry-run            List the songKeys that would be processed; makes no Anthropic
 *                        or DynamoDB calls, so it costs nothing. (Name resolution and
 *                        exact batch grouping can't be previewed here, since that
 *                        depends on the AI's response.) Mutually exclusive with --dry-run-writes.
 *   --dry-run-writes     Runs the real Anthropic batch calls (so it costs the same as a live
 *                        run) and logs exactly what each UPDATE/CREATE would do, but skips
 *                        every DynamoDB write — use this to inspect the actual themes/summary/
 *                        themePercentages/name-resolution Claude would produce before trusting
 *                        it with real writes. Mutually exclusive with --dry-run.
 *   --yes                Skip the prod safety confirmation prompt.
 *   --region <region>    AWS region (default: us-west-2).
 */

import * as readline from 'readline';
import * as path from 'path';
import * as dotenv from 'dotenv';
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

const ENV = argValue('--env');

// AnalysisResultStorage (imported below) reads its own table name from process.env.ENV at
// import time, independent of this script's --env flag. Set it explicitly here, BEFORE
// dotenv.config() and BEFORE that import, so both this script's own TABLE_NAME (derived from
// --env below) and AnalysisResultStorage's internal table name agree — otherwise the scan
// (which uses this script's TABLE_NAME) and every getAnalysisResult/saveAnalysisResult call
// (which used AnalysisResultStorage's table name, silently pinned to api/.env.local's ENV)
// would target two different tables, and every "existing record" lookup would come back null.
// dotenv does not override an already-set process.env var, so this value wins.
if (ENV === 'dev' || ENV === 'prod') {
    process.env.ENV = ENV;
}

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { AiClient, BatchLyricsAnalysis } from '../src/services/aiClient';
import { AnalysisResult, AnalysisResultStorage } from '../src/storage/analysisResultStorage';
import { makeSongKey } from '../src/util/songKey';
import { buildResolvedRecord, chunk, resolveNames } from './backfillSummariesLogic';

const REGION     = argValue('--region') ?? 'us-west-2';
const LIMIT      = parseInt(argValue('--limit') ?? '100', 10);
const BATCH_SIZE = parseInt(argValue('--batch-size') ?? '10', 10);
const DELAY_MS   = parseInt(argValue('--delay-ms') ?? '1000', 10);
const DRY_RUN        = process.argv.includes('--dry-run');
const DRY_RUN_WRITES = process.argv.includes('--dry-run-writes');
const YES            = process.argv.includes('--yes');

if (!ENV || !['dev', 'prod'].includes(ENV)) {
    console.error('Error: --env dev|prod is required.');
    console.error('Usage: npx ts-node scripts/backfill-summaries.ts --env <dev|prod> [--limit <n>] [--batch-size <n>] [--delay-ms <n>] [--dry-run | --dry-run-writes] [--yes] [--region <region>]');
    process.exit(1);
}

if (DRY_RUN && DRY_RUN_WRITES) {
    console.error('Error: --dry-run and --dry-run-writes are mutually exclusive. Use --dry-run for no Anthropic/DynamoDB calls at all, or --dry-run-writes to run the real Anthropic calls but skip DynamoDB writes.');
    process.exit(1);
}

if (!Number.isFinite(LIMIT) || LIMIT <= 0) {
    console.error('Error: --limit must be a positive integer.');
    process.exit(1);
}

if (!Number.isFinite(BATCH_SIZE) || BATCH_SIZE <= 0) {
    console.error('Error: --batch-size must be a positive integer.');
    process.exit(1);
}

if (!Number.isFinite(DELAY_MS) || DELAY_MS < 0) {
    console.error('Error: --delay-ms must be a non-negative integer.');
    process.exit(1);
}

const TABLE_NAME = `lyricsray-${ENV}-analysis-results`;

// Guards against this script and AnalysisResultStorage silently disagreeing on which table to
// use again in the future (see the comment above where process.env.ENV is set) — if this ever
// fires, getAnalysisResult/saveAnalysisResult would target the wrong environment's table while
// the scan above correctly targets --env, and every record would appear to "no longer exist".
if (process.env.ENV !== ENV) {
    console.error(`Error: process.env.ENV ("${process.env.ENV}") does not match --env ("${ENV}"). Refusing to run, since AnalysisResultStorage would read/write the wrong table.`);
    process.exit(1);
}

// ── clients ───────────────────────────────────────────────────────────────────

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

const analysisResultDb = new AnalysisResultStorage(db);

// Calls AiClient directly rather than the public analyzeSongHandler, so this script does not
// touch (and is not gated by) RateLimiter's per-IP/global DynamoDB counters — those exist to
// protect the public /v1/analyze-song endpoint from end users, not admin batch jobs. Pacing here
// is controlled solely by --delay-ms / --limit / --batch-size above.
const aiClient = new AiClient(process.env.ANTHROPIC_MODEL!, process.env.ANTHROPIC_API_KEY!);

// ── helpers ───────────────────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, answer => { rl.close(); resolve(answer.trim().toLowerCase() === 'yes'); });
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n========================================');
    console.log(`Table      : ${TABLE_NAME}`);
    console.log(`Region     : ${REGION}`);
    console.log(`Limit      : ${LIMIT}`);
    console.log(`Batch size : ${BATCH_SIZE}`);
    console.log(`Delay(ms)  : ${DELAY_MS}`);
    const modeLabel = DRY_RUN
        ? 'DRY RUN (no Anthropic or DynamoDB calls)'
        : DRY_RUN_WRITES
            ? 'DRY RUN WRITES (real Anthropic calls; DynamoDB writes skipped)'
            : 'LIVE';
    console.log(`Mode       : ${modeLabel}`);
    console.log('========================================\n');

    if (!DRY_RUN) {
        // DRY_RUN_WRITES still calls Anthropic for real, so the key is required either way.
        if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) {
            console.error('Error: ANTHROPIC_API_KEY and ANTHROPIC_MODEL must be set (see api/.env.local).');
            process.exit(1);
        }

        // No DynamoDB writes happen under DRY_RUN_WRITES, so there's nothing to confirm.
        if (!DRY_RUN_WRITES && ENV === 'prod' && !YES) {
            const ok = await confirm('About to re-analyze lyrics and WRITE to PRODUCTION. Type "yes" to continue: ');
            if (!ok) { console.log('Aborted.'); process.exit(0); }
            console.log();
        }
    }

    // ── collect up to LIMIT eligible songKeys ──────────────────────────────────
    // Eligible = missing `summary` (not yet backfilled) OR missing/empty `themes`
    // (very old records that predate themes entirely).
    console.log('Scanning for records missing "summary" or "themes"...\n');

    const eligibleKeys: string[] = [];
    let scanned = 0;
    let lastKey: Record<string, unknown> | undefined;

    do {
        const { Items = [], LastEvaluatedKey } = await db.send(new ScanCommand({
            TableName: TABLE_NAME,
            ExclusiveStartKey: lastKey,
            FilterExpression: 'attribute_not_exists(#summary) OR attribute_not_exists(#themes) OR size(#themes) = :zero',
            ExpressionAttributeNames: { '#summary': 'summary', '#themes': 'themes' },
            ExpressionAttributeValues: { ':zero': 0 },
            ProjectionExpression: 'songKey',
        }));
        lastKey = LastEvaluatedKey as Record<string, unknown> | undefined;
        scanned += Items.length;

        for (const item of Items as { songKey: string }[]) {
            eligibleKeys.push(item.songKey);
            if (eligibleKeys.length >= LIMIT) break;
        }

        if (lastKey && eligibleKeys.length < LIMIT) console.log(`  ... scanned ${scanned} items so far, ${eligibleKeys.length} eligible`);
    } while (lastKey && eligibleKeys.length < LIMIT);

    console.log(`\nScanned  : ${scanned}`);
    console.log(`Eligible : ${eligibleKeys.length}${eligibleKeys.length >= LIMIT ? ` (capped at --limit ${LIMIT})` : ''}\n`);

    if (DRY_RUN) {
        eligibleKeys.forEach(songKey => console.log(`  WOULD PROCESS songKey="${songKey}"`));
        console.log('\nDry run — no Anthropic or DynamoDB calls were made.\n');
        return;
    }

    // ── re-analyze and update, in batches ───────────────────────────────────────
    let updated = 0, skippedNoLyrics = 0, skippedMissing = 0, namesResolved = 0, skippedResolvedExists = 0, skippedUnmatchedId = 0, failed = 0;
    let totalTokensIn = 0, totalTokensOut = 0;

    const batches = chunk(eligibleKeys, BATCH_SIZE);

    for (let b = 0; b < batches.length; b++) {
        const batchKeys = batches[b];
        console.log(`\n-- Batch ${b + 1}/${batches.length} (${batchKeys.length} songs) --`);

        const records = await Promise.all(batchKeys.map(songKey => analysisResultDb.getAnalysisResult(songKey)));

        const validEntries: { songKey: string; record: AnalysisResult; lyrics: string }[] = [];
        for (let i = 0; i < batchKeys.length; i++) {
            const songKey = batchKeys[i];
            const record = records[i];

            if (!record) {
                console.log(`  SKIP (record no longer exists) songKey="${songKey}"`);
                skippedMissing++;
                continue;
            }

            const lyrics = record.song?.lyrics;
            if (!lyrics) {
                console.log(`  SKIP (no stored lyrics) songKey="${songKey}"`);
                skippedNoLyrics++;
                continue;
            }

            validEntries.push({ songKey, record, lyrics });
        }

        if (validEntries.length === 0) continue;

        // Each song is sent with its songKey as an id that Claude must echo back, so results
        // below are matched by id (not by array position) — robust to a reordered, missing, or
        // duplicate-id response. See AiClient.analyzeLyricsBatch.
        let batchResults: (BatchLyricsAnalysis | undefined)[];
        try {
            const { results, tokensIn, tokensOut } = await aiClient.analyzeLyricsBatch(
                validEntries.map(e => ({ id: e.songKey, lyrics: e.lyrics }))
            );
            batchResults = results;
            totalTokensIn += tokensIn;
            totalTokensOut += tokensOut;
            console.log(`  Tokens: in=${tokensIn} out=${tokensOut}`);
        } catch (err) {
            console.error(`  ERROR analyzing batch ${b + 1}:`, err);
            failed += validEntries.length;
            if (b < batches.length - 1) await sleep(DELAY_MS);
            continue;
        }

        const unmatchedCount = batchResults.filter(r => !r).length;
        if (unmatchedCount > 0) {
            console.warn(`  WARNING: ${unmatchedCount} of ${validEntries.length} songs had no matching id in the response; those will be skipped this run and picked up next time.`);
        }

        for (let i = 0; i < validEntries.length; i++) {
            const { songKey, record, lyrics } = validEntries[i];
            const analysis = batchResults[i];

            // Not a failure — Claude's response just didn't include (or echoed back the wrong)
            // id for this song. Log it, skip saving anything for it, and move on: since it's
            // still missing summary/themes, it stays eligible and will be retried next run.
            if (!analysis) {
                console.warn(`  SKIP (no matching id in response, not saved) songKey="${songKey}"`);
                skippedUnmatchedId++;
                continue;
            }

            try {
                const updateLabel = DRY_RUN_WRITES ? '[dry-run-writes] Would UPDATE' : 'UPDATE';
                const themePercentagesLabel = analysis.themePercentages.map(tp => `${tp.theme}: ${tp.percentage}%`).join(', ');
                console.log(`  ${updateLabel} songKey="${songKey}" summary="${analysis.summary}" themes=[${analysis.themes.join(', ')}] themePercentages=[${themePercentagesLabel}]`);

                // Backfill themes/summary/themePercentages onto the existing record only —
                // appropriate, recommendedAge, and analysis are left exactly as originally served.
                if (!DRY_RUN_WRITES) {
                    await db.send(new UpdateCommand({
                        TableName: TABLE_NAME,
                        Key: { songKey },
                        UpdateExpression: 'SET #summary = :summary, themePercentages = :themePercentages, themes = :themes',
                        ExpressionAttributeNames: { '#summary': 'summary' },
                        ExpressionAttributeValues: {
                            ':summary': analysis.summary,
                            ':themePercentages': analysis.themePercentages,
                            ':themes': analysis.themes,
                        },
                    }));
                }
                updated++;

                // Same artist/song name resolution as analyzeSongHandler: prefer the name
                // already on the record, fall back to what the AI inferred this time.
                const existingArtistName = record.song?.artistName;
                const existingSongName = record.song?.songName;
                const resolution = resolveNames(songKey, existingArtistName, existingSongName, analysis, lyrics, makeSongKey);

                console.log(
                    `  NAMES songKey="${songKey}" existing=[${existingArtistName ?? 'undefined'} / ${existingSongName ?? 'undefined'}] ` +
                    `claude=[${analysis.artistName ?? 'undefined'} / ${analysis.songName ?? 'undefined'}] ` +
                    `resolved=[${resolution.resolvedArtistName ?? 'undefined'} / ${resolution.resolvedSongName ?? 'undefined'}] ` +
                    `keyChanged=${resolution.keyChanged} resolvedSongKey="${resolution.resolvedSongKey}"`
                );

                if (resolution.keyChanged) {
                    const alreadyExists = await analysisResultDb.getAnalysisResult(resolution.resolvedSongKey);
                    if (alreadyExists) {
                        console.log(`  SKIP creating resolved-name duplicate (already exists) songKey="${resolution.resolvedSongKey}"`);
                        skippedResolvedExists++;
                    } else {
                        const createLabel = DRY_RUN_WRITES ? '[dry-run-writes] Would CREATE' : 'CREATE';
                        if (!DRY_RUN_WRITES) {
                            const newRecord = buildResolvedRecord(record, resolution, analysis);
                            await analysisResultDb.saveAnalysisResult(newRecord);
                        }
                        console.log(`  ${createLabel} resolved-name record songKey="${resolution.resolvedSongKey}" (original songKey="${songKey}" retained)`);
                        namesResolved++;
                    }
                }
            } catch (err) {
                console.error(`  ERROR processing songKey="${songKey}":`, err);
                failed++;
            }
        }

        if (b < batches.length - 1) await sleep(DELAY_MS);
    }

    const updatedLabel = DRY_RUN_WRITES ? 'Would update' : 'Updated';
    const namesResolvedLabel = DRY_RUN_WRITES ? 'Would create (resolved-name)' : 'Resolved-name records made';

    console.log('\n========================================');
    console.log(`Scanned                            : ${scanned}`);
    console.log(`Eligible                           : ${eligibleKeys.length}`);
    console.log(`Batches                            : ${batches.length}`);
    console.log(`${updatedLabel.padEnd(35)} : ${updated}`);
    console.log(`${namesResolvedLabel.padEnd(35)} : ${namesResolved}`);
    console.log(`Skipped (no lyrics)                : ${skippedNoLyrics}`);
    console.log(`Skipped (record gone)              : ${skippedMissing}`);
    console.log(`Skipped (resolved exists)          : ${skippedResolvedExists}`);
    console.log(`Skipped (unmatched id)             : ${skippedUnmatchedId}`);
    console.log(`Tokens in / out                    : ${totalTokensIn} / ${totalTokensOut}`);
    if (failed > 0) console.error(`Failed                             : ${failed}`);
    if (DRY_RUN_WRITES) console.log('\ndry-run-writes — Anthropic was called for real, but no DynamoDB writes were made.');
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
