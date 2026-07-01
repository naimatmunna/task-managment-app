/**
 * Re-export of http-status-codes so the rest of the app depends on an
 * internal constant module (easy to swap/extend) rather than a library path.
 */
export { StatusCodes as HTTP_STATUS, ReasonPhrases as HTTP_REASON } from 'http-status-codes';
