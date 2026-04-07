import { chromium, Browser } from 'playwright';
import { logger } from '../utils/logger';

let browserInstance: Browser | null = null;

export const getBrowser = async (): Promise<Browser> => {
    if (!browserInstance) {
        logger.info('Initializing Playwright browser instance...');
        browserInstance = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserInstance;
};

export const closeBrowser = async () => {
    if (browserInstance) {
        logger.info('Closing Playwright browser instance...');
        await browserInstance.close();
        browserInstance = null;
    }
};