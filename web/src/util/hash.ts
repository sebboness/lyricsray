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
        .slice(0, 24);

    return `${prefix}${hash}`;
}

/**
 * Hashes an IP address using SHA-1 for PII-safe storage and logging.
 * Same IP always produces the same hash.
 * @param ip The raw IP address string
 * @returns A 24-character hex hash of the IP
 */
export function hashIp(ip: string): string {
    return crypto
        .createHash("sha1")
        .update(ip)
        .digest("hex")
        .slice(0, 24);
}
