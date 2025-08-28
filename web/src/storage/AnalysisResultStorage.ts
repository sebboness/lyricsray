import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "./dynamodb";
import { logPrefix } from "@/util/log";
import { logger } from "@/logger/logger";

const moduleName = "AnalysisResultStorage";
const tableName = `${process.env.APP_NAME!.toLowerCase()} ${process.env.ENV?.toLowerCase()}-analysis-results`;

export interface AnalysisResult {
    age: number;
    songKey: string;
    date: string;
    song: AnalysisSongDetails;
    recommendedAge: number;
    analysis: string;
    appropriate: number;
}

export interface AnalysisSongDetails {
    albumName?: string;
    artistName?: string;
    songName?: string;
    thumbnailUrl?: string;
    yearReleased?: number;
}

export class AnalysisResultStorage {
    dbClient: DynamoDBDocumentClient;

    private static instance: AnalysisResultStorage;

    constructor() {
        this.dbClient = ddbDocClient;
        logger.info(`${logPrefix(moduleName)}Initialized storage with table name ${tableName}`);
    }

    /**
     * Returns the current AnalysisResultStorage API instance.
     * @returns The current AnalysisResultStorage API instance
     */
    public static getInstance(): AnalysisResultStorage {
        if (!AnalysisResultStorage.instance) {
            AnalysisResultStorage.instance = new AnalysisResultStorage();
        }
        return AnalysisResultStorage.instance;
    }

    /**
     * Gets the analysis result for a song targeted for a specific youth age from storage.
     * @param age The target age
     * @param songKey The unique song key
     * @returns An instance of analysis result
     */
    public getAnalysisResult(age: number, songKey: string): Promise<AnalysisResult | null> {
        return new Promise((resolve, reject) => {

            const command = new GetCommand({
                TableName: tableName,
                Key: {
                    PK: age,
                    SK: songKey,
                },
            });

            ddbDocClient.send(command)
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
                TableName: process.env.DYNAMO_TABLE_NAME,
                Item: {
                    PK: analysisResult.age,
                    SK: analysisResult.songKey,
                    ...analysisResult,
                },
            });

            ddbDocClient.send(command)
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
}