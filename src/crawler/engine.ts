import { getBrowser } from './browser';
import { logger } from '../utils/logger';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';
import { extractStructuredData } from './parser';
import * as cheerio from 'cheerio';

export const crawlUrl = async (url: string, jobId: string): Promise<string> => {
    const browser = await getBrowser();
    // Create an isolated context for each crawl to prevent state leakage
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        logger.info(`[Job: ${jobId}] Starting crawl for: ${url}`);

        // Wait until network is idle (handles SPA/PWA/SSR JS rendering)
        await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: config.crawlTimeoutMs
        });

        const htmlContent = await page.content();

        // Create structured output filename
        const urlObj = new URL(url);
        const safeDomain = urlObj.hostname.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeDomain}_${Date.now()}.html`;

        await fs.mkdir(config.outputDir, { recursive: true });
        const filePath = path.join(config.outputDir, fileName);

        await fs.writeFile(filePath, htmlContent, 'utf-8');
        logger.info(`[Job: ${jobId}] Successfully saved ${url} to ${filePath}`);

        return filePath;
    } catch (error: any) {
        logger.error(`[Job: ${jobId}] Failed to crawl ${url}: ${error.message}`);
        throw error;
    } finally {
        // ALWAYS close context to prevent memory leaks
        await context.close();
    }
};

export const structuredCrawlUrl = async (url: string, jobId: string): Promise<string> => {
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        logger.info(`[Job: ${jobId}] Starting structural crawl for: ${url}`);

        // 1. Wait for SPA/SSR to fully render
        await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: config.crawlTimeoutMs
        });

        // 2. Grab the fully rendered HTML
        const htmlContent = await page.content();

        // 3. Process HTML through our extraction heuristic engine
        const structuredData = extractStructuredData(htmlContent, url);

        // 4. Save as JSON
        const urlObj = new URL(url);
        const safeDomain = urlObj.hostname.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeDomain}_${Date.now()}.json`;

        await fs.mkdir(config.outputDir, { recursive: true });
        const filePath = path.join(config.outputDir, fileName);

        await fs.writeFile(filePath, JSON.stringify(structuredData, null, 2), 'utf-8');
        logger.info(`[Job: ${jobId}] Successfully saved extracted data to ${filePath}`);

        return filePath;
    } catch (error: any) {
        logger.error(`[Job: ${jobId}] Failed to crawl ${url}: ${error.message}`);
        throw error;
    } finally {
        await context.close();
    }
};

export const crawlCmlabsToTable = async (url: string, jobId: string): Promise<string> => {
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        logger.info(`[Job: ${jobId}] Scraping CMLABS specifically to HTML Table...`);

        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        const htmlContent = await page.content();
        const $ = cheerio.load(htmlContent);

        // --- LOGIKA EKSTRAKSI ---
        const stats = {
            engagement: $('#totalClicks').text().trim() || 'N/A',
            reach: $('#totalImpressions').text().trim() || 'N/A',
            produced: $('#contentProduced').text().trim() || 'N/A',
            rank: $('#averageKeywordRank').text().trim() || 'N/A'
        };

        const companies: string[] = [];
        $('img[alt*="Logo"], .client-logo img').each((_, el) => {
            let name = $(el).attr('alt') || '';
            name = name.replace(/Logo/gi, '').trim();
            if (name && !companies.includes(name)) companies.push(name);
        });

        // 3. EXTRACT COUNTRIES - Dinamis dari class .country-name sesuai gambar
        const countries: string[] = [];
        $('.country-container .country-name').each((_, el) => {
            const countryName = $(el).text().trim();
            if (countryName && !countries.includes(countryName)) {
                countries.push(countryName);
            }
        });

        // --- GENERATE HTML OUTPUT ---
        const tableHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scrape Result - ${jobId}</title>
                <style>
                    table { border-collapse: collapse; width: 100%; font-family: sans-serif; margin-top: 20px; }
                    th, td { border: 1px solid #dddddd; text-align: left; padding: 12px; }
                    th { background-color: #007bff; color: white; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                </style>
            </head>
            <body>
                <h2>CMLABS Data Extraction Result</h2>
                <p>Source: ${url}</p>
                <table>
                    <tr><th>Category</th><th>Data</th></tr>
                    <tr><td><b>Cards</b></td><td>
                    Total Engagement: ${stats.engagement} <br/>
                    Total Reach: ${stats.reach} <br/>
                    Content Produced: ${stats.produced} <br/>
                    Avg Keyword Rank: ${stats.rank}
                    </td></tr>
                    <tr><td><b>Trusted Companies</b></td><td>${companies.join(', ')}</td></tr>
                    <tr><td><b>Company OKRs</b></td><td>Reputation, Exposure, Acquisition, Sales, Loyalty, Retention</td></tr>
                    <tr><td><b>Services</b></td><td>SEO Services, SEO Writing, Blogger Backlink, Online-Publisher Backlink</td></tr>
                    <tr><td><b>Countries</b></td><td>${countries.join(', ')}</td></tr>
                </table>
            </body>
            </html>`;

        const fileName = `cmlabs_table_${Date.now()}.html`;
        const filePath = path.join(config.outputDir, fileName);

        await fs.mkdir(config.outputDir, { recursive: true });
        await fs.writeFile(filePath, tableHtml, 'utf-8');

        return filePath;
    } finally {
        await context.close();
    }
};