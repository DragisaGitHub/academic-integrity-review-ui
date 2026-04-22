import type { Document, KPIData, ReviewStatus } from '../types';

export type PriorityDistributionItem = {
  name: string;
  value: number;
  color: string;
};

function isPendingStatus(status: ReviewStatus): boolean {
  return status === 'pending' || status === 'in-review' || status === 'flagged';
}

export function buildKpisFromDocuments(documents: Document[]): KPIData {
  const totalReviewed = documents.filter((d) => d.status === 'reviewed').length;
  const pendingReview = documents.filter((d) => isPendingStatus(d.status)).length;
  const highPriority = documents.filter((d) => d.reviewPriority === 'high' && d.status !== 'reviewed').length;

  // Backend is the source of truth for document states; "verified" is derived from reviewed.
  const verified = totalReviewed;

  return {
    totalReviewed,
    pendingReview,
    highPriority,
    verified,
  };
}

export function buildPriorityDistributionFromDocuments(documents: Document[]): PriorityDistributionItem[] {
  const low = documents.filter((d) => d.reviewPriority === 'low').length;
  const medium = documents.filter((d) => d.reviewPriority === 'medium').length;
  const high = documents.filter((d) => d.reviewPriority === 'high').length;

  // Use existing theme tokens (no new hard-coded colors).
  return [
    { name: 'Low Concern', value: low, color: 'var(--chart-2)' },
    { name: 'Needs Review', value: medium, color: 'var(--chart-4)' },
    { name: 'High Priority', value: high, color: 'var(--destructive)' },
  ];
}
