import moment from "moment";

/**
 * Returns a formatted log prefix with date and module name.
 * @param name Name of the module
 * @returns Formatted log prefix with date and module
 */
export const logPrefix = (name: string) => `[${moment().toISOString()}] ${name}: `;
