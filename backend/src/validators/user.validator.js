import { z } from 'zod';
import { ROLE_VALUES } from '../constants/roles.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    search: z.string().optional(),
    fields: z.string().optional(),
  }).passthrough(),
};

export const userIdSchema = {
  params: z.object({ id: objectId }),
};

export const createUserSchema = {
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
    roles: z.array(z.enum(ROLE_VALUES)).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateUserSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    roles: z.array(z.enum(ROLE_VALUES)).optional(),
    isActive: z.boolean().optional(),
  }).refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' }),
};
