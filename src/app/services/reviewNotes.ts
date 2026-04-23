import type { DocumentReference, FinalDecision, ReviewChecklist, ReviewNote, ReviewNoteUpsertRequest } from '../types';
import { apiEndpoints } from '../api';
import { getJson, HttpError, postJson } from '../api';

type ReviewNoteUpsertDto = {
  notes: string;
  referencesChecked: boolean;
  oralDefenseRequired: boolean;
  factualIssuesDiscussed: boolean;
  finalReviewCompleted: boolean;
  finalDecision: 'ACCEPT' | 'ACCEPT_WITH_REVISIONS' | 'REQUEST_CLARIFICATION' | 'ESCALATE' | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
    if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  }
  return undefined;
}

function emptyChecklist(): ReviewChecklist {
  return {
    referencesChecked: false,
    oralDefenseRequired: false,
    factualDiscussed: false,
    finalReviewCompleted: false,
  };
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

function toBackendFinalDecision(value: FinalDecision): ReviewNoteUpsertDto['finalDecision'] {
  switch (value) {
    case 'accept':
      return 'ACCEPT';
    case 'accept-with-revisions':
      return 'ACCEPT_WITH_REVISIONS';
    case 'request-clarification':
      return 'REQUEST_CLARIFICATION';
    case 'escalate':
      return 'ESCALATE';
    case null:
    default:
      return null;
  }
}

function mapChecklist(payload: unknown): ReviewChecklist {
  if (!isRecord(payload)) return emptyChecklist();

  const nested = payload.checklist;
  const source = isRecord(nested) ? nested : payload;

  return {
    referencesChecked:
      asBoolean(source.referencesChecked ?? source.references_verified ?? source.referencesVerified) ?? false,
    oralDefenseRequired:
      asBoolean(source.oralDefenseRequired ?? source.oral_defense_required ?? source.oralDefense) ?? false,
    factualDiscussed:
      asBoolean(source.factualDiscussed ?? source.factual_discussed ?? source.factualIssuesDiscussed) ?? false,
    finalReviewCompleted:
      asBoolean(source.finalReviewCompleted ?? source.final_review_completed ?? source.reviewCompleted) ?? false,
  };
}

function mapDocumentReference(payload: unknown, fallbackDocumentId: string): DocumentReference {
  const record = isRecord(payload) ? payload : {};

  return {
    id: asString(record.id) ?? fallbackDocumentId,
    title: asString(record.title) ?? '',
    studentName: asString(record.studentName) ?? '',
    course: asString(record.course) ?? '',
  };
}

function mapReviewNoteDtoToModel(documentId: string, payload: unknown): ReviewNote {
  const record = isRecord(payload) ? payload : {};

  const notes =
    asString(record.notes) ??
    asString(record.professorNotes) ??
    asString(record.reviewNote) ??
    asString(record.content) ??
    '';

  const updatedAt = asString(record.updatedAt ?? record.updated_at ?? record.lastModifiedAt);

  return {
    document: mapDocumentReference(record.document, documentId),
    notes,
    checklist: mapChecklist(record),
    finalDecision: parseFinalDecision(record.finalDecision ?? record.decision),
    updatedAt,
  };
}

function mapReviewNoteUpsertRequestToDto(request: ReviewNoteUpsertRequest): ReviewNoteUpsertDto {
  const checklist: ReviewChecklist = request.checklist ?? emptyChecklist();

  return {
    notes: request.notes ?? '',
    referencesChecked: Boolean(checklist.referencesChecked),
    oralDefenseRequired: Boolean(checklist.oralDefenseRequired),
    factualIssuesDiscussed: Boolean(checklist.factualDiscussed),
    finalReviewCompleted: Boolean(checklist.finalReviewCompleted),
    finalDecision: toBackendFinalDecision(request.finalDecision),
  };
}

export async function getReviewNoteByDocumentIdFromApi(documentId: string): Promise<ReviewNote | null> {
  if (!documentId) return null;

  try {
    const payload = await getJson<unknown>(apiEndpoints.documentReviewNote(documentId));
    return mapReviewNoteDtoToModel(documentId, payload);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export async function saveReviewNoteForDocumentToApi(
  documentId: string,
  request: ReviewNoteUpsertRequest,
): Promise<void> {
  if (!documentId) return;

  const dto = mapReviewNoteUpsertRequestToDto(request);
  await postJson<void, ReviewNoteUpsertDto>(apiEndpoints.documentReviewNote(documentId), dto);
}
