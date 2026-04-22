// Type definitions for the application

export type ReviewPriority = 'low' | 'medium' | 'high';
export type ReviewStatus = 'pending' | 'in-review' | 'reviewed' | 'flagged';
export type AnalysisStatus = 'pending' | 'extracting' | 'analyzing' | 'completed' | 'failed';
export type FindingSeverity = 'info' | 'warning' | 'critical';
export type FindingCategory = 'citation' | 'reference' | 'fact' | 'style' | 'claim' | 'ai';
export type FinalDecision = 'accept' | 'accept-with-revisions' | 'request-clarification' | 'escalate' | null;
export type NotificationType = 'analysis-completed' | 'analysis-failed';
export type NotificationSeverity = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
  documentId: string;
  route: string;
}

export interface NotificationListResult {
  notifications: Notification[];
  unreadCount: number;
}

export interface Document {
  id: string;
  title: string;
  studentName: string;
  course: string;
  academicYear: string;
  submissionDate?: string;
  analysisDate?: string;
  reviewPriority: ReviewPriority;
  status: ReviewStatus;
  professorNotes?: string;
  finalDecision?: FinalDecision;

  createdAt?: string;
  updatedAt?: string;
  hasAnalysis?: boolean;
  analysisId?: string | null;
  analysisStatus?: AnalysisStatus;
  analysisErrorMessage?: string;
  hasReviewNote?: boolean;
}

export interface Finding {
  id: string;
  documentId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  excerpt: string;
  paragraphLocation: number;
  recommendation: string;
  followUpQuestion?: string;
  reviewed: boolean;
  professorNotes?: string;
  flaggedForFollowUp: boolean;
}

export interface AnalysisSummary {
  missingCitations: number;
  suspiciousReferences: number;
  factualIssues: number;
  styleInconsistencies: number;
  unsupportedClaims: number;
}

/**
 * Analysis details independent from document metadata.
 *
 * Used by the service layer to map backend DTOs into the UI's `DocumentAnalysis` model.
 */
export interface AnalysisDetails {
  id: string;
  documentId: string;
  analysisDate?: string;
  summary: AnalysisSummary;
  fullText: string;
}

export interface DocumentAnalysis extends Document {
  findings: Finding[];
  summary: AnalysisSummary;
  fullText: string;
}

export interface KPIData {
  totalReviewed: number;
  pendingReview: number;
  highPriority: number;
  verified: number;
}

export interface ReviewChecklist {
  referencesChecked: boolean;
  oralDefenseRequired: boolean;
  factualDiscussed: boolean;
  finalReviewCompleted: boolean;
}

export interface ReviewNote {
  documentId: string;
  notes: string;
  checklist: ReviewChecklist;
  finalDecision: FinalDecision;
  updatedAt?: string;
}

export interface ReviewNoteUpsertRequest {
  notes: string;
  checklist: ReviewChecklist;
  finalDecision: FinalDecision;
}

export type RetentionPeriod = '3months' | '6months' | '1year' | '2years' | 'never';
export type UiThemePreference = 'light' | 'dark' | 'auto';
export type UiDensityPreference = 'compact' | 'comfortable' | 'spacious';
export type ReadingLayoutPreference = string;

export interface AppSettings {
  profile: {
    fullName: string;
    department: string;
    university: string;
    email: string;
  };
  analysisModules: {
    citationAnalysis: boolean;
    referenceValidation: boolean;
    factualConsistencyReview: boolean;
    writingStyleConsistency: boolean;
    aiReviewAssistance: boolean;
  };
  localProcessing: {
    enableLocalAiAnalysis: boolean;
    documentStorageLocation: string;
  };
  dataRetention: {
    /**
     * Backend contract: documentRetentionDays.
     *
     * Note: the UI currently exposes a period-based selector; we keep both so we can round-trip
     * non-standard day values from the backend without losing fidelity.
     */
    documentRetentionDays: number;
    automaticDeletionAfter: RetentionPeriod;
    autoDeleteReviewedDocuments: boolean;
  };
  interfacePreferences: {
    colorTheme: UiThemePreference;
    displayDensity: UiDensityPreference;
    showSeverityBadges: boolean;
    /** Backend contract: readingLayout (not currently exposed as a UI control). */
    readingLayout: ReadingLayoutPreference;
  };
}
