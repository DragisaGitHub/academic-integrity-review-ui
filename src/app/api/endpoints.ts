/**
 * API endpoint paths.
 *
 * Keep these as *paths* (not full URLs). Use `buildApiUrl()` to apply base URL.
 */
export const apiEndpoints = {
  authLogin: '/api/auth/login',
  authMe: '/api/auth/me',
  authPassword: '/api/auth/password',

  settingsApi: '/api/settings',
  notifications: '/api/notifications',
  notificationRead: (id: string) => `/api/notifications/${encodeURIComponent(id)}/read`,
  notificationsReadAll: '/api/notifications/read-all',

  users: '/api/users',
  user: (userId: string) => `/api/users/${encodeURIComponent(userId)}`,
  userPassword: (userId: string) => `/api/users/${encodeURIComponent(userId)}/password`,

  documents: '/api/documents',
  document: (id: string) => `/api/documents/${encodeURIComponent(id)}`,
  documentsExport: '/api/documents/export',
  documentReviewNote: (documentId: string) => `/api/documents/${encodeURIComponent(documentId)}/review-note`,
  documentUpload: '/api/documents/upload',

  // Backend-backed analyses flow
  analysisByDocumentId: (documentId: string) => `/api/analyses/document/${encodeURIComponent(documentId)}`,
  analysisStatus: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/status`,
  analysisRetry: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/retry`,
  analysisNotes: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/notes`,
  analysisTextSegments: (analysisId: string, from: number, to: number) =>
    `/api/analyses/${encodeURIComponent(analysisId)}/text/segments?from=${encodeURIComponent(String(from))}&to=${encodeURIComponent(String(to))}`,
  analysisFindings: (analysisId: string) => `/api/analyses/${encodeURIComponent(analysisId)}/findings`,
  analysisFinding: (analysisId: string, findingId: string) =>
    `/api/analyses/${encodeURIComponent(analysisId)}/findings/${encodeURIComponent(findingId)}`,
  analysisCreate: '/api/analyses',
  analysesApi: '/api/analyses',
  history: '/history',
  settings: '/settings',
  dashboardKpis: '/dashboard/kpis',
} as const;
