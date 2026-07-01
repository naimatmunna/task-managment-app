/**
 * Parse pagination/sort/search/filter params from a query string into a
 * normalized options object consumed by the repository layer.
 *
 * Supported query params:
 *   ?page=1&limit=20&sort=-createdAt&search=jane&fields=name,email&role=admin
 */
export const parseQueryOptions = (query = {}, { maxLimit = 100, searchableFields = [] } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // Sorting: "-createdAt,name" -> { createdAt: -1, name: 1 }
  const sort = {};
  if (query.sort) {
    query.sort
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((field) => {
        if (field.startsWith('-')) sort[field.slice(1)] = -1;
        else sort[field] = 1;
      });
  } else {
    sort.createdAt = -1;
  }

  // Field projection: "name,email" -> "name email"
  const projection = query.fields
    ? query.fields.split(',').map((f) => f.trim()).filter(Boolean).join(' ')
    : undefined;

  // Reserved params are not treated as filters.
  const reserved = new Set(['page', 'limit', 'sort', 'fields', 'search']);
  const filter = {};
  Object.entries(query).forEach(([key, value]) => {
    if (!reserved.has(key)) filter[key] = value;
  });

  // Full-text-ish search across whitelisted fields via case-insensitive regex.
  if (query.search && searchableFields.length > 0) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = searchableFields.map((field) => ({ [field]: rx }));
  }

  return { page, limit, skip, sort, projection, filter };
};

export const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
