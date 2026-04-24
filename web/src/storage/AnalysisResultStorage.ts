import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { logPrefix } from "@/util/log";
import { logger } from "@/logger/logger";

const moduleName = "AnalysisResultStorage";
const tableName = `${process.env.APP_NAME!.toLowerCase()}-${process.env.ENV?.toLowerCase()}-analysis-results`;

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

export class AnalysisResultStorage {
    dbClient: DynamoDBDocumentClient;

    constructor(dbClient: DynamoDBDocumentClient) {
        this.dbClient = dbClient;
        logger.info("Initialized AnalysisResultStorage", { moduleName, tableName });
    }

    /**
     * Gets the analysis result for a song from storage.
     * @param songKey The unique song key
     * @returns An instance of analysis result
     */
    public getAnalysisResult(songKey: string): Promise<AnalysisResult | null> {
        return new Promise((resolve, reject) => {

            const command = new GetCommand({
                TableName: tableName,
                Key: {
                    songKey,
                },
            });

            this.dbClient.send(command)
                .then((response) => {
                    const { Item } = response;
                    logger.debug(`${logPrefix(moduleName)} response received`, Item);

                    resolve(Item as AnalysisResult);
                })
                .catch((err) => {
                    logger.error(`${logPrefix(moduleName)} getting analysis result failed`, err);
                    reject(err);
                });
        });
    }

    /**
     * Saves the given song analysis result in storage.
     * @param analysisResult The song analysis result
     * @returns The saved song analysis result
     */
    public saveAnalysisResult(analysisResult: AnalysisResult): Promise<AnalysisResult> {
        return new Promise((resolve, reject) => {
            const command = new PutCommand({
                TableName: tableName,
                Item: {
                    ...analysisResult,
                },
            });

            this.dbClient.send(command)
                .then((response) => {
                    logger.debug(`${logPrefix(moduleName)} analysis result saved.`, {
                        consumedCapacity: response.ConsumedCapacity,
                    });

                    resolve(analysisResult);
                })
                .catch((err) => {
                    logger.error(`${logPrefix(moduleName)} saving analysis result failed`, err);
                    reject(err);
                });
        });
    }

    /**
     * Gets the most recent analysis results using the GSI.
     * @param limit The maximum number of results to return (default: 5)
     * @returns An array of recent analysis results
     */
    public getRecentAnalyses(limit: number = 5, entityType: EntityType = "ANALYSIS"): Promise<AnalysisResult[]> {
        return new Promise((resolve, reject) => {
            const command = new QueryCommand({
                TableName: tableName,
                IndexName: "RecentAnalysesIndex",
                KeyConditionExpression: "entityType = :entityType",
                ExpressionAttributeValues: {
                    ":entityType": entityType
                },
                ScanIndexForward: false, // Sort by date descending (newest first)
                Limit: limit,
                ProjectionExpression: "songKey, #dateField, song.songName, song.artistName, recommendedAge, themes, appropriate, analysis",
                ExpressionAttributeNames: {
                    "#dateField": "date"
                }
            });

            this.dbClient.send(command)
                .then((response) => {
                    const items = response.Items as AnalysisResult[];
                    logger.debug(`${logPrefix(moduleName)} retrieved ${items?.length || 0} recent analyses`);
                    resolve(items || []);
                })
                .catch((err) => {
                    logger.error(`${logPrefix(moduleName)} getting recent analyses failed`, err);
                    reject(err);
                });
        });
    }

    /**
     * Gets multiple analysis results by their songKeys using BatchGetItem.
     * @param songKeys Array of songKeys to fetch
     * @returns An array of analysis results for the requested songs
     */
    public getBatchAnalysisResults(songKeys: string[]): Promise<AnalysisResult[]> {
        return new Promise((resolve, reject) => {
            if (!songKeys || songKeys.length === 0) {
                resolve([]);
                return;
            }

            // DynamoDB BatchGetItem has a limit of 100 items per request
            if (songKeys.length > 100) {
                logger.warn(`${logPrefix(moduleName)} Too many songKeys requested (${songKeys.length}), limiting to 100`);
                songKeys = songKeys.slice(0, 100);
            }

            // Build the request items for BatchGetItem
            const keys = songKeys.map(songKey => ({ songKey }));

            const command = new BatchGetCommand({
                RequestItems: {
                    [tableName]: {
                        Keys: keys,
                        ProjectionExpression: "songKey, #dateField, song.songName, song.artistName, recommendedAge, themes, appropriate, analysis",
                        ExpressionAttributeNames: {
                            "#dateField": "date"
                        }
                    }
                }
            });

            this.dbClient.send(command)
                .then((response) => {
                    const items = response.Responses?.[tableName] as AnalysisResult[] || [];
                    logger.debug(`${logPrefix(moduleName)} retrieved ${items.length} analysis results from batch get`);

                    // Handle any unprocessed keys (in case of throttling)
                    if (response.UnprocessedKeys && Object.keys(response.UnprocessedKeys).length > 0) {
                        logger.warn(`${logPrefix(moduleName)} Some keys were unprocessed in batch get`, response.UnprocessedKeys);
                    }

                    resolve(items);
                })
                .catch((err) => {
                    logger.error(`${logPrefix(moduleName)} batch get analysis results failed`, err);
                    reject(err);
                });
        });
    }
}