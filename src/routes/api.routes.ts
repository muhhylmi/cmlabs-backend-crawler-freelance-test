import { Router } from 'express';
import { triggerCrawl, checkStatus, scrapeCmlabs, handleSequenceScrape, handleScrapeStarbuck } from '../controllers/crawl.controller';

const router = Router();

router.post('/crawl', triggerCrawl);
router.get('/status/:jobId', checkStatus);
router.get('/scrape/cmlabs', scrapeCmlabs);
router.get('/scrape/sequence', handleSequenceScrape);
router.get('/scrape/starbuck', handleScrapeStarbuck);


export default router;