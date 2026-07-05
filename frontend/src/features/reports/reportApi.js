import { apiSlice } from '@/api/apiSlice.js';
import { config } from '@/config/env.js';
import { getAccessToken } from '@/lib/token.js';
import { store } from '@/store/index.js';

const toParams = (filters = {}) => {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, v);
  });
  return p;
};

export const reportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    report: builder.query({
      query: (filters) => ({ url: '/reports', params: Object.fromEntries(toParams(filters)) }),
      transformResponse: (r) => r.data.report,
      providesTags: ['Report'],
    }),
    emailReport: builder.mutation({
      query: (filters) => ({ url: '/reports/email', method: 'POST', body: {}, params: Object.fromEntries(toParams(filters)) }),
    }),
  }),
});

export const { useReportQuery, useEmailReportMutation } = reportApi;

/**
 * Download a CSV/PDF export. RTK Query isn't suited to authenticated blob
 * downloads, so we fetch directly with the same auth + org headers and save
 * the response as a file.
 */
export const downloadReport = async (format, filters) => {
  const params = toParams({ ...filters, format });
  const orgId = store.getState()?.org?.activeOrgId;
  const res = await fetch(`${config.apiBaseUrl}/reports/export?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      ...(orgId ? { 'x-org-id': orgId } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `propvia-report.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
