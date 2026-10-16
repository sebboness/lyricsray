/** Collapses whitespace and cuts text to `max` characters (whole code points), ending in an ellipsis when shortened. */
export function truncateText(text: string | undefined | null, max: number): string {
    const clean = (text ?? '').replace(/\s+/g, ' ').trim();
    const chars = Array.from(clean);
    if (chars.length <= max) return clean;
    return `${chars.slice(0, Math.max(0, max - 1)).join('').trimEnd()}…`;
}

/** Steps the font size down as a title gets longer so it keeps fitting the card. */
export function titleFontSize(title: string): number {
    if (title.length <= 24) return 64;
    if (title.length <= 40) return 54;
    return 46;
}

/** Keeps text on one line, ending in an ellipsis if it still overflows the card. */
export const singleLineStyle = {
    display: 'block',
    flexShrink: 0,
    maxWidth: 1088,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
} as const;
