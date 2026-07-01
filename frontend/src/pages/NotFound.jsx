import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <PageMeta title="Not found" />
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to={ROUTES.HOME} className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">
        Go home
      </Link>
    </div>
  );
}
