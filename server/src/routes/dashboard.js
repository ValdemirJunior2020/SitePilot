import { Router } from 'express';
import { getActivity, getDashboard } from '../controllers/dashboardController.js';
const router = Router();
router.get('/dashboard', getDashboard);
router.get('/activity', getActivity);
export default router;
