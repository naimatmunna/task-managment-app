/** Extract a human-readable message from an RTK Query error object. */
export const getApiErrorMessage = (error, fallback = 'Something went wrong') => {
  if (!error) return fallback;
  return (
    error?.data?.message ||
    error?.error ||
    (typeof error?.status === 'number' ? `Request failed (${error.status})` : fallback)
  );
};
