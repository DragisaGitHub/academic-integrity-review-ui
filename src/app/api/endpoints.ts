/**
 * API endpoint paths.
 *
 * Keep these as *paths* (not full URLs). Use `buildApiUrl()` to apply base URL.
 */
export const apiEndpoints = {
  documents: '/documents',
  analyses: '/analyses',
  analysis: (id: string) => `/analyses/${encodeURIComponent(id)}`,
  findings: (analysisId: string) => `/analyses/${encodeURIComponent(analysisId)}/findings`,
  notes: (analysisId: string) => `/analyses/${encodeURIComponent(analysisId)}/notes`,
  history: '/history',
  settings: '/settings',
  dashboardKpis: '/dashboard/kpis',
} as const;
