/** Tiny classnames joiner (falsy values skipped). */
export const cn = (...args) => args.filter(Boolean).join(' ');
