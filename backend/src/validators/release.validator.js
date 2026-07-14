import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createReleaseSchema = {
  body: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    // Explicit task selection. When present, only these (validated, deduped)
    // tasks are added. Omit for the legacy "everything completed in range" path.
    taskIds: z.array(objectId).max(2000).optional(),
    title: z.string().max(160).optional(),
    version: z.string().max(40).optional(),
    details: z.string().max(8000).optional(),
  }),
};

export const updateReleaseSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    title: z.string().min(1).max(160).optional(),
    version: z.string().max(40).optional(),
    details: z.string().max(8000).optional(),
  }),
};

export const releaseIdSchema = {
  params: z.object({ id: objectId }),
};

export const exportReleaseSchema = {
  params: z.object({ id: objectId }),
  query: z.object({ format: z.enum(['pdf', 'docx']).default('pdf') }),
};
