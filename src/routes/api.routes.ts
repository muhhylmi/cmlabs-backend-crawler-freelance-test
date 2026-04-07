import { Router } from 'express';
import { triggerCrawl, checkStatus, scrapeCmlabs } from '../controllers/crawl.controller';

const router = Router();

router.post('/crawl', triggerCrawl);
router.get('/status/:jobId', checkStatus);
router.get('/scrape/cmlabs', scrapeCmlabs);

export default router;