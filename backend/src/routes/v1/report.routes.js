import { Router } from 'express';
import * as reportController from '../../controllers/report.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { resolveOrg } from '../../middlewares/resolveOrg.js';
import { reportQuerySchema, exportQuerySchema } from '../../validators/report.validator.js';

const router = Router();

router.use(authenticate, resolveOrg);

router.get('/', validate(reportQuerySchema), reportController.getReport);
router.get('/export', validate(exportQuerySchema), reportController.exportReport);
router.post('/email', validate(reportQuerySchema), reportController.emailReport);

export default router;
