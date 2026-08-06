import { rollupStatsHandler } from './src/handlers/rollupStats';
import { logger } from './src/util/logger';

export const handler = async (): Promise<void> => {
    logger.info('rollup stats handler triggered');
    await rollupStatsHandler();
    logger.info('rollup stats handler complete');
};
