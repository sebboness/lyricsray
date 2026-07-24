/**
 * Returns the recommended age display.
 * @param recommendedAge The recommended age (could be a number display i.e. "13" or text i.e. "All")
 * @returns The recommended age display (i.e. "All" or "16+")
 */
export const getRecommendedAgeDisplay = (recommendedAge: string | number): string => {
    if (!recommendedAge) return "";
    return (recommendedAge + "").toLowerCase() === 'all' ? 'All ages' : `Age ${recommendedAge}+`;
}

export interface AppropriatenessDisplay {
    iconType: 'success' | 'warning' | 'error' | 'unknown';
    color: string;
    label: string;
}

/**
 * Gets the appropriate icon type, color, and label based on appropriateness level.
 * @param appropriate The appropriateness level (1 = parent-friendly, 2 = use caution, 3 = mature)
 * @param theme The MUI theme used to resolve palette colors
 * @returns Display info for the appropriateness level
 */
export const getAppropriatenessDisplay = (appropriate: number, theme: any): AppropriatenessDisplay => {
    switch (appropriate) {
        case 1:
            return {
                iconType: 'success',
                color: theme.palette.success.main,
                label: 'Parent-friendly'
            };
        case 2:
            return {
                iconType: 'warning',
                color: theme.palette.warning.main,
                label: 'Use caution'
            };
        case 3:
            return {
                iconType: 'error',
                color: theme.palette.error.main,
                label: 'For mature audiences'
            };
        default:
            return {
                iconType: 'unknown',
                color: theme.palette.text.secondary,
                label: 'Unknown'
            };
    }
};
