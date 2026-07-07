import { Router } from 'express';
import * as releaseController from '../../controllers/release.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { resolveOrg, requireOrgRole } from '../../middlewares/resolveOrg.js';
import { ORG_ROLES } from '../../constants/orgRoles.js';
import {
  createReleaseSchema,
  updateReleaseSchema,
  releaseIdSchema,
  exportReleaseSchema,
} from '../../validators/release.validator.js';

const router = Router();

router.use(authenticate, resolveOrg);

// Viewing + exporting is open to any member.
router.get('/', releaseController.listReleases);
router.get('/:id/export', validate(exportReleaseSchema), releaseController.exportRelease);
router.get('/:id', validate(releaseIdSchema), releaseController.getRelease);

// Managing is restricted to owners/admins.
router.post('/', requireOrgRole(ORG_ROLES.ADMIN), validate(createReleaseSchema), releaseController.createRelease);
router.patch('/:id', requireOrgRole(ORG_ROLES.ADMIN), validate(updateReleaseSchema), releaseController.updateRelease);
router.post('/:id/regenerate', requireOrgRole(ORG_ROLES.ADMIN), validate(releaseIdSchema), releaseController.regenerateRelease);
router.delete('/:id', requireOrgRole(ORG_ROLES.ADMIN), validate(releaseIdSchema), releaseController.deleteRelease);

export default router;
