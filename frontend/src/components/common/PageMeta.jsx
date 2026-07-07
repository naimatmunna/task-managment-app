import { Helmet } from 'react-helmet-async';
import { config } from '@/config/env.js';

const DEFAULT_DESCRIPTION = `${config.appName} helps teams plan, assign, and track work with boards, tasks, and reports.`;

/** Sets document title/description per page. */
export default function PageMeta({ title, description }) {
  const fullTitle = title ? `${title} · ${config.appName}` : `${config.appName} — Team task management`;
  const desc = description ?? DEFAULT_DESCRIPTION;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
