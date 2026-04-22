import type {
  AnalysisDetails,
  AnalysisStatus,
  AnalysisSummary,
  Finding,
  FindingCategory,
  FindingSeverity,
} from '../types';
import { apiEndpoints } from '../api';
import { getJson, HttpError, patchJson, postJson } from '../api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function emptySummary(): AnalysisSummary {
  return {
    missingCitations: 0,
    suspiciousReferences: 0,
    factualIssues: 0,
    styleInconsistencies: 0,
    unsupportedClaims: 0,
  };
}

export function computeSummaryFromFindings(findings: Finding[]): AnalysisSummary {
  return findings.reduce<AnalysisSummary>(
    (summary, finding) => {
      switch (finding.category) {
        case 'citation':
          summary.missingCitations += 1;
          break;
        case 'reference':
          summary.suspiciousReferences += 1;
          break;
        case 'fact':
          summary.factualIssues += 1;
          break;
        case 'style':
          summary.styleInconsistencies += 1;
          break;
        case 'claim':
          summary.unsupportedClaims += 1;
          break;
        case 'ai':
          // Keep AI findings visible in the UI tabs; summary cards are derived
          // from the UI's existing counters, and we intentionally don't
          // overload "Unsupported Claims" with AI findings.
          break;
        default:
          break;
      }
      return summary;
    },
    emptySummary(),
  );
}

function pickFirst<T>(...values: Array<T | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseCategory(value: unknown): FindingCategory {
  const raw = (asString(value) ?? '').trim();
  const normalized = raw.toUpperCase().replace(/\s+/g, '_');

  // Audited backend contract:
  // PLAGIARISM | AI_GENERATED_CONTENT | CITATION_ISSUE | PARAPHRASING | OTHER
  switch (normalized) {
    case 'CITATION_ISSUE':
      return 'citation';
    case 'PLAGIARISM':
      return 'reference';
    case 'AI_GENERATED_CONTENT':
      return 'ai';
    case 'PARAPHRASING':
      return 'style';
    case 'OTHER':
    default:
      return 'fact';
  }
}

function parseSeverity(value: unknown): FindingSeverity {
  const raw = (asString(value) ?? '').trim();
  const normalized = raw.toUpperCase().replace(/\s+/g, '_');

  // Audited backend contract: LOW | MEDIUM | HIGH | CRITICAL
  switch (normalized) {
    case 'LOW':
      return 'info';
    case 'MEDIUM':
      return 'warning';
    case 'HIGH':
    case 'CRITICAL':
      return 'critical';
    default:
      return 'info';
  }
}

function mapAnalysisDtoToDetails(payload: unknown, documentId: string): AnalysisDetails | null {
  if (!isRecord(payload)) return null;

  // Audited backend contract for GET /api/analyses/document/{documentId}:
  // { id:number, documentId:number, analysisDate:string|null, fullText:string|null, createdAt:string, updatedAt:string }
  const idValue = asNumber(payload.id);
  if (idValue === undefined) return null;

  const documentIdValue = asNumber(payload.documentId);
  if (documentIdValue === undefined) return null;
  const analysisDate = asString(payload.analysisDate);
  const fullText = asString(payload.fullText) ?? '';

  return {
    id: String(idValue),
    documentId: String(documentIdValue),
    analysisDate: analysisDate ?? undefined,
    summary: emptySummary(),
    fullText,
  };
}

export async function getAnalysisByDocumentIdFromApi(documentId: string): Promise<AnalysisDetails | null> {
  if (!documentId) return null;

  try {
    const payload = await getJson<unknown>(apiEndpoints.analysisByDocumentId(documentId));

    return mapAnalysisDtoToDetails(payload, documentId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

type FindingDto = Record<string, unknown>;

function parseParagraphLocation(value: unknown): number {
  // Audited backend contract: paragraphLocation is string | null.
  if (value === null || value === undefined) return -1;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return -1;

  const match = value.match(/-?\d+/);
  if (!match) return -1;

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : -1;
}

function mapFindingDto(dto: FindingDto, params: { documentId: string; analysisId: string; index: number }): Finding {
  // Audited backend contract fields:
  // id:number, category:enum, severity:enum, title:string,
  // explanation:string|null, excerpt:string|null, paragraphLocation:string|null,
  // suggestedAction:string|null
  const idValue = asNumber(dto.id);
  const id = idValue === undefined ? `${params.analysisId}-${params.index}` : String(idValue);

  const paragraphLocation = parseParagraphLocation(dto.paragraphLocation);
  const title = asString(dto.title) ?? 'Finding';
  const description = asString(dto.explanation) ?? '';
  const excerpt = asString(dto.excerpt) ?? '';
  const recommendation = asString(dto.suggestedAction) ?? '';
  const followUpQuestion = undefined;
  const professorNotes = asString(dto.professorNotes) ?? '';
  const reviewed = asBoolean(dto.reviewed) ?? false;
  const flaggedForFollowUp = asBoolean(dto.flaggedForFollowUp) ?? false;

  return {
    id,
    documentId: params.documentId,
    category: parseCategory(dto.category),
    severity: parseSeverity(dto.severity),
    title,
    description,
    excerpt,
    paragraphLocation,
    recommendation,
    followUpQuestion,
    reviewed,
    professorNotes,
    flaggedForFollowUp,
  };
}

export interface UpdateFindingRequest {
  professorNotes?: string;
  reviewed?: boolean;
  flaggedForFollowUp?: boolean;
}

type AnalysisListDto = Partial<{
  id: string | number;
  analysisId: string | number;
  documentId: string | number;
  status: string;
  analysisStatus: string;
  analysisDate: string;
  createdAt: string;
  updatedAt: string;
  errorMessage: string;
  message: string;
  title: string;
  documentTitle: string;
  studentName: string;
  student: string;
  course: string;
  document: Record<string, unknown>;
}>;

export interface AnalysisListItem {
  id: string;
  documentId?: string;
  title: string;
  studentName: string;
  course: string;
  status: AnalysisStatus;
  analysisDate?: string;
  createdAt?: string;
  updatedAt?: string;
  errorMessage?: string;
}

export async function updateFindingForAnalysisFromApi(params: {
  analysisId: string;
  documentId: string;
  findingId: string;
  updates: UpdateFindingRequest;
}): Promise<Finding> {
  const payload = await patchJson<unknown, UpdateFindingRequest>(
    apiEndpoints.analysisFinding(params.analysisId, params.findingId),
    params.updates,
  );

  if (!isRecord(payload)) {
    throw new Error('Finding update returned an unexpected payload shape.');
  }

  return mapFindingDto(payload, {
    analysisId: params.analysisId,
    documentId: params.documentId,
    index: 0,
  });
}

function mapAnalysisListDto(dto: AnalysisListDto, index: number): AnalysisListItem | null {
  const nestedDocument = isRecord(dto.document) ? dto.document : undefined;
  const numericId = asNumber(dto.id) ?? asNumber(dto.analysisId);
  const stringId = asString(dto.id) ?? asString(dto.analysisId);
  const id = stringId ?? (numericId !== undefined ? String(numericId) : undefined);
  if (!id) return null;

  const numericDocumentId = asNumber(dto.documentId) ?? asNumber(nestedDocument?.id) ?? asNumber(nestedDocument?.documentId);
  const stringDocumentId = asString(dto.documentId) ?? asString(nestedDocument?.id) ?? asString(nestedDocument?.documentId);
  const documentId = stringDocumentId ?? (numericDocumentId !== undefined ? String(numericDocumentId) : undefined);

  return {
    id,
    documentId,
    title:
      asString(dto.title) ??
      asString(dto.documentTitle) ??
      asString(nestedDocument?.title) ??
      (documentId ? `Document ${documentId}` : `Analysis ${index + 1}`),
    studentName:
      asString(dto.studentName) ??
      asString(dto.student) ??
      asString(nestedDocument?.studentName) ??
      asString(nestedDocument?.student) ??
      'Unknown',
    course: asString(dto.course) ?? asString(nestedDocument?.course) ?? '',
    status: parseAnalysisStatus(dto.analysisStatus ?? dto.status),
    analysisDate: asString(dto.analysisDate),
    createdAt: asString(dto.createdAt),
    updatedAt: asString(dto.updatedAt),
    errorMessage: asString(dto.errorMessage) ?? asString(dto.message),
  };
}

export async function listAnalysesFromApi(): Promise<AnalysisListItem[]> {
  const payload = await getJson<unknown>(apiEndpoints.analysesApi);
  if (!Array.isArray(payload)) return [];

  return payload
    .filter(isRecord)
    .map((dto, index) => mapAnalysisListDto(dto as AnalysisListDto, index))
    .filter((analysis): analysis is AnalysisListItem => Boolean(analysis));
}

export async function saveAnalysisNotesForAnalysisToApi(analysisId: string, notes: string): Promise<void> {
  if (!analysisId) return;
  await postJson<void, { notes: string }>(apiEndpoints.analysisNotes(analysisId), { notes });
}

export async function getFindingsByAnalysisIdFromApi(params: {
  analysisId: string;
  documentId: string;
  signal?: AbortSignal;
}): Promise<Finding[]> {
  if (!params.analysisId) return [];

  try {
    const payload = await getJson<unknown>(apiEndpoints.analysisFindings(params.analysisId), {
      signal: params.signal,
    });

    if (!Array.isArray(payload)) {
      throw new Error('Findings endpoint returned an unexpected payload shape.');
    }

    return payload
      .filter(isRecord)
      .map((dto, index) => mapFindingDto(dto as FindingDto, { ...params, index }));
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return [];
    throw error;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(() => resolve(), ms);

    if (signal) {
      const onAbort = () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export interface FindingsRetryOptions {
  /** Total attempts including the initial request. */
  maxAttempts: number;
  intervalMs: number;
  signal?: AbortSignal;
}

/**
 * Loads findings, retrying when the backend returns an empty findings list.
 *
 * Useful when analysis creation is asynchronous and findings may not be ready yet.
 */
export async function getFindingsByAnalysisIdFromApiWithRetry(
  params: { analysisId: string; documentId: string; signal?: AbortSignal },
  options: Partial<FindingsRetryOptions> = {},
): Promise<Finding[]> {
  const maxAttempts = options.maxAttempts ?? 10;
  const intervalMs = options.intervalMs ?? 3000;
  const signal = options.signal ?? params.signal;

  if (maxAttempts <= 1) {
    return getFindingsByAnalysisIdFromApi({ ...params, signal });
  }

  let findings = await getFindingsByAnalysisIdFromApi({ ...params, signal });
  if (findings.length > 0) return findings;

  for (let attempt = 2; attempt <= maxAttempts; attempt += 1) {
    await sleep(intervalMs, signal);
    findings = await getFindingsByAnalysisIdFromApi({ ...params, signal });
    if (findings.length > 0) return findings;
  }

  return findings;
}

export interface CreateAnalysisRequest {
  documentId: number;
}

export interface AnalysisStatusResult {
  status: AnalysisStatus;
  errorMessage?: string;
}

function parseAnalysisStatus(value: unknown): AnalysisStatus {
  if (typeof value !== 'string') return 'pending';

  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'EXTRACTING':
      return 'extracting';
    case 'ANALYZING':
      return 'analyzing';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'PENDING':
    default:
      return 'pending';
  }
}

export async function getAnalysisStatusFromApi(
  analysisId: string,
  signal?: AbortSignal,
): Promise<AnalysisStatusResult> {
  if (!analysisId) {
    return { status: 'pending' };
  }

  const payload = await getJson<unknown>(apiEndpoints.analysisStatus(analysisId), { signal });
  if (!isRecord(payload)) {
    return { status: 'pending' };
  }

  return {
    status: parseAnalysisStatus(
        payload.analysisStatus ?? payload.status
    ),
    errorMessage: asString(payload.errorMessage) ?? asString(payload.message) ?? undefined,
  };
}

export async function retryAnalysisFromApi(analysisId: string): Promise<{ analysisId?: string }> {
  if (!analysisId) return {};

  const payload = await postJson<unknown, Record<string, never>>(apiEndpoints.analysisRetry(analysisId), {});
  if (!isRecord(payload)) return {};

  const numericId = asNumber(payload.id) ?? asNumber(payload.analysisId) ?? asNumber(payload.analysis_id);
  const stringId = asString(payload.id) ?? asString(payload.analysisId) ?? asString(payload.analysis_id);

  return { analysisId: stringId ?? (numericId !== undefined ? String(numericId) : undefined) };
}

/**
 * API-backed analysis creation.
 *
 * POST /api/analyses
 */
export async function createAnalysisToApi(request: CreateAnalysisRequest): Promise<{ analysisId?: string }> {
  // Backend contract: request body must be exactly { documentId: number }.
  const payload = await postJson<unknown, unknown>(apiEndpoints.analysisCreate, {
    documentId: request.documentId,
  });

  if (!isRecord(payload)) return {};

  const numericId = asNumber(payload.id) ?? asNumber(payload.analysisId) ?? asNumber(payload.analysis_id);
  const id = asString(payload.id) ?? asString(payload.analysisId) ?? asString(payload.analysis_id)
    ?? (numericId !== undefined ? String(numericId) : undefined);
  return { analysisId: id };
}
