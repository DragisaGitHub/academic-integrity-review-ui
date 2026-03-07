// Type definitions for the application

export type ReviewPriority = 'low' | 'medium' | 'high';
export type ReviewStatus = 'pending' | 'in-review' | 'reviewed' | 'flagged';
export type FindingSeverity = 'info' | 'warning' | 'critical';
export type FindingCategory = 'citation' | 'reference' | 'fact' | 'style' | 'claim' | 'ai';
export type FinalDecision = 'accept' | 'accept-with-revisions' | 'request-clarification' | 'escalate' | null;

export interface Document {
  id: string;
  title: string;
  studentName: string;
  course: string;
  academicYear: string;
  submissionDate: string;
  analysisDate: string;
  reviewPriority: ReviewPriority;
  status: ReviewStatus;
  professorNotes?: string;
  finalDecision?: FinalDecision;
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
}

export interface DocumentAnalysis extends Document {
  findings: Finding[];
  summary: {
    missingCitations: number;
    suspiciousReferences: number;
    factualIssues: number;
    styleInconsistencies: number;
    unsupportedClaims: number;
  };
  fullText: string;
}

export interface KPIData {
  totalReviewed: number;
  pendingReview: number;
  highPriority: number;
  verified: number;
}
