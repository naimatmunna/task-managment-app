import { z } from 'zod';
import { ORG_ROLES } from '../constants/orgRoles.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const email = z.string().email().toLowerCase();
// Roles assignable via the API (owner is set only at creation / not transferable here).
const assignableRole = z.enum([ORG_ROLES.MEMBER, ORG_ROLES.ADMIN]);

export const createOrgSchema = {
  body: z.object({ name: z.string().min(2).max(120) }),
};

export const updateOrgSchema = {
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    settings: z
      .object({
        timezone: z.string().min(1).max(64).optional(),
        workWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
      })
      .optional(),
  }),
};

export const inviteMemberSchema = {
  body: z.object({ email, role: assignableRole.default(ORG_ROLES.MEMBER) }),
};

export const memberIdSchema = {
  params: z.object({ id: objectId }),
};

export const updateRoleSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ role: assignableRole }),
};

export const acceptInviteSchema = {
  body: z.object({
    token: z.string().min(10),
    name: z.string().min(2).max(120).optional(),
    password: z.string().min(8).max(128).optional(),
  }),
};

export const peekInviteSchema = {
  query: z.object({ token: z.string().min(10) }),
};
