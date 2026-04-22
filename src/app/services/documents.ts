import type { AnalysisStatus, Document, FinalDecision, ReviewPriority, ReviewStatus } from '../types';
import { apiEndpoints } from '../api';
import { buildApiUrl, deleteJson, getJson, HttpError, putJson, requestJson } from '../api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type DocumentDto = Partial<{
  id: string | number;
  documentId: string | number;
  title: string;
  studentName: string;
  student: string;
  course: string;
  academicYear: string;
  submissionDate: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  analysisDate: string;
  hasAnalysis: boolean;
  analysisId: string | number | null;
  analysisStatus: string;
  analysisErrorMessage: string | null;
  hasReviewNote: boolean;
  finalDecision: string | null;
  reviewPriority: string;
  priority: string;
  status: string;
  reviewStatus: string;
}>;

function isReviewPriority(value: unknown): value is ReviewPriority {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === 'pending' || value === 'in-review' || value === 'reviewed' || value === 'flagged';
}

function parseReviewPriority(value: unknown): ReviewPriority {
  if (typeof value !== 'string') return 'low';
  const normalized = value.trim().toLowerCase();
  if (isReviewPriority(normalized)) return normalized;

  if (normalized.includes('high')) return 'high';
  if (normalized.includes('med')) return 'medium';
  return 'low';
}

function parseReviewStatus(value: unknown): ReviewStatus {
  if (typeof value !== 'string') return 'pending';
  const normalized = value.trim().toLowerCase();
  if (isReviewStatus(normalized)) return normalized;

  // Common enum formats like IN_REVIEW / inReview / reviewed
  const compact = normalized.replace(/[_\s]/g, '-');
  if (isReviewStatus(compact)) return compact;

  if (normalized.includes('flag')) return 'flagged';
  if (normalized.includes('review') && normalized.includes('in')) return 'in-review';
  if (normalized.includes('review')) return 'reviewed';
  return 'pending';
}

export function parseAnalysisStatus(value: unknown): AnalysisStatus | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'PENDING':
      return 'pending';
    case 'EXTRACTING':
      return 'extracting';
    case 'ANALYZING':
      return 'analyzing';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    default:
      return undefined;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseFinalDecision(value: unknown): FinalDecision {
  if (value === null || value === undefined) return null;
  const raw = (asString(value) ?? '').trim();
  if (!raw) return null;

  const normalized = raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/--+/g, '-');

  switch (normalized) {
    case 'accept':
      return 'accept';
    case 'accept-with-revisions':
    case 'accept-revisions':
    case 'accept-with-revision':
      return 'accept-with-revisions';
    case 'request-clarification':
    case 'clarification':
    case 'request-clarifications':
      return 'request-clarification';
    case 'escalate':
    case 'escalate-for-review':
    case 'escalate-further-review':
      return 'escalate';
    default:
      return null;
  }
}

function mapDocumentDtoToDocument(dto: DocumentDto): Document {
  const submissionDate = dto.submissionDate ?? dto.submittedAt ?? dto.createdAt;
  const analysisDate = dto.analysisDate;

  return {
    id: String(dto.id ?? dto.documentId ?? ''),
    title: dto.title ?? '(Untitled)',
    studentName: dto.studentName ?? dto.student ?? 'Unknown',
    course: dto.course ?? '',
    academicYear: dto.academicYear ?? '',
    submissionDate,
    analysisDate,
    reviewPriority: parseReviewPriority(dto.reviewPriority ?? dto.priority),
    status: parseReviewStatus(dto.reviewStatus ?? dto.status),
    finalDecision: parseFinalDecision(dto.finalDecision),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    hasAnalysis: dto.hasAnalysis,
    analysisId: dto.analysisId === undefined ? undefined : dto.analysisId === null ? null : String(dto.analysisId),
    analysisStatus: parseAnalysisStatus(dto.analysisStatus),
    analysisErrorMessage: dto.analysisErrorMessage ?? undefined,
    hasReviewNote: dto.hasReviewNote,
  };
}

/**
 * API-backed document upload.
 *
 * POST /api/documents/upload (multipart/form-data)
 *
 * Returns the created document mapped into the frontend `Document` model.
 */
export interface DocumentUploadRequest {
  file: File;
  title: string;
  studentName: string;
  course: string;
  academicYear: string;
  reviewPriority: ReviewPriority;
}

export interface DocumentUpdateRequest {
  title?: string;
  studentName?: string;
  course?: string;
  academicYear?: string;
}

export interface DocumentExportFilters {
  search?: string;
  course?: string;
  priority?: string;
  status?: string;
}

function toBackendReviewPriority(priority: ReviewPriority): 'LOW' | 'MEDIUM' | 'HIGH' {
  switch (priority) {
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    case 'low':
    default:
      return 'LOW';
  }
}

export async function uploadDocumentToApi(request: DocumentUploadRequest): Promise<Document> {
  const form = new FormData();
  // Backend contract: multipart field name is "file".
  form.append('file', request.file);
  form.append('title', request.title);
  form.append('studentName', request.studentName);
  form.append('course', request.course);
  form.append('academicYear', request.academicYear);
  form.append('reviewPriority', toBackendReviewPriority(request.reviewPriority));

  const payload = await requestJson<unknown>(apiEndpoints.documentUpload, {
    method: 'POST',
    body: form,
  });

  if (!isRecord(payload)) {
    throw new Error('Upload succeeded but returned an unexpected payload.');
  }

  const document = mapDocumentDtoToDocument(payload as DocumentDto);
  if (!document.id) {
    throw new Error('Upload succeeded but no document id was returned.');
  }

  return document;
}

/**
 * API-backed document list.
 */
export async function listDocumentsFromApi(): Promise<Document[]> {
  const payload = await getJson<unknown>(apiEndpoints.documents);
  if (!Array.isArray(payload)) return [];

  return (payload as DocumentDto[])
    .map(mapDocumentDtoToDocument)
    .filter((doc) => Boolean(doc.id));
}

/**
 * API-backed document details.
 *
 * Returns `null` when the backend reports 404.
 */
export async function getDocumentByIdFromApi(id: string): Promise<Document | null> {
  if (!id) return null;

  try {
    const payload = await getJson<unknown>(apiEndpoints.document(id));
    if (!isRecord(payload)) return null;

    const doc = mapDocumentDtoToDocument(payload as DocumentDto);
    return doc.id ? doc : null;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function deleteDocumentFromApi(id: string): Promise<void> {
  if (!id) return;

  await deleteJson<void>(apiEndpoints.document(id));
}

export async function updateDocumentToApi(id: string, request: DocumentUpdateRequest): Promise<Document> {
  if (!id) {
    throw new Error('Document id is required to update a document.');
  }

  const payload = await putJson<unknown, DocumentUpdateRequest>(apiEndpoints.document(id), request);
  if (!isRecord(payload)) {
    throw new Error('Document update returned an unexpected payload.');
  }

  const document = mapDocumentDtoToDocument(payload as DocumentDto);
  if (!document.id) {
    throw new Error('Document update succeeded but no document id was returned.');
  }

  return document;
}

function buildExportUrl(filters: DocumentExportFilters): string {
  const baseUrl = buildApiUrl(apiEndpoints.documentsExport);
  const url = new URL(baseUrl, window.location.origin);

  if (filters.search?.trim()) url.searchParams.set('search', filters.search.trim());
  if (filters.course && filters.course !== 'all') url.searchParams.set('course', filters.course);
  if (filters.priority && filters.priority !== 'all') url.searchParams.set('priority', filters.priority);
  if (filters.status && filters.status !== 'all') url.searchParams.set('status', filters.status);

  return url.toString();
}

function parseDownloadFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'analysis-history-export.csv';

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ?? 'analysis-history-export.csv';
}

export async function exportDocumentsFromApi(filters: DocumentExportFilters): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(buildExportUrl(filters), {
    method: 'GET',
    headers: {
      accept: 'text/csv,application/octet-stream,application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new HttpError({
      status: response.status,
      statusText: response.statusText,
      body,
    });
  }

  return {
    blob: await response.blob(),
    filename: parseDownloadFilename(response.headers.get('content-disposition')),
  };
}
