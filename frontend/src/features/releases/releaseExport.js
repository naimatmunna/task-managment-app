import { config } from '@/config/env.js';
import { getAccessToken } from '@/lib/token.js';
import { store } from '@/store/index.js';

/** Download a release note as PDF or Word, saved with a friendly filename. */
export const downloadReleaseExport = async (id, format, filename = '') => {
  const orgId = store.getState()?.org?.activeOrgId;
  const res = await fetch(`${config.apiBaseUrl}/release-notes/${id}/export?format=${format}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      ...(orgId ? { 'x-org-id': orgId } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Export failed');

  const blob = await res.blob();
  const ext = format === 'docx' ? 'docx' : 'pdf';
  const base = (filename || `release-${new Date().toISOString().slice(0, 10)}`)
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
