const ANALYSIS_COUNT_STORAGE_KEY = 'lyricsray_analysis_count';
const NEXT_PROMPT_STORAGE_KEY = 'lyricsray_support_prompt_next_at';

const DEFAULT_FIRST_THRESHOLD = 5;
const DEFAULT_COOLDOWN = 10;

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getFirstThreshold(): number {
    return parsePositiveIntEnv(process.env.NEXT_PUBLIC_SUPPORT_PROMPT_FIRST_THRESHOLD, DEFAULT_FIRST_THRESHOLD);
}

function getCooldown(): number {
    return parsePositiveIntEnv(process.env.NEXT_PUBLIC_SUPPORT_PROMPT_COOLDOWN, DEFAULT_COOLDOWN);
}

/**
 * Increments and persists the lifetime count of analysis results viewed on this device.
 */
export function incrementAnalysisCount(): number {
    if (typeof window === 'undefined') return 0;
    try {
        const current = parseInt(localStorage.getItem(ANALYSIS_COUNT_STORAGE_KEY) || '0', 10);
        const next = (isNaN(current) ? 0 : current) + 1;
        localStorage.setItem(ANALYSIS_COUNT_STORAGE_KEY, next.toString());
        return next;
    } catch {
        return 0;
    }
}

/**
 * Whether the support prompt is due to be shown at the given analysis count.
 */
export function shouldShowSupportPrompt(count: number): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const raw = localStorage.getItem(NEXT_PROMPT_STORAGE_KEY);
        const nextAt = raw === null ? getFirstThreshold() : parseInt(raw, 10);
        return count >= (isNaN(nextAt) ? getFirstThreshold() : nextAt);
    } catch {
        return false;
    }
}

/**
 * Records that the user dismissed the support prompt, pushing out the next eligible count.
 */
export function dismissSupportPrompt(count: number): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(NEXT_PROMPT_STORAGE_KEY, (count + getCooldown()).toString());
    } catch {
        // ignore storage errors (e.g. private browsing with storage disabled)
    }
}
