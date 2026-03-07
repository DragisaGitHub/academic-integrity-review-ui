import type { Document, DocumentAnalysis } from '../types';
import { mockAnalysis, mockDocuments } from '../data/mockData';
import { apiEndpoints } from '../api/endpoints';
import { getJson, HttpError } from '../api/http';

/**
 * Mock-backed documents service.
 *
 * Later, these functions can call real endpoints:
 * - POST /documents
 * - GET /history
 * - GET /analyses
 * - GET /analyses/{id}
 */
export function listDocuments(): Document[] {
  return mockDocuments;
}

export function getDocumentById(id: string): Document | null {
  if (!id) return null;

  for (const doc of mockDocuments) {
    if (doc.id === id) return doc;
  }

  return null;
}

export function getAnalysisById(id: string): DocumentAnalysis | null {
  if (!id) return null;

  // We currently only have one "full" mock analysis. Return it when it matches.
  if (mockAnalysis.id === id) return mockAnalysis;

  const doc = getDocumentById(id);
  if (!doc) return null;

  // For other valid documents, return a realistic skeleton analysis so the page can render
  // a correct document context without redesigning the UI.
  return {
    ...doc,
    findings: [],
    summary: {
      missingCitations: 0,
      suspiciousReferences: 0,
      factualIssues: 0,
      styleInconsistencies: 0,
      unsupportedClaims: 0,
    },
    fullText: '',
  };
}

function isNotFoundError(error: unknown): error is HttpError {
  return error instanceof HttpError && error.status === 404;
}

/**
 * Async API-backed variant of {@link listDocuments}.
 *
 * Not used by pages yet; safe to add for incremental backend adoption.
 */
export async function listDocumentsAsync(init?: Omit<RequestInit, 'method'>): Promise<Document[]> {
  return getJson<Document[]>(apiEndpoints.documents, init);
}

/**
 * Async API-backed variant of {@link getDocumentById}.
 *
 * Mirrors the sync behavior by returning `null` for missing/empty ids and 404s.
 */
export async function getDocumentByIdAsync(
  id: string,
  init?: Omit<RequestInit, 'method'>,
): Promise<Document | null> {
  if (!id) return null;

  try {
    return await getJson<Document>(`${apiEndpoints.documents}/${encodeURIComponent(id)}`, init);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

/**
 * Async API-backed variant of {@link getAnalysisById}.
 *
 * Mirrors the sync behavior by returning `null` for missing/empty ids and 404s.
 */
export async function getAnalysisByIdAsync(
  id: string,
  init?: Omit<RequestInit, 'method'>,
): Promise<DocumentAnalysis | null> {
  if (!id) return null;

  try {
    return await getJson<DocumentAnalysis>(apiEndpoints.analysis(id), init);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}
