import { nanoid } from 'nanoid';

/** Attach a correlation id to every request for traceable logs & error responses. */
export const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || nanoid(12);
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
