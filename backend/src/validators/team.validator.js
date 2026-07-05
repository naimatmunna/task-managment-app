import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #4f46e5');

export const createTeamSchema = {
  body: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    color: color.optional(),
    memberIds: z.array(objectId).optional(),
    leadId: objectId.nullable().optional(),
  }),
};

export const updateTeamSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    color: color.optional(),
    memberIds: z.array(objectId).optional(),
    leadId: objectId.nullable().optional(),
  }),
};

export const teamIdSchema = {
  params: z.object({ id: objectId }),
};
