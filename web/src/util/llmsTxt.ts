/** Builds the llms.txt guidance file: what LyricsRay is, how its content may be used, and where the terms live. */
export function buildLlmsTxt(baseUrl: string): string {
    return [
        '# LyricsRay',
        '',
        '> LyricsRay uses AI to analyze song lyrics for explicit language, mature themes, and age-appropriateness, helping parents decide what is suitable for their children. Analyses are advisory and not a replacement for parental judgment.',
        '',
        '## Using this content',
        '',
        '- The analyses (verdicts, recommended ages, summaries, theme breakdowns, and written explanations) are the work of LyricsRay.',
        '- You may share, quote, or cite an analysis if you clearly credit LyricsRay and link to the original page.',
        '- Without written permission, do not present analyses as your own work, republish them elsewhere, use them commercially, or collect them in bulk to build a competing product or dataset.',
        '- Song lyrics belong to their rightsholders and are not covered by this notice.',
        `- Full terms: ${baseUrl}/privacy-and-terms`,
        '',
        '## Pages',
        '',
        `- [About LyricsRay](${baseUrl}/about): how analyses are produced`,
        `- [Privacy Policy and Terms of Service](${baseUrl}/privacy-and-terms): usage and attribution terms`,
        `- Song analysis pages: ${baseUrl}/analysis/{artist}/{song}/{id}`,
        `- Artist pages: ${baseUrl}/analysis/{artist}`,
        '',
    ].join('\n');
}
