import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
  MessageSquare,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { getDocumentByIdFromApi } from '../services/documents';
import {
  computeSummaryFromFindings,
  getAnalysisByDocumentIdFromApi,
  getAnalysisNotesFromApi,
  getAnalysisStatusFromApi,
  getAnalysisTextSegmentsFromApi,
  getFindingsByAnalysisIdFromApi,
  retryAnalysisFromApi,
  updateFindingForAnalysisFromApi,
} from '../services/analyses';
import type { AnalysisDetails, AnalysisTextSegment, Document, Finding, FindingCategory, FindingSeverity } from '../types';
import { formatDateOrDash } from '../utils/dateFormat';
import {
  analysisStatusBadgeClass,
  analysisStatusLabel,
  reviewPriorityBadgeClass,
  reviewPriorityLabelAnalysis,
} from '../utils/reviewPresentation';

const categoryIcons: Record<FindingCategory, typeof BookOpen> = {
  citation: BookOpen,
  reference: FileText,
  fact: AlertCircle,
  style: FileText,
  claim: MessageSquare,
  ai: FileText,
};

const categoryLabels: Record<FindingCategory, string> = {
  citation: 'Citation',
  reference: 'Reference',
  fact: 'Factual Issue',
  style: 'Style',
  claim: 'Unsupported Claim',
  ai: 'AI Review Note',
};

const severityColors: Record<FindingSeverity, string> = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const severityLabels: Record<FindingSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const INITIAL_SEGMENT_WINDOW_SIZE = 24;

type ExcerptHighlightMatch = 'offset-local' | 'excerpt-search' | 'offset-approximate';

type ExcerptHighlight = {
  start: number;
  end: number;
  match: ExcerptHighlightMatch;
  exact: boolean;
};

function formatParagraphLocation(location: number): string {
  return location >= 0 ? String(location) : 'N/A';
}

function getFindingSegmentIndex(finding: Finding): number | null {
  if (typeof finding.segmentIndex === 'number' && finding.segmentIndex >= 0) return finding.segmentIndex;
  if (finding.paragraphLocation >= 0) return finding.paragraphLocation;
  return null;
}

function getFindingLocationLabel(finding: Finding): string {
  const segmentIndex = getFindingSegmentIndex(finding);
  if (segmentIndex !== null) {
    return `Segment ${segmentIndex}`;
  }

  return `Paragraph ${formatParagraphLocation(finding.paragraphLocation)}`;
}

function getSegmentRangeForPage(findings: Finding[]): { from: number; to: number } {
  const segmentIndexes = findings
    .map((finding) => getFindingSegmentIndex(finding))
    .filter((segmentIndex): segmentIndex is number => segmentIndex !== null)
    .sort((left, right) => left - right);

  if (segmentIndexes.length === 0) {
    return {
      from: 0,
      to: INITIAL_SEGMENT_WINDOW_SIZE - 1,
    };
  }

  return {
    from: 0,
    to: Math.max(segmentIndexes[segmentIndexes.length - 1], INITIAL_SEGMENT_WINDOW_SIZE - 1),
  };
}

function normalizeExcerptValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function findExcerptInSegment(segmentText: string, excerpt: string): { start: number; end: number } | null {
  const trimmedExcerpt = excerpt.trim();
  if (!trimmedExcerpt) return null;

  const directIndex = segmentText.indexOf(trimmedExcerpt);
  if (directIndex >= 0) {
    return {
      start: directIndex,
      end: directIndex + trimmedExcerpt.length,
    };
  }

  const lowerSegmentText = segmentText.toLowerCase();
  const lowerExcerpt = trimmedExcerpt.toLowerCase();
  const caseInsensitiveIndex = lowerSegmentText.indexOf(lowerExcerpt);
  if (caseInsensitiveIndex >= 0) {
    return {
      start: caseInsensitiveIndex,
      end: caseInsensitiveIndex + lowerExcerpt.length,
    };
  }

  return null;
}

function getExcerptHighlight(finding: Finding, segmentText: string): ExcerptHighlight | null {
  if (!segmentText) return null;

  const excerpt = finding.excerpt.trim();
  const normalizedExcerpt = normalizeExcerptValue(excerpt);
  const hasOffsets = typeof finding.excerptStartOffset === 'number' && typeof finding.excerptEndOffset === 'number';

  if (hasOffsets) {
    const rawStart = finding.excerptStartOffset as number;
    const rawEnd = finding.excerptEndOffset as number;
    const offsetsAreInBounds = rawStart >= 0 && rawEnd > rawStart && rawEnd <= segmentText.length;

    if (offsetsAreInBounds) {
      const offsetSlice = segmentText.slice(rawStart, rawEnd);
      const normalizedOffsetSlice = normalizeExcerptValue(offsetSlice);
      const offsetMatchesExcerpt = !normalizedExcerpt
        || normalizedOffsetSlice.includes(normalizedExcerpt)
        || normalizedExcerpt.includes(normalizedOffsetSlice);

      if (offsetMatchesExcerpt) {
        return {
          start: rawStart,
          end: rawEnd,
          match: 'offset-local',
          exact: true,
        };
      }
    }
  }

  const excerptMatch = excerpt ? findExcerptInSegment(segmentText, excerpt) : null;
  if (excerptMatch) {
    return {
      ...excerptMatch,
      match: 'excerpt-search',
      exact: true,
    };
  }

  if (!hasOffsets) {
    return null;
  }

  const rawStart = finding.excerptStartOffset as number;
  const rawEnd = finding.excerptEndOffset as number;
  const start = Math.max(0, Math.min(rawStart, segmentText.length));
  const end = Math.max(start, Math.min(rawEnd, segmentText.length));

  if (start === end) {
    return null;
  }

  return {
    start,
    end,
    match: 'offset-approximate',
    exact: false,
  };
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(resolve, ms);

    if (signal) {
      const onAbort = () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export function Analysis() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const retryPendingRef = useRef(false);
  const textSegmentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const excerptTargetRef = useRef<HTMLSpanElement | null>(null);

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [textHighlightedFindingId, setTextHighlightedFindingId] = useState<string | null>(null);
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const [pendingScrollFindingId, setPendingScrollFindingId] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisViewModel | null>(null);
  const [textSegments, setTextSegments] = useState<AnalysisTextSegment[]>([]);
  const [textLoadError, setTextLoadError] = useState('');
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState('');
  const [analysisIdOverride, setAnalysisIdOverride] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUpdatingReviewState, setIsUpdatingReviewState] = useState(false);
  const [isUpdatingFollowUpState, setIsUpdatingFollowUpState] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    setNotesDraft(selectedFinding?.professorNotes ?? '');
  }, [selectedFinding]);

  useEffect(() => {
    if (!pendingScrollFindingId) return;

    const exactTargetNode = excerptTargetRef.current;
    if (exactTargetNode) {
      const animationFrameId = window.requestAnimationFrame(() => {
        exactTargetNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        setPendingScrollFindingId((current) => (current === pendingScrollFindingId ? null : current));
      });

      return () => window.cancelAnimationFrame(animationFrameId);
    }

    if (highlightedSegmentIndex === null) return;

    const fallbackNode = textSegmentRefs.current[highlightedSegmentIndex];
    if (!fallbackNode) return;

    const animationFrameId = window.requestAnimationFrame(() => {
      fallbackNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setPendingScrollFindingId((current) => (current === pendingScrollFindingId ? null : current));
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [highlightedSegmentIndex, pendingScrollFindingId, textSegments]);

  function openFindingDetail(finding: Finding): void {
    setSelectedFinding(finding);
  }

  function highlightFindingInDocument(finding: Finding): void {
    setTextHighlightedFindingId(finding.id);
    setHighlightedSegmentIndex(getFindingSegmentIndex(finding));
    setPendingScrollFindingId(finding.id);
  }

  function handleShowFindingInText(): void {
    if (!selectedFinding) return;

    highlightFindingInDocument(selectedFinding);
    setSelectedFinding(null);

    const activeSegmentIndex = getFindingSegmentIndex(selectedFinding);
    if (activeSegmentIndex === null) {
      toast.error('This finding does not include a segment location yet.');
      return;
    }

    const activeSegment = textSegments.find((segment) => segment.segmentIndex === activeSegmentIndex);
    const highlight = activeSegment ? getExcerptHighlight(selectedFinding, activeSegment.text) : null;

    if (highlight?.exact) {
      toast.success('Highlighted the referenced excerpt in the document.');
      return;
    }

    if (highlight) {
      toast('Focused the related text segment, but the excerpt highlight is approximate.');
      return;
    }

    toast('Focused the related text segment. Exact highlighting depends on segment-relative offsets or a uniquely matching excerpt.');
  }

  function applyUpdatedFinding(updatedFinding: Finding): void {
    setAnalysis((previous) => {
      if (!previous) return previous;

      const findings = previous.findings.map((finding) =>
        finding.id === updatedFinding.id ? { ...finding, ...updatedFinding } : finding,
      );

      return {
        ...previous,
        findings,
        summary: computeSummaryFromFindings(findings),
      };
    });
    setSelectedFinding((previous) =>
      previous && previous.id === updatedFinding.id ? { ...previous, ...updatedFinding } : previous,
    );
    setNotesDraft(updatedFinding.professorNotes ?? '');
  }

  async function patchSelectedFinding(updates: {
    professorNotes?: string;
    reviewed?: boolean;
    flaggedForFollowUp?: boolean;
  }): Promise<Finding | null> {
    if (!analysis?.details.id || !selectedFinding) {
      toast.error('Finding details are not available yet.');
      return null;
    }

    try {
      const updatedFinding = await updateFindingForAnalysisFromApi({
        analysisId: analysis.details.id,
        documentId: analysis.details.document.id,
        findingId: selectedFinding.id,
        updates,
      });

      applyUpdatedFinding(updatedFinding);
      return updatedFinding;
    } catch (error) {
      console.error('Failed to update finding', error);
      toast.error('Could not update this finding.');
      return null;
    }
  }

  async function handleNotesBlur(): Promise<void> {
    if (!selectedFinding) return;

    const nextNotes = notesDraft;
    const currentNotes = selectedFinding.professorNotes ?? '';
    if (nextNotes === currentNotes) return;

    setIsSavingNotes(true);
    try {
      const updatedFinding = await patchSelectedFinding({ professorNotes: nextNotes });
      if (updatedFinding) {
        toast.success('Finding notes saved.');
      }
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleMarkReviewed(): Promise<void> {
    if (!selectedFinding || selectedFinding.reviewed) return;

    setIsUpdatingReviewState(true);
    try {
      const updatedFinding = await patchSelectedFinding({ reviewed: true });
      if (updatedFinding) {
        toast.success('Finding marked as reviewed.');
      }
    } finally {
      setIsUpdatingReviewState(false);
    }
  }

  async function handleFlagForFollowUp(): Promise<void> {
    if (!selectedFinding || selectedFinding.flaggedForFollowUp) return;

    setIsUpdatingFollowUpState(true);
    try {
      const updatedFinding = await patchSelectedFinding({ flaggedForFollowUp: true });
      if (updatedFinding) {
        toast.success('Finding flagged for follow-up.');
      }
    } finally {
      setIsUpdatingFollowUpState(false);
    }
  }

  async function handleRetry(): Promise<void> {
    const activeAnalysisId = analysis?.details.id ?? document?.analysisId ?? null;
    if (!activeAnalysisId) {
      toast.error('No analysis is available to retry.');
      return;
    }

    setIsRetrying(true);

    try {
      const retryResult = await retryAnalysisFromApi(activeAnalysisId);
      retryPendingRef.current = true;
      setAnalysisIdOverride(retryResult.analysisId ?? activeAnalysisId);
      setAnalysis(null);
      setAnalysisErrorMessage('');
      setLoadState('analysis-pending');
      setRetryTrigger((previous) => previous + 1);
      toast.success('Retrying analysis...');
    } catch (error) {
      console.error('Failed to retry analysis', error);
      toast.error('Failed to retry analysis.');
    } finally {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    if (!documentId) {
      setDocument(null);
      setAnalysis(null);
      setAnalysisErrorMessage('');
      setLoadState('not-found');
      return;
    }

    setLoadState('loading');
    setDocument(null);
    setAnalysis(null);
    setAnalysisErrorMessage('');
    setSelectedFinding(null);
    setTextHighlightedFindingId(null);
    setHighlightedSegmentIndex(null);
    setPendingScrollFindingId(null);
    setTextSegments([]);
    setTextLoadError('');

    let cancelled = false;
    const abortController = new AbortController();

    (async () => {
      try {
        const loadedDocument = await getDocumentByIdFromApi(documentId);
        if (cancelled) return;

        if (!loadedDocument) {
          setLoadState('not-found');
          return;
        }

        setDocument(loadedDocument);

        const forcedPending = retryPendingRef.current;
        retryPendingRef.current = false;
        const activeAnalysisId = analysisIdOverride ?? loadedDocument.analysisId ?? null;
        let currentStatus = forcedPending ? 'pending' : loadedDocument.analysisStatus;

        if (currentStatus === 'failed') {
          setAnalysisErrorMessage(loadedDocument.analysisErrorMessage ?? 'The backend could not complete this analysis.');
          setLoadState('analysis-failed');
          return;
        }

        if ((currentStatus === 'pending' || currentStatus === 'extracting' || currentStatus === 'analyzing') && activeAnalysisId) {
          setLoadState('analysis-pending');

          while (!abortController.signal.aborted) {
            const statusResult = await getAnalysisStatusFromApi(activeAnalysisId, abortController.signal);
            currentStatus = statusResult.status;

            if (currentStatus === 'failed') {
              setAnalysisErrorMessage(statusResult.errorMessage ?? loadedDocument.analysisErrorMessage ?? 'The backend could not complete this analysis.');
              setLoadState('analysis-failed');
              return;
            }

            if (currentStatus === 'completed') {
              break;
            }

            await wait(3000, abortController.signal);
          }
        }

        const analysisDetails = await getAnalysisByDocumentIdFromApi(documentId);
        if (cancelled) return;

        if (!analysisDetails) {
          setLoadState('no-analysis');
          return;
        }

        const [analysisNotes, findings] = await Promise.all([
          getAnalysisNotesFromApi(analysisDetails.id),
          getFindingsByAnalysisIdFromApi({
            analysisId: analysisDetails.id,
            documentId: analysisDetails.document.id,
            signal: abortController.signal,
          }),
        ]);
        if (cancelled) return;

        const segmentRange = getSegmentRangeForPage(findings);

        const segments = await getAnalysisTextSegmentsFromApi({
          analysisId: analysisDetails.id,
          from: segmentRange.from,
          to: segmentRange.to,
          signal: abortController.signal,
        }).catch((error: unknown) => {
          console.error('Failed to load analysis text segments', error);
          setTextLoadError('Document text could not be loaded from the segment endpoint.');
          return [];
        });
        if (cancelled) return;

        setTextSegments(segments);

        setAnalysis({
          document: {
            ...loadedDocument,
            title: analysisDetails.document.title || loadedDocument.title,
            studentName: analysisDetails.document.studentName || loadedDocument.studentName,
            course: analysisDetails.document.course || loadedDocument.course,
          },
          details: analysisDetails,
          notes: analysisNotes.notes,
          findings,
          summary: computeSummaryFromFindings(findings),
        });
        setAnalysisIdOverride(null);
        setLoadState('loaded');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.error('Failed to load analysis from backend', error);
        setDocument(null);
        setAnalysis(null);
        setLoadState('error');
        toast.error('Could not load analysis from the backend API.');
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [analysisIdOverride, documentId, retryTrigger]);

  const headerDocument = analysis?.document ?? document;

  function renderBackButton() {
    return (
      <Button
        variant="ghost"
        className="mb-4 text-slate-700 hover:text-slate-900"
        onClick={() => navigate('/analyses')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Analyses
      </Button>
    );
  }

  if (!documentId) {
    return (
      <div className="mx-auto max-w-6xl">
        {renderBackButton()}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Analysis Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-slate-600">We couldn't find an analysis for that document.</CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'loading') {
    return (
      <div className="mx-auto max-w-6xl">
        {renderBackButton()}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Loading Analysis</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-slate-600">Fetching analysis details from the backend...</CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="mx-auto max-w-6xl">
        {renderBackButton()}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Could Not Load Analysis</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-slate-600">The backend API could not be reached.</CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'not-found' || !headerDocument) {
    return (
      <div className="mx-auto max-w-6xl">
        {renderBackButton()}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Analysis Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-slate-600">
            We couldn't find an analysis for that document. It may have been deleted or the URL is invalid.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'analysis-pending') {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {renderBackButton()}
        <AnalysisHeader document={headerDocument} />
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Analysis In Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-slate-600">
            The backend is still processing this analysis. This page refreshes automatically until the status becomes completed or failed.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'analysis-failed') {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {renderBackButton()}
        <AnalysisHeader document={headerDocument} />
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="border-b border-red-200 pb-4">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="h-5 w-5" />
              Analysis Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-red-800">{analysisErrorMessage || 'The backend could not complete this analysis.'}</p>
            <Button onClick={() => void handleRetry()} disabled={isRetrying}>
              {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Retry Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'no-analysis' || !analysis) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {renderBackButton()}
        <AnalysisHeader document={headerDocument} />
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">No Analysis Available</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-slate-600">
            The document exists, but no analysis record is currently available from the backend.
          </CardContent>
        </Card>
      </div>
    );
  }

  function getFindingsForSegment(index: number): Finding[] {
    return analysis.findings.filter((finding) => getFindingSegmentIndex(finding) === index);
  }

  function getCategoryFindings(category: FindingCategory): Finding[] {
    return analysis.findings.filter((finding) => finding.category === category);
  }

  function renderSegmentText(segment: AnalysisTextSegment) {
    const findings = getFindingsForSegment(segment.segmentIndex);
    const textHighlightedFinding = textHighlightedFindingId
      ? analysis.findings.find((finding) => finding.id === textHighlightedFindingId) ?? null
      : null;
    const selectedExcerpt = textHighlightedFinding && getFindingSegmentIndex(textHighlightedFinding) === segment.segmentIndex
      ? getExcerptHighlight(textHighlightedFinding, segment.text)
      : null;
    const hasStrongExcerptHighlight = Boolean(selectedExcerpt);
    const hasSegmentFocus = Boolean(textHighlightedFinding) && highlightedSegmentIndex === segment.segmentIndex;

    if (findings.length === 0) {
      return (
        <div
          ref={(node) => {
            textSegmentRefs.current[segment.segmentIndex] = node;
          }}
          className={`mb-4 rounded border border-transparent p-4 transition-all ${hasSegmentFocus && !hasStrongExcerptHighlight ? 'ring-2 ring-slate-300' : ''}`}
        >
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{segment.text}</p>
        </div>
      );
    }

    const severityLevel = findings.some((finding) => finding.severity === 'critical')
      ? 'critical'
      : findings.some((finding) => finding.severity === 'warning')
        ? 'warning'
        : 'info';

    const segmentClass = severityLevel === 'critical'
      ? 'border-l-2 border-red-300'
      : severityLevel === 'warning'
        ? 'border-l-2 border-amber-300'
        : 'border-l-2 border-blue-300';

    return (
      <div
        ref={(node) => {
          textSegmentRefs.current[segment.segmentIndex] = node;
        }}
        className={`mb-4 cursor-pointer rounded border border-slate-200 bg-white p-4 transition-all ${segmentClass} ${hasSegmentFocus && !hasStrongExcerptHighlight ? 'ring-2 ring-slate-300 shadow-sm' : ''}`}
        onClick={() => {
          setSelectedFinding(findings[0]);
        }}
      >
        {hasStrongExcerptHighlight ? (
          <div className="mb-3 inline-flex rounded-full bg-yellow-300 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950 animate-pulse">
            {selectedExcerpt?.exact ? 'Problematic excerpt' : 'Approximate excerpt'}
          </div>
        ) : null}
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
          {selectedExcerpt ? segment.text.slice(0, selectedExcerpt.start) : null}
          {selectedExcerpt ? (
            <mark
              ref={(node) => {
                excerptTargetRef.current = node;
              }}
              className="rounded bg-yellow-300 px-1 py-0.5 font-semibold text-slate-950 shadow-[0_0_0_4px_rgba(250,204,21,0.55)]"
            >
              {segment.text.slice(selectedExcerpt.start, selectedExcerpt.end)}
            </mark>
          ) : null}
          {selectedExcerpt ? segment.text.slice(selectedExcerpt.end) : segment.text}
        </p>
        <div className="mt-3 flex gap-2">
          {findings.map((finding) => (
            <Badge key={finding.id} variant="outline" className="text-xs">
              {categoryLabels[finding.category]}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-6">
      {renderBackButton()}
      <AnalysisHeader document={analysis.document}>
        <Button variant="outline" onClick={() => navigate(`/review-notes/${analysis.details.document.id}`)}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Review Notes
        </Button>
      </AnalysisHeader>

      <div className="grid grid-cols-5 gap-4">
        <SummaryCard label="Missing Citations" value={analysis.summary.missingCitations} tone="critical" />
        <SummaryCard label="Suspicious References" value={analysis.summary.suspiciousReferences} tone="critical" />
        <SummaryCard label="Factual Issues" value={analysis.summary.factualIssues} tone="warning" />
        <SummaryCard label="Style Inconsistencies" value={analysis.summary.styleInconsistencies} tone="warning" />
        <SummaryCard label="Unsupported Claims" value={analysis.summary.unsupportedClaims} tone="warning" />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-slate-900">Document Text</CardTitle>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Analysis ID {analysis.details.id}</span>
                  <Badge variant="outline" className={analysisStatusBadgeClass.completed}>
                    {analysisStatusLabel.completed}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[800px] overflow-y-auto pt-6">
              {textSegments.length > 0 ? (
                textSegments.map((segment) => (
                  <div key={`${segment.segmentIndex}-${segment.text.slice(0, 12)}`}>
                    {renderSegmentText(segment)}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  {textLoadError || 'The backend did not return extracted document text for this analysis.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2">
          <Card className="sticky top-24 border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Analysis Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="findings">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-slate-200">
                  <TabsTrigger value="findings">Findings</TabsTrigger>
                  <TabsTrigger value="notes">Analysis Notes</TabsTrigger>
                </TabsList>

                <div className="max-h-[700px] overflow-y-auto">
                  <TabsContent value="findings" className="mt-0 p-6">
                    {analysis.findings.length === 0 ? (
                      <p className="text-sm text-slate-600">No findings were returned for this analysis.</p>
                    ) : (
                      <Tabs defaultValue="overview">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="citations">Citations</TabsTrigger>
                          <TabsTrigger value="style">Style</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4 space-y-4">
                          {analysis.findings.map((finding) => (
                            <FindingCard key={finding.id} finding={finding} onClick={() => openFindingDetail(finding)} />
                          ))}
                        </TabsContent>

                        <TabsContent value="citations" className="mt-4 space-y-4">
                          {getCategoryFindings('citation').length > 0 ? (
                            getCategoryFindings('citation').map((finding) => (
                              <FindingCard key={finding.id} finding={finding} onClick={() => openFindingDetail(finding)} />
                            ))
                          ) : (
                            <p className="text-sm text-slate-600">No citation issues found.</p>
                          )}

                          {getCategoryFindings('reference').length > 0 ? (
                            <>
                              <div className="border-t border-slate-200 pt-4">
                                <p className="text-sm text-slate-900">Reference Issues</p>
                              </div>
                              {getCategoryFindings('reference').map((finding) => (
                                <FindingCard key={finding.id} finding={finding} onClick={() => openFindingDetail(finding)} />
                              ))}
                            </>
                          ) : null}
                        </TabsContent>

                        <TabsContent value="style" className="mt-4 space-y-4">
                          {getCategoryFindings('style').length > 0 ? (
                            getCategoryFindings('style').map((finding) => (
                              <FindingCard key={finding.id} finding={finding} onClick={() => openFindingDetail(finding)} />
                            ))
                          ) : (
                            <p className="text-sm text-slate-600">No style issues found.</p>
                          )}

                          {getCategoryFindings('ai').length > 0 ? (
                            <>
                              <div className="border-t border-slate-200 pt-4">
                                <p className="text-sm text-slate-900">AI Review Notes</p>
                              </div>
                              {getCategoryFindings('ai').map((finding) => (
                                <FindingCard key={finding.id} finding={finding} onClick={() => openFindingDetail(finding)} />
                              ))}
                            </>
                          ) : null}
                        </TabsContent>
                      </Tabs>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                      These notes are loaded from the documented backend analysis notes endpoint for this analysis record.
                    </p>
                    {analysis.notes ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
                        {analysis.notes}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">No analysis notes yet.</p>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedFinding)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFinding(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-start gap-2">
                <DialogTitle className="text-slate-900">{selectedFinding?.title}</DialogTitle>
                {selectedFinding?.reviewed ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    Reviewed
                  </Badge>
                ) : null}
                {selectedFinding?.flaggedForFollowUp ? (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                    Follow-Up
                  </Badge>
                ) : null}
              </div>
              <Badge variant="outline" className={severityColors[selectedFinding?.severity || 'info']}>
                {severityLabels[selectedFinding?.severity || 'info']}
              </Badge>
            </div>
            <DialogDescription className="text-slate-600">
              {selectedFinding ? `${categoryLabels[selectedFinding.category]} | ${getFindingLocationLabel(selectedFinding)}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-slate-700">Excerpt:</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm italic text-slate-700">"{selectedFinding?.excerpt}"</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-700">Why flagged:</p>
              <p className="text-sm text-slate-600">{selectedFinding?.description}</p>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-700">Recommendation:</p>
              <p className="text-sm text-slate-600">{selectedFinding?.recommendation || 'No recommendation was returned for this finding.'}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Document navigation</p>
              <p className="mt-1 text-sm text-slate-600">
                Jump to the related segment and highlight the referenced excerpt directly in the document panel.
              </p>
              <Button className="mt-3" onClick={() => handleShowFindingInText()}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Show In Document
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-700">Finding Notes:</p>
              <Textarea
                placeholder="Add notes about this finding..."
                rows={3}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                onBlur={() => void handleNotesBlur()}
                disabled={isSavingNotes}
              />
              <p className="mt-2 text-xs text-slate-500">
                {isSavingNotes ? 'Saving notes...' : 'Notes save when you leave the field.'}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => void handleMarkReviewed()}
                disabled={isUpdatingReviewState || Boolean(selectedFinding?.reviewed)}
              >
                {isUpdatingReviewState ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {selectedFinding?.reviewed ? 'Reviewed' : 'Mark as Reviewed'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => void handleFlagForFollowUp()}
                disabled={isUpdatingFollowUpState || Boolean(selectedFinding?.flaggedForFollowUp)}
              >
                {isUpdatingFollowUpState ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
                {selectedFinding?.flaggedForFollowUp ? 'Flagged for Follow-Up' : 'Flag for Follow-Up'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type LoadState = 'loading' | 'loaded' | 'not-found' | 'error' | 'analysis-pending' | 'analysis-failed' | 'no-analysis';

type AnalysisViewModel = {
  document: Document;
  details: AnalysisDetails;
  notes: string;
  findings: Finding[];
  summary: AnalysisDetails['summary'];
};

function AnalysisHeader({ document, children }: { document: Document; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-slate-900">{document.title}</h2>
          <Badge variant="outline" className={reviewPriorityBadgeClass[document.reviewPriority]}>
            {reviewPriorityLabelAnalysis[document.reviewPriority]}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{document.studentName}</span>
          <span>|</span>
          <span>{document.course}</span>
          <span>|</span>
          <span>Submitted {formatDateOrDash(document.submissionDate)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'critical' | 'warning' }) {
  const cardClass = tone === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';
  const textClass = tone === 'critical' ? 'text-red-700' : 'text-amber-700';
  const valueClass = tone === 'critical' ? 'text-red-900' : 'text-amber-900';

  return (
    <Card className={cardClass}>
      <CardContent className="p-4">
        <p className={`mb-1 text-xs ${textClass}`}>{label}</p>
        <p className={valueClass}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FindingCard({ finding, onClick }: { finding: Finding; onClick: () => void }) {
  const Icon = categoryIcons[finding.category];

  return (
    <div className="cursor-pointer rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300" onClick={onClick}>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 text-slate-600" />
          <p className="text-sm text-slate-900">{finding.title}</p>
        </div>
        <Badge variant="outline" className={severityColors[finding.severity]}>
          {severityLabels[finding.severity]}
        </Badge>
      </div>
      <p className="mb-3 text-xs text-slate-600">{finding.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{getFindingLocationLabel(finding)}</span>
        <ExternalLink className="h-3 w-3 text-slate-400" />
      </div>
    </div>
  );
}