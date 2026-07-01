import { Router } from 'express';
import v1Routes from './v1/index.js';

/**
 * API version registry. Mount future versions (v2, ...) here without
 * touching existing consumers.
 */
const router = Router();
router.use('/v1', v1Routes);
export default router;
