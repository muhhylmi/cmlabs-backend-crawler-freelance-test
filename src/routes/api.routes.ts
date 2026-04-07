import { Router } from 'express';
import { triggerCrawl, checkStatus, scrapeCmlabs, handleSequenceScrape } from '../controllers/crawl.controller';

const router = Router();

router.post('/crawl', triggerCrawl);
router.get('/status/:jobId', checkStatus);
router.get('/scrape/cmlabs', scrapeCmlabs);
router.get('/scrape/sequence', handleSequenceScrape);

export default router;