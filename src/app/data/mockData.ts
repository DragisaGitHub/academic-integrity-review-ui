import type { Document, DocumentAnalysis, Finding, KPIData } from '../types';

export const mockKPIData: KPIData = {
  totalReviewed: 127,
  pendingReview: 8,
  highPriority: 3,
  verified: 94,
};

export const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'The Impact of Machine Learning on Modern Healthcare Systems',
    studentName: 'Emma Richardson',
    course: 'CSCI 4950 - Advanced Topics in AI',
    academicYear: '2025-2026',
    submissionDate: '2026-03-01',
    analysisDate: '2026-03-02',
    reviewPriority: 'high',
    status: 'pending',
  },
  {
    id: '2',
    title: 'Quantum Computing Applications in Cryptography',
    studentName: 'Michael Chen',
    course: 'CSCI 4950 - Advanced Topics in AI',
    academicYear: '2025-2026',
    submissionDate: '2026-02-28',
    analysisDate: '2026-03-01',
    reviewPriority: 'medium',
    status: 'in-review',
  },
  {
    id: '3',
    title: 'Sustainable Urban Planning in Post-Industrial Cities',
    studentName: 'Sarah Martinez',
    course: 'URBN 3100 - Urban Development',
    academicYear: '2025-2026',
    submissionDate: '2026-02-25',
    analysisDate: '2026-02-26',
    reviewPriority: 'low',
    status: 'reviewed',
    finalDecision: 'accept',
  },
  {
    id: '4',
    title: 'The Role of Social Media in Political Polarization',
    studentName: 'James Anderson',
    course: 'POLS 2200 - Political Communication',
    academicYear: '2025-2026',
    submissionDate: '2026-02-20',
    analysisDate: '2026-02-21',
    reviewPriority: 'high',
    status: 'flagged',
  },
  {
    id: '5',
    title: 'Climate Change Effects on Marine Biodiversity',
    studentName: 'Olivia Thompson',
    course: 'BIOL 3300 - Marine Biology',
    academicYear: '2025-2026',
    submissionDate: '2026-02-18',
    analysisDate: '2026-02-19',
    reviewPriority: 'low',
    status: 'reviewed',
    finalDecision: 'accept-with-revisions',
  },
];

const sampleFindings: Finding[] = [
  {
    id: 'f1',
    documentId: '1',
    category: 'citation',
    severity: 'critical',
    title: 'Missing citation for statistical claim',
    description: 'A specific statistical claim is made without a corresponding citation.',
    excerpt: 'Studies show that machine learning models have improved diagnostic accuracy by 47% in the past five years.',
    paragraphLocation: 3,
    recommendation: 'Request the student provide the source for this specific statistic during oral defense.',
    followUpQuestion: 'Can you provide the primary source for the 47% improvement statistic?',
    reviewed: false,
  },
  {
    id: 'f2',
    documentId: '1',
    category: 'reference',
    severity: 'critical',
    title: 'Potentially fabricated reference',
    description: 'The cited paper could not be verified in standard academic databases.',
    excerpt: 'As demonstrated by Zhang et al. (2024) in their comprehensive study...',
    paragraphLocation: 5,
    recommendation: 'Verify this reference manually. Check if the publication exists and if the authors are correctly attributed.',
    followUpQuestion: 'Can you provide the DOI or direct link to the Zhang et al. (2024) paper?',
    reviewed: false,
  },
  {
    id: 'f3',
    documentId: '1',
    category: 'fact',
    severity: 'warning',
    title: 'Factual inconsistency detected',
    description: 'A claim in this section contradicts information presented earlier in the document.',
    excerpt: 'Deep learning requires minimal training data to achieve high accuracy.',
    paragraphLocation: 8,
    recommendation: 'Discuss this apparent contradiction with the student. Earlier sections suggested otherwise.',
    reviewed: false,
  },
  {
    id: 'f4',
    documentId: '1',
    category: 'style',
    severity: 'warning',
    title: 'Notable style shift detected',
    description: 'The writing style in this section differs significantly from the surrounding text in terms of complexity and vocabulary.',
    excerpt: 'The paradigmatic shift in computational methodologies has engendered a transformative reconfiguration of epistemic frameworks within the medical diagnostic domain.',
    paragraphLocation: 12,
    recommendation: 'Consider asking the student to explain this section in their own words during discussion.',
    reviewed: false,
  },
  {
    id: 'f5',
    documentId: '1',
    category: 'claim',
    severity: 'warning',
    title: 'Unsupported broad claim',
    description: 'A sweeping generalization is made without adequate supporting evidence.',
    excerpt: 'All major hospitals have now adopted AI-driven diagnostic systems.',
    paragraphLocation: 15,
    recommendation: 'This claim needs qualification or supporting evidence. Suggest revision to be more specific.',
    reviewed: false,
  },
  {
    id: 'f6',
    documentId: '1',
    category: 'ai',
    severity: 'info',
    title: 'Formulaic structure noted',
    description: 'This section follows a highly structured pattern that may indicate assistance.',
    excerpt: 'Firstly, it is important to note... Secondly, one must consider... Finally, it can be concluded that...',
    paragraphLocation: 18,
    recommendation: 'Not necessarily problematic, but worth discussing the writing process with the student.',
    reviewed: false,
  },
];

const sampleFullText = `The Impact of Machine Learning on Modern Healthcare Systems

Introduction

The integration of artificial intelligence and machine learning technologies into healthcare has fundamentally transformed medical practice over the past decade. This paper examines the various applications, benefits, and challenges associated with implementing ML systems in clinical environments.

Literature Review

Studies show that machine learning models have improved diagnostic accuracy by 47% in the past five years. The application of these technologies spans multiple medical disciplines, from radiology to pathology. As demonstrated by Zhang et al. (2024) in their comprehensive study, neural networks have shown particular promise in identifying complex patterns in medical imaging.

Methodology

This research employs a mixed-methods approach, combining quantitative analysis of published studies with qualitative interviews from healthcare professionals. The scope includes data from over 200 hospitals across North America and Europe.

Deep learning requires minimal training data to achieve high accuracy. This makes it particularly suitable for rare disease detection where large datasets are not available.

Findings

The paradigmatic shift in computational methodologies has engendered a transformative reconfiguration of epistemic frameworks within the medical diagnostic domain. Machine learning algorithms have demonstrated superior performance in specific diagnostic tasks when compared to traditional methods.

All major hospitals have now adopted AI-driven diagnostic systems. This widespread adoption has led to measurable improvements in patient outcomes and operational efficiency.

Discussion

Firstly, it is important to note that the implementation challenges remain significant. Secondly, one must consider the ethical implications of algorithmic decision-making in healthcare. Finally, it can be concluded that the benefits substantially outweigh the risks when proper safeguards are in place.

Conclusion

Machine learning represents a crucial advancement in healthcare technology. Continued research and careful implementation will be essential to realizing its full potential while maintaining patient safety and medical ethics.`;

export const mockAnalysis: DocumentAnalysis = {
  ...mockDocuments[0],
  findings: sampleFindings,
  summary: {
    missingCitations: 8,
    suspiciousReferences: 3,
    factualIssues: 2,
    styleInconsistencies: 4,
    unsupportedClaims: 5,
  },
  fullText: sampleFullText,
};

export const mockPriorityDistribution = [
  { name: 'Low Concern', value: 94, color: '#10b981' },
  { name: 'Needs Review', value: 30, color: '#f59e0b' },
  { name: 'High Priority', value: 3, color: '#ef4444' },
];
