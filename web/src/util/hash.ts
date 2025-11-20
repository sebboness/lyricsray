import crypto from "crypto";

/**
 * 
 * @param input The input string
 * @param prefix The hash key prefix (optional, defaults to "K")
 * @returns A hash key
 */
export function makeKey(input: string, prefix = "K"): string {
    const hash = crypto
        .createHash("sha1")
        .update(input)
        .digest("hex")
        .slice(0, 16);

    return `${prefix}#${hash}`;
}