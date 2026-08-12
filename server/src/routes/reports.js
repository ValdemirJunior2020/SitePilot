import { Router } from 'express';
import { getReport } from '../controllers/reportsController.js';
const router = Router();
router.get('/reports', getReport);
export default router;
