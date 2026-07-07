import { config } from '@/config/env.js';
import { getAccessToken } from '@/lib/token.js';
import { store } from '@/store/index.js';

/**
 * Download a task-list export (PDF or Word). RTK Query isn't suited to
 * authenticated binary downloads, so we fetch with the same auth + org headers
 * and save the response as a file.
 */
export const downloadTaskExport = async (format, params = {}, scopeLabel = '', filename = '') => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  qs.set('format', format);
  if (scopeLabel) qs.set('scopeLabel', scopeLabel);

  const orgId = store.getState()?.org?.activeOrgId;
  const res = await fetch(`${config.apiBaseUrl}/tasks/export?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      ...(orgId ? { 'x-org-id': orgId } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Export failed');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const ext = format === 'docx' ? 'docx' : 'pdf';
  const base = (filename || `task-list-${new Date().toISOString().slice(0, 10)}`).slice(0, 120);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
