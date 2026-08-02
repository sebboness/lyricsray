export interface AnalysisResult {
    songKey: string;
    date: string;
    song: AnalysisSongDetails;
    recommendedAge: number;
    themes: string[];
    analysis: string;
    appropriate: number;
    entityType: string;
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
