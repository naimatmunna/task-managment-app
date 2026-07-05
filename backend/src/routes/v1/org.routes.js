import { Router } from 'express';
import * as orgController from '../../controllers/org.controller.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { resolveOrg, requireOrgRole } from '../../middlewares/resolveOrg.js';
import { ORG_ROLES } from '../../constants/orgRoles.js';
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  memberIdSchema,
  updateRoleSchema,
  acceptInviteSchema,
  peekInviteSchema,
} from '../../validators/org.validator.js';

const router = Router();

// Public invite endpoints (no auth, no org context).
router.get('/invite', validate(peekInviteSchema), orgController.peekInvite);
router.post('/invite/accept', validate(acceptInviteSchema), orgController.acceptInvite);

// Everything below requires an authenticated user.
router.use(authenticate);

// Create a brand-new organization (no active-org context needed).
router.post('/', validate(createOrgSchema), orgController.createOrg);

// Active-organization operations (scoped by resolveOrg → req.orgId).
router.get('/current', resolveOrg, orgController.getOrg);
router.patch('/current', resolveOrg, requireOrgRole(ORG_ROLES.ADMIN), validate(updateOrgSchema), orgController.updateOrg);

router.get('/members', resolveOrg, orgController.listMembers);
router.post('/members/invite', resolveOrg, requireOrgRole(ORG_ROLES.ADMIN), validate(inviteMemberSchema), orgController.inviteMember);
router.patch('/members/:id/role', resolveOrg, requireOrgRole(ORG_ROLES.ADMIN), validate(updateRoleSchema), orgController.updateMemberRole);
router.delete('/members/:id', resolveOrg, requireOrgRole(ORG_ROLES.ADMIN), validate(memberIdSchema), orgController.removeMember);

export default router;
