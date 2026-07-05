import { Router } from 'express';
import * as teamController from '../../controllers/team.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { resolveOrg, requireOrgRole } from '../../middlewares/resolveOrg.js';
import { ORG_ROLES } from '../../constants/orgRoles.js';
import { createTeamSchema, updateTeamSchema, teamIdSchema } from '../../validators/team.validator.js';

const router = Router();

// All team routes are authenticated and org-scoped.
router.use(authenticate, resolveOrg);

// Any member can view teams.
router.get('/', teamController.listTeams);
router.get('/:id', validate(teamIdSchema), teamController.getTeam);

// Managing teams requires admin (or owner).
router.post('/', requireOrgRole(ORG_ROLES.ADMIN), validate(createTeamSchema), teamController.createTeam);
router.patch('/:id', requireOrgRole(ORG_ROLES.ADMIN), validate(updateTeamSchema), teamController.updateTeam);
router.delete('/:id', requireOrgRole(ORG_ROLES.ADMIN), validate(teamIdSchema), teamController.deleteTeam);

export default router;
