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
  getFindingsByAnalysisIdFromApi,
  retryAnalysisFromApi,
  updateFindingForAnalysisFromApi,
} from '../services/analyses';
import type { AnalysisDetails, Document, Finding, FindingCategory, FindingSeverity } from '../types';
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

function formatParagraphLocation(location: number): string {
  return location >= 0 ? String(location) : 'N/A';
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

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [highlightedParagraph, setHighlightedParagraph] = useState<number | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisViewModel | null>(null);
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
    setHighlightedParagraph(null);

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

  const paragraphs = analysis.details.fullText ? analysis.details.fullText.split('\n\n') : [];

  function getFindingsForParagraph(index: number): Finding[] {
    return analysis.findings.filter((finding) => finding.paragraphLocation === index);
  }

  function getCategoryFindings(category: FindingCategory): Finding[] {
    return analysis.findings.filter((finding) => finding.category === category);
  }

  function renderParagraphWithHighlights(text: string, index: number) {
    const findings = getFindingsForParagraph(index);
    const isHighlighted = highlightedParagraph === index;

    if (findings.length === 0) {
      return <p className="mb-4 text-slate-700 leading-relaxed">{text}</p>;
    }

    const severityLevel = findings.some((finding) => finding.severity === 'critical')
      ? 'critical'
      : findings.some((finding) => finding.severity === 'warning')
        ? 'warning'
        : 'info';

    const highlightClass = severityLevel === 'critical'
      ? 'bg-red-50 border-l-4 border-red-500'
      : severityLevel === 'warning'
        ? 'bg-amber-50 border-l-4 border-amber-500'
        : 'bg-blue-50 border-l-4 border-blue-500';

    return (
      <div
        className={`mb-4 cursor-pointer rounded p-4 transition-all ${highlightClass} ${isHighlighted ? 'ring-2 ring-slate-900' : ''}`}
        onClick={() => {
          setHighlightedParagraph(index);
          setSelectedFinding(findings[0]);
        }}
      >
        <p className="text-slate-700 leading-relaxed">{text}</p>
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
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => <div key={`${index}-${paragraph.slice(0, 12)}`}>{renderParagraphWithHighlights(paragraph, index)}</div>)
              ) : (
                <p className="text-sm text-slate-600">The backend did not return extracted document text for this analysis.</p>
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
                            <FindingCard key={finding.id} finding={finding} onClick={() => setSelectedFinding(finding)} />
                          ))}
                        </TabsContent>

                        <TabsContent value="citations" className="mt-4 space-y-4">
                          {getCategoryFindings('citation').length > 0 ? (
                            getCategoryFindings('citation').map((finding) => (
                              <FindingCard key={finding.id} finding={finding} onClick={() => setSelectedFinding(finding)} />
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
                                <FindingCard key={finding.id} finding={finding} onClick={() => setSelectedFinding(finding)} />
                              ))}
                            </>
                          ) : null}
                        </TabsContent>

                        <TabsContent value="style" className="mt-4 space-y-4">
                          {getCategoryFindings('style').length > 0 ? (
                            getCategoryFindings('style').map((finding) => (
                              <FindingCard key={finding.id} finding={finding} onClick={() => setSelectedFinding(finding)} />
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
                                <FindingCard key={finding.id} finding={finding} onClick={() => setSelectedFinding(finding)} />
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
                      <p className="text-sm text-slate-600">No analysis notes were returned for this analysis.</p>
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
              {categoryLabels[selectedFinding?.category || 'citation']} | Paragraph {formatParagraphLocation(selectedFinding?.paragraphLocation ?? -1)}
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
        <h2 className="mb-2 text-slate-900">{document.title}</h2>
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
        <Badge variant="outline" className={reviewPriorityBadgeClass[document.reviewPriority]}>
          {reviewPriorityLabelAnalysis[document.reviewPriority]}
        </Badge>
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
        <span className="text-xs text-slate-500">Paragraph {formatParagraphLocation(finding.paragraphLocation)}</span>
        <ExternalLink className="h-3 w-3 text-slate-400" />
      </div>
    </div>
  );
}