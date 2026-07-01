import { FiSearch } from 'react-icons/fi';

export default function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative w-full max-w-sm">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
      />
    </div>
  );
}
