/**
 * Validation middleware factory. Accepts a Zod schema keyed by request part
 * ({ body, query, params }) and replaces each part with the parsed/coerced value.
 */
export const validate = (schema) => (req, _res, next) => {
  try {
    if (schema.body) req.body = schema.body.parse(req.body);
    if (schema.query) req.validatedQuery = schema.query.parse(req.query);
    if (schema.params) req.params = schema.params.parse(req.params);
    next();
  } catch (err) {
    next(err);
  }
};
