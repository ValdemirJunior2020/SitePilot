import { Router } from 'express'
import {
  checkPrice,
  createPriceWatch,
  deletePriceWatch,
  getPriceWatch,
  listPriceChecks,
  listPriceWatches,
  searchDeals,
  updatePriceWatch
} from '../controllers/priceWatchController.js'
import { scanLimiter } from '../middleware/rateLimit.js'

const router = Router()
router.get('/', listPriceWatches)
router.post('/', createPriceWatch)
router.get('/:id', getPriceWatch)
router.put('/:id', updatePriceWatch)
router.delete('/:id', deletePriceWatch)
router.post('/:id/check', scanLimiter, checkPrice)
router.get('/:id/checks', listPriceChecks)
router.get('/:id/deals', searchDeals)
export default router
