export interface ThemePercentage {
    theme: string;
    percentage: number;
}

export interface AnalysisResult {
    songKey: string;
    date: string;
    song: AnalysisSongDetails;
    recommendedAge: number;
    themes: string[];
    analysis: string;
    appropriate: number;
    entityType: string;
    summary?: string;
    themePercentages?: ThemePercentage[];
}

export interface AnalysisSongDetails {
    albumName?: string;
    artistName?: string;
    lyrics?: string;
    songName?: string;
    thumbnailUrl?: string;
    yearReleased?: number;
}

export type EntityType = "ANALYSIS" | "POPULAR";
