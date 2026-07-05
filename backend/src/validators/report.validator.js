import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const shared = {
  range: z.enum(['daily', 'weekly', 'monthly', 'custom']).optional(),
  scope: z.enum(['org', 'team', 'me']).optional(),
  teamId: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
};

export const reportQuerySchema = {
  query: z.object(shared),
};

export const exportQuerySchema = {
  query: z.object({ ...shared, format: z.enum(['csv', 'pdf']).default('csv') }),
};
