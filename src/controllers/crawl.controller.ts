import { Request, Response } from 'express';
import { addCmlabsScrapeJob, addJob, getJob } from '../services/jobManager';
import { logger } from '../utils/logger';
import path from 'path';

export const triggerCrawl = (req: Request, res: Response): void => {
    try {
        const { urls } = req.body;
        const allowedTypes = ["structured", "unstructured"] as const;

        const type = req.query.type;

        if (typeof type !== "string" || !allowedTypes.includes(type as any)) {
            res.status(400).json({
                error: `Invalid type. Allowed values: ${allowedTypes.join(", ")}`
            });
            return
        }

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            res.status(400).json({ error: 'Please provide an array of URLs.' });
            return;
        }

        const jobIds = urls.map(url => {
            // Basic URL validation
            new URL(url);
            return addJob(url, type);
        });

        res.status(202).json({
            message: 'Crawl jobs accepted.',
            jobIds
        });
    } catch (error: any) {
        logger.error(`Error in triggerCrawl: ${error.message}`);
        res.status(400).json({ error: 'Invalid URL format provided.' });
    }
};

export const scrapeCmlabs = (req: Request, res: Response): void => {
    const targetUrl = 'https://cmlabs.co';
    const jobId = addCmlabsScrapeJob(targetUrl);

    res.status(202).json({
        message: "Scraping job started for CMLABS",
        jobId: jobId,
        statusEndpoint: `/api/status/${jobId}`
    });
};

// Update checkStatus untuk bisa mendownload file jika sudah selesai
export const checkStatus = (req: Request, res: Response): void => {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) {
        res.status(404).json({ error: 'Job not found.' });
        return;
    }

    // Jika user ingin melihat hasilnya langsung saat selesai
    if (job.status === 'completed' && req.query.view === 'true') {
        res.sendFile(path.resolve(job.filePath!));
        return;
    }

    res.status(200).json(job);
};