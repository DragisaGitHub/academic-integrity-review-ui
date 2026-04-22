/**
 * API endpoint paths.
 *
 * Keep these as *paths* (not full URLs). Use `buildApiUrl()` to apply base URL.
 */
export const apiEndpoints = {
  settingsApi: '/api/settings',
  notifications: '/api/notifications',
  notificationRead: (id: string) => `/api/notifications/${encodeURIComponent(id)}/read`,
  notificationsReadAll: '/api/notifications/read-all',

  documents: '/api/documents',
  document: (id: string) => `/api/documents/${encodeURIComponent(id)}`,
  documentsExport: '/api/documents/export',
  documentReviewNote: (documentId: string) => `/api/documents/${encodeURIComponent(documentId)}/review-note`,
  documentUpload: '/api/documents/upload',

  // Backend-backed analysis read flow (Analysis page only, incremental adoption)
  analysisByDocumentId: (documentId: string) => `/api/analyses/document/${encodeURIComponent(documentId)}`,
  analysisFindings: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/findings`,
  analysisFinding: (analysisId: string, findingId: string) =>
    `/api/analyses/${encodeURIComponent(analysisId)}/findings/${encodeURIComponent(findingId)}`,
  analysisStatus: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/status`,
  analysisRetry: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/retry`,
  analysisNotes: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/notes`,
  analysisCreate: '/api/analyses',
  analysesApi: '/api/analyses',

  analyses: '/analyses',
  analysis: (id: string) => `/analyses/${encodeURIComponent(id)}`,
  findings: (analysisId: string) => `/analyses/${encodeURIComponent(analysisId)}/findings`,
  notes: (analysisId: string) => `/analyses/${encodeURIComponent(analysisId)}/notes`,
  history: '/history',
  settings: '/settings',
  dashboardKpis: '/dashboard/kpis',
} as const;
