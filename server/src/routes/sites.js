import { Router } from 'express';
import { createSite, deleteSite, getSite, listSites, scanSite, updateSite } from '../controllers/sitesController.js';
import { getScan, listScans } from '../controllers/scansController.js';
import { scanLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.get('/', listSites);
router.post('/', createSite);
router.get('/:id', getSite);
router.put('/:id', updateSite);
router.delete('/:id', deleteSite);
router.post('/:id/scan', scanLimiter, scanSite);
router.get('/:id/scans', listScans);
router.get('/:id/scans/:scanId', getScan);
export default router;
