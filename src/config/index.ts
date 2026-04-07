import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    concurrencyLimit: parseInt(process.env.CONCURRENCY_LIMIT || '3', 10),
    crawlTimeoutMs: parseInt(process.env.CRAWL_TIMEOUT_MS || '30000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '2', 10),
    outputDir: './output'
};