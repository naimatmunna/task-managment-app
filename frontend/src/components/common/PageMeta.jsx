import { Helmet } from 'react-helmet-async';
import { config } from '@/config/env.js';

/** Sets document title/description per page. */
export default function PageMeta({ title, description }) {
  return (
    <Helmet>
      <title>{title ? `${title} · ${config.appName}` : config.appName}</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  );
}
