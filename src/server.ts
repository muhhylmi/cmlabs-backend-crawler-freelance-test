import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { getBrowser, closeBrowser } from './crawler/browser';

const startServer = async () => {
    try {
        // Pre-warm the browser
        await getBrowser();

        const server = app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port} in ${config.env} mode`);
        });

        // Graceful Shutdown Handling
        const shutdown = async () => {
            logger.info('Shutting down server gracefully...');
            server.close();
            await closeBrowser();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();