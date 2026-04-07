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

export const scrapeSequenceToTable = async (url: string, jobId: string): Promise<string> => {
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        logger.info(`[Job: ${jobId}] Starting complex sequence.day scrape...`);
        await page.goto(url, { waitUntil: 'networkidle' });

        // 1. EXTRACT HERO
        const heroContainer = page.locator('div.space-y-2');
        const heroTitle = await heroContainer.locator('p').first().innerText();
        const heroSub = await heroContainer.locator('h1').first().innerText();
        logger.info(`Hero: ${heroTitle} - ${heroSub}`);

        // 2. CLICK "SHOW ALL" COMPANIES
        const showAllBtn = page.locator('button:has-text("Show All")');
        if (await showAllBtn.isVisible()) {
            await showAllBtn.click();
            await page.waitForTimeout(1000); // Tunggu animasi ekspansi
        }
        const companies: string[] = [];
        // Pastikan kita menargetkan container desktop agar data yang didapat lengkap
        const desktopClientContainer = page.locator('.desktop-clients');
        // Ambil semua elemen gambar di dalam container tersebut
        const images = await desktopClientContainer.locator('img').all();
        for (const img of images) {
            const altText = await img.getAttribute('alt');
            if (altText) {
                // Membersihkan teks: "Logo OCBCBank" -> "OCBCBank"
                const cleanName = altText
                    .replace(/Logo/gi, '')
                    .replace(/Ruang/gi, '')
                    .trim();
                if (cleanName && !companies.includes(cleanName)) {
                    companies.push(cleanName);
                }
            }
        }
        const cleanCompanies = companies.join(', ');
        logger.info(`Companies: ${cleanCompanies}`);


        // 3. SOLUTIONS & PRODUCTS
        const solutionSections: Array<{ title: string; desc: string }> = [];
        // Targetkan container grid yang membungkus semua kartu solusi
        const solutionCards = await page.locator('div.grid.grid-cols-1 div.rounded-lg.p-6').all();
        for (const card of solutionCards) {
            // Ambil Judul dari h3
            const title = await card.locator('h3').innerText();
            // Ambil Deskripsi dari p
            const desc = await card.locator('p').innerText();
            if (title && desc) {
                solutionSections.push({
                    title: title.trim(),
                    desc: desc.trim()
                });
            }
        }
        logger.info(`Solutions: ${solutionSections}`);


        // 4. TECH SOLUTIONS (TAB INTERACTION)
        const techSolutions: Record<string, string[]> = {};
        // Ambil semua tombol tab yang ada di dalam role="tablist"
        const tabs = await page.locator('div[role="tablist"] button[role="tab"]').all();
        for (const tab of tabs) {
            const tabName = (await tab.innerText()).trim();
            // Klik tab untuk mengaktifkan kontennya
            await tab.click();
            // Tunggu sebentar agar transisi konten selesai
            await page.waitForTimeout(500);
            // Cari tabpanel yang sedang aktif (data-state="active")
            const activePanel = page.locator('div[role="tabpanel"][data-state="active"]');
            // Ekstrak semua judul item (h3) di dalam panel tersebut
            const items = await activePanel.locator('h3').allInnerTexts();
            techSolutions[tabName] = items.map(item => item.trim());
            logger.info(`Extracted Tech Solutions for tab [${tabName}]: ${techSolutions[tabName].length} items`);
        }
        // Format data untuk tabel HTML nanti
        const techSolutionsHtml = Object.entries(techSolutions)
            .map(([tab, items]) => `<b>${tab}</b>: ${items.join(', ')}`)
            .join('<br/><br/>');
        logger.info(`TECH SOLUTIONS: ${techSolutionsHtml}`);


        // 5. PRODUCTS & TOOLS (TAB INTERACTION)
        const productAndTools: Record<string, string[]> = {};
        // Identifikasi container Products & Tools (biasanya section setelah Tech Solutions)
        const productSection = page.locator('section:has-text("Sequence Products & Tools")');
        // Ambil semua tombol tab dalam section tersebut
        const productTabs = await productSection.locator('div[role="tablist"] button[role="tab"]').all();
        for (const tab of productTabs) {
            const tabName = (await tab.innerText()).trim();
            await tab.click();
            await page.waitForTimeout(600);

            // Ambil panel yang sedang aktif (data-state="active")
            const activePanel = productSection.locator('div[role="tabpanel"][data-state="active"]');
            // Ekstrak judul produk (berdasarkan gambar sebelumnya, produk menggunakan h3 atau h4)
            const productNames = await activePanel.locator('h3').allInnerTexts();
            // Bersihkan data dan simpan ke object
            productAndTools[tabName] = productNames
                .map(name => name.trim())
                .filter(name => name.length > 0);
            logger.info(`Extracted Products for tab [${tabName}]: ${productAndTools[tabName].length} items`);
        }
        // Format hasil untuk ditampilkan di tabel HTML
        const productsHtml = Object.entries(productAndTools)
            .map(([tab, items]) => `<b>${tab}</b>: ${items.length > 0 ? items.join(', ') : 'No products found'}`)
            .join('<br/><br/>');
        logger.info(` PRODUCTS & TOOLS: ${productsHtml}`);


        // CONSTRUCT HTML TABLE
        const htmlTable = `
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
                <h2>Sequence Data Extraction Result</h2>
                <p>Source: ${url}</p>
                <table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif;">
                <tr style="background-color: #1a1a1a; color: white;">
                    <th style="padding: 12px;">Category</th>
                    <th style="padding: 12px;">Data</th>
                </tr>
                <tr>
                    <td><b>Title</b></td>
                    <td>${heroTitle.trim()} <br/> ${heroSub.trim()}</td>
                </tr>
                <tr>
                    <td><b>Preferred by Industry Leaders</b></td>
                    <td>${cleanCompanies}</td>
                </tr>
                <tr>
                    <td><b>Solutions</b></td>
                    <td>
                        ${solutionSections.map(s => `<b>${s.title}</b>: ${s.desc}`).join('<br/><br/>')}
                    </td>
                </tr>
                <tr>
                    <td><b>Tech Solutions</b></td>
                    <td>
                        ${techSolutionsHtml}
                    </td>
                </tr>
                <tr>
                    <td><b>Products And Tools </b></td>
                    <td>
                        ${productsHtml}
                    </td>
                </tr>
                </table>
            </body>
            </html>`;


        const fileName = `sequence_table_${Date.now()}.html`;
        const filePath = path.join(config.outputDir, fileName);

        await fs.mkdir(config.outputDir, { recursive: true });
        await fs.writeFile(filePath, htmlTable, 'utf-8');

        return filePath;
    } catch (error: any) {
        logger.error(`Sequence scrape failed: ${error.message}`);
        throw error;
    } finally {
        await context.close();
    }
};