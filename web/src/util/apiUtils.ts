export type QueryParams = {[key: string]: string[]} | undefined;

/**
 * Returns a formatted URL to fetch an API resource.
 * @param baseUri The API base URL
 * @param endpoint The API endpoint
 * @param queryParams Optional query parameters
 * @returns Formatted URL to fetch an API resource
 */
export const toFetchUrl = (baseUri: string, endpoint: string, queryParams: QueryParams): string => {
    let queryString = "";
    if (queryParams) {
        const parts: Array<string> = [];
        for (const [k, v] of Object.entries(queryParams)) {
            if (v === undefined || v === null)
                continue;
            const key = encodeURIComponent(k);
            const val = encodeURIComponent(v.join(","));
            parts.push(`${key}=${val}`);
        }
        queryString = "?" + parts.join("&");
    }

    return `${baseUri}/${endpoint}${queryString}`;
}