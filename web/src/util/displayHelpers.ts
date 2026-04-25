/**
 * Returns the recommended age display.
 * @param recommendedAge The recommended age (could be a number display i.e. "13" or text i.e. "All")
 * @returns The recommended age display (i.e. "All" or "16+")
 */
export const getRecommendedAgeDisplay = (recommendedAge: string | number): string => {
    if (!recommendedAge) return "";
    return (recommendedAge + "").toLowerCase() === 'all' ? 'All ages' : `Age ${recommendedAge}+`;
}
