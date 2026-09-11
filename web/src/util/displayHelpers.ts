import { verdict } from '@/theme/theme';

/**
 * Returns the recommended age display.
 * @param recommendedAge The recommended age (could be a number display i.e. "13" or text i.e. "All")
 * @returns The recommended age display (i.e. "All" or "16+")
 */
export const getRecommendedAgeDisplay = (recommendedAge: string | number): string => {
    if (!recommendedAge) return "";
    return (recommendedAge + "").toLowerCase() === 'all' ? 'All ages' : `Age ${recommendedAge}+`;
}

/**
 * Short age display for compact pill badges (e.g. "16+", "ALL") as opposed to
 * the longer "Age 16+" / "All ages" form of {@link getRecommendedAgeDisplay}.
 */
export const getShortAgeDisplay = (recommendedAge: string | number): string => {
    if (!recommendedAge) return "";
    return (recommendedAge + "").toLowerCase() === 'all' ? 'ALL' : `${recommendedAge}+`;
}

export type VerdictKey = 'safe' | 'caution' | 'blocked' | 'unknown';

export interface AppropriatenessDisplay {
    verdictKey: VerdictKey;
    color: string;
    label: string;
}

/**
 * Gets the verdict key, color, and label based on appropriateness level.
 * @param appropriate The appropriateness level (1 = safe, 2 = listen first, 3 = not for kids)
 * @returns Display info for the appropriateness level
 */
export const getAppropriatenessDisplay = (appropriate: number): AppropriatenessDisplay => {
    switch (appropriate) {
        case 1:
            return { verdictKey: 'safe', color: verdict.safe.main, label: 'Safe' };
        case 2:
            return { verdictKey: 'caution', color: verdict.caution.main, label: 'Listen first' };
        case 3:
            return { verdictKey: 'blocked', color: verdict.blocked.main, label: 'Not for kids' };
        default:
            return { verdictKey: 'unknown', color: '#8a939e', label: 'Unknown' };
    }
};
