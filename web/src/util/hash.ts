import { createHash } from 'crypto';

export const hashValue = (input: string): string =>
    createHash('sha256').update(input).digest('hex').slice(0, 24);
