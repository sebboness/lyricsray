import { QueryParams, toFetchUrl } from "@/util/apiUtils";
import { logPrefix } from "@/util/log";

const baseUrl = "https://lrclib.net/api";

export interface SearchSongRequest {
    songName: string;
    artist: string;
}

export interface SongSearchResult {
    id: string;
    albumName?: string;
    artistName: string;
    duration: number;
    instrumental: boolean;
    name: string;
    plainLyrics?: string;
    thumbnail?: string;
    trackName: string;
    syncedLyrics?: string;
}

export interface SearchSongResponse {
    songs: SongSearchResult[];
    error?: string;
}

export type CallOptions = {
    payload?: any;
    queryParams?: QueryParams;
};

/**
 * Interface that defines an object from which an auth token is retrieved.
 * This is used when calling the API to determine if the Authorized header should be set
 */
export interface TokenGetter {
    getToken: () => string;
    getTokenType: () => string;
}


export class Api {
    baseUri: string;
    name: string;
    tokenGetter?: TokenGetter;

    constructor(baseUri: string, name: string) {
        this.baseUri = baseUri;
        this.name = name;
    }

    public sendRequest<T>(method: string, endpoint: string, options: CallOptions | undefined = undefined): Promise<T> {
        return new Promise((resolve, reject) => {

            const opts = options || {};
            const headers: HeadersInit = {
                "Content-Type": "json/application",
                "User-Agent": `${process.env.APP_NAME} ${process.env.APP_VERSION} ${process.env.APP_URL}`,
            };

            // Build API URL
            const url = toFetchUrl(baseUrl, endpoint, opts.queryParams)

            let noCache = false;

            // Initialize fetch request
            const reqOps: RequestInit = {
                method,
                headers,
                credentials: "include",
            };

            if (noCache)
                reqOps.cache = "no-store";
            
            // Add payload
            if (opts.payload) {
                reqOps.body = JSON.stringify(opts.payload);
                console.debug(`${logPrefix(this.name)} request has payload`);
            }

            console.info(`${logPrefix(this.name)} preparing request ${method.toUpperCase()} ${url}`);

            fetch(url, reqOps)
                .then((response) => {
                    console.debug(`${logPrefix(this.name)} response received`, response)

                    response.json()
                        .then((obj: T | undefined) => {
                            if (obj)
                                resolve(obj);
                            else
                                reject(`${response.status} Unexpected response: ${JSON.stringify(obj)}`);
                        });
                })
                .catch((err) => {
                    console.log(`${logPrefix(this.name)} caught fetch error`, err);
                    reject(err);
                });
        });
    }

    public delete<T>(endpoint: string, opts: CallOptions | undefined = undefined): Promise<T> {
        return this.sendRequest<T>("delete", endpoint, opts);
    }

    public get<T>(endpoint: string, opts: CallOptions | undefined = undefined): Promise<T> {
        return this.sendRequest<T>("get", endpoint, opts);
    }

    public patch<T>(endpoint: string, opts: CallOptions | undefined = undefined): Promise<T> {
        return this.sendRequest<T>("patch", endpoint, opts);
    }

    public post<T>(endpoint: string, opts: CallOptions | undefined = undefined): Promise<T> {
        return this.sendRequest<T>("post", endpoint, opts);
    }

    public put<T>(endpoint: string, opts: CallOptions | undefined = undefined): Promise<T> {
        return this.sendRequest<T>("put", endpoint, opts);
    }
}