/**
 * Wraps an async route handler so rejected promises flow to next()
 * and hit the global error handler — no try/catch in every controller.
 */
const catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default catchAsync;
