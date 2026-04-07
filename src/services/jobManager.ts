import pLimit from 'p-limit';
import crypto from 'crypto';
import { crawlCmlabsToTable, crawlUrl, scrapeSequenceToTable, scrapeStarbucksToTable, structuredCrawlUrl } from '../crawler/engine';
import { config } from '../config';
import { logger } from '../utils/logger';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CrawlJob {
    id: string;
    url: string;
    status: JobStatus;
    filePath?: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

// In-memory store (Use Redis + BullMQ for true distributed production)
const jobsStore = new Map<string, CrawlJob>();
const limit = pLimit(config.concurrencyLimit);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const processJobWithRetry = async (job: CrawlJob, type: string, attempt = 1): Promise<void> => {
    job.status = 'processing';
    job.updatedAt = new Date();

    try {
        let filePath = '';
        if (type === 'unstructured') {
            filePath = await crawlUrl(job.url, job.id);
        } else {
            filePath = await structuredCrawlUrl(job.url, job.id);
        }
        job.status = 'completed';
        job.filePath = filePath;
        job.updatedAt = new Date();
    } catch (error: any) {
        if (attempt <= config.maxRetries) {
            logger.warn(`[Job: ${job.id}] Retrying (${attempt}/${config.maxRetries})...`);
            await delay(2000 * attempt); // Exponential backoff
            return processJobWithRetry(job, type, attempt + 1);
        }
        job.status = 'failed';
        job.error = error.message;
        job.updatedAt = new Date();
    }
};

export const addJob = (url: string, type: string): string => {
    const id = crypto.randomUUID();
    const newJob: CrawlJob = {
        id,
        url,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    jobsStore.set(id, newJob);

    // Fire and forget (Async Processing)
    limit(() => processJobWithRetry(jobsStore.get(id)!, type));

    return id;
};

export const getJob = (id: string): CrawlJob | undefined => {
    return jobsStore.get(id);
};

export const addCmlabsScrapeJob = (url: string): string => {
    const id = crypto.randomUUID();
    const newJob: CrawlJob = {
        id,
        url,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    jobsStore.set(id, newJob);

    // Masukkan ke queue concurrency
    limit(async () => {
        newJob.status = 'processing';
        try {
            const filePath = await crawlCmlabsToTable(url, id);
            newJob.status = 'completed';
            newJob.filePath = filePath;
        } catch (err: any) {
            newJob.status = 'failed';
            newJob.error = err.message;
        }
        newJob.updatedAt = new Date();
    });

    return id;
};

export const addSequenceScrapeJob = (url: string): string => {
    const id = crypto.randomUUID();
    const newJob: CrawlJob = {
        id,
        url,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    jobsStore.set(id, newJob);

    // Masukkan ke queue concurrency
    limit(async () => {
        newJob.status = 'processing';
        try {
            const filePath = await scrapeSequenceToTable(url, id);
            newJob.status = 'completed';
            newJob.filePath = filePath;
        } catch (err: any) {
            newJob.status = 'failed';
            newJob.error = err.message;
        }
        newJob.updatedAt = new Date();
    });

    return id;
};


export const addStarbuckMenuScrapeJob = (url: string): string => {
    const id = crypto.randomUUID();
    const newJob: CrawlJob = {
        id,
        url,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    jobsStore.set(id, newJob);

    // Masukkan ke queue concurrency
    limit(async () => {
        newJob.status = 'processing';
        try {
            const filePath = await scrapeStarbucksToTable(url, id);
            newJob.status = 'completed';
            newJob.filePath = filePath;
        } catch (err: any) {
            newJob.status = 'failed';
            newJob.error = err.message;
        }
        newJob.updatedAt = new Date();
    });

    return id;
};