import type { ReviewPriority, ReviewStatus } from '../types';

export const reviewPriorityBadgeClass = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
} as const satisfies Record<ReviewPriority, string>;

export const reviewStatusBadgeClass = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  'in-review': 'bg-blue-100 text-blue-700 border-blue-200',
  reviewed: 'bg-green-100 text-green-700 border-green-200',
  flagged: 'bg-red-100 text-red-700 border-red-200',
} as const satisfies Record<ReviewStatus, string>;

export const reviewStatusLabel = {
  pending: 'Pending',
  'in-review': 'In Review',
  reviewed: 'Reviewed',
  flagged: 'Flagged',
} as const satisfies Record<ReviewStatus, string>;

// Some pages want a shorter “priority label” (e.g., table badges), others want a
// more descriptive label. Keep both to preserve existing UI behavior.
export const reviewPriorityLabelShort = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const satisfies Record<ReviewPriority, string>;

export const reviewPriorityLabelLong = {
  low: 'Low Concern',
  medium: 'Needs Review',
  high: 'High Priority',
} as const satisfies Record<ReviewPriority, string>;

// Analysis header uses a slightly different wording today; keep it identical.
export const reviewPriorityLabelAnalysis = {
  low: 'Low Concern',
  medium: 'Needs Manual Review',
  high: 'High Review Priority',
} as const satisfies Record<ReviewPriority, string>;
