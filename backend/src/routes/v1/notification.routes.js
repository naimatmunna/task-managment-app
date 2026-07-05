import { Router } from 'express';
import * as notificationController from '../../controllers/notification.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { resolveOrg } from '../../middlewares/resolveOrg.js';
import { z } from 'zod';

const router = Router();
const idSchema = { params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') }) };

router.use(authenticate, resolveOrg);

router.get('/', notificationController.listNotifications);
router.post('/read-all', notificationController.markAllRead);
router.post('/:id/read', validate(idSchema), notificationController.markRead);

export default router;
