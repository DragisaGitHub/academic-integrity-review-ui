import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ArrowLeft, 
  AlertCircle, 
  FileText, 
  BookOpen,
  CheckCircle,
  Flag,
  Loader2,
  MessageSquare,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import type { Document, DocumentAnalysis, Finding, FindingCategory, FindingSeverity } from '../types';
import { getDocumentByIdFromApi } from '../services/documents';
import {
  computeSummaryFromFindings,
  getAnalysisStatusFromApi,
  getAnalysisByDocumentIdFromApi,
  getFindingsByAnalysisIdFromApi,
  retryAnalysisFromApi,
  updateFindingForAnalysisFromApi,
} from '../services/analyses';
import { formatDateOrDash } from '../utils/dateFormat';
import { reviewPriorityBadgeClass, reviewPriorityLabelAnalysis } from '../utils/reviewPresentation';

const categoryIcons: Record<FindingCategory, any> = {
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [highlightedParagraph, setHighlightedParagraph] = useState<number | null>(null);

  const [document, setDocument] = useState<Document | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState<string>('');
  const [analysisIdOverride, setAnalysisIdOverride] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUpdatingReviewState, setIsUpdatingReviewState] = useState(false);
  const [isUpdatingFollowUpState, setIsUpdatingFollowUpState] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'not-found' | 'error' | 'analysis-pending' | 'analysis-failed'>('loading');
  const retryPendingRef = useRef(false);

  function applyUpdatedFinding(updatedFinding: Finding): void {
    setAnalysis((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        findings: previous.findings.map((finding) =>
          finding.id === updatedFinding.id ? { ...finding, ...updatedFinding } : finding,
        ),
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
    if (!analysis?.analysisId || !selectedFinding) {
      toast.error('Finding details are not available yet.');
      return null;
    }

    try {
      const updatedFinding = await updateFindingForAnalysisFromApi({
        analysisId: analysis.analysisId,
        documentId: analysis.id,
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
        toast.success('Professor notes saved.');
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

  useEffect(() => {
    setNotesDraft(selectedFinding?.professorNotes ?? '');
  }, [selectedFinding]);

  async function handleRetry(): Promise<void> {
    if (!document?.analysisId) {
      toast.error('No analysis is available to retry.');
      return;
    }

    setIsRetrying(true);

    try {
      const retryResult = await retryAnalysisFromApi(document.analysisId);
      retryPendingRef.current = true;
      setAnalysisIdOverride(retryResult.analysisId ?? document.analysisId);
      setAnalysisErrorMessage('');
      setLoadState('analysis-pending');
      setRetryTrigger((previous) => previous + 1);
      toast.success('Retrying analysis…');
    } catch (error) {
      console.error('Failed to retry analysis', error);
      toast.error('Failed to retry analysis.');
    } finally {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    if (!id) {
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

    let cancelled = false;
    const abortController = new AbortController();

    (async () => {
      try {
        const loadedDocument = await getDocumentByIdFromApi(id);
        if (cancelled) return;

        if (!loadedDocument) {
          setDocument(null);
          setAnalysis(null);
          setLoadState('not-found');
          return;
        }

        setDocument(loadedDocument);

        const forcedPending = retryPendingRef.current;
        retryPendingRef.current = false;
        const activeAnalysisId = analysisIdOverride ?? loadedDocument.analysisId ?? null;
        let currentStatus = forcedPending ? 'pending' : loadedDocument.analysisStatus;

        if (currentStatus === 'failed') {
          setAnalysis(null);
          setAnalysisErrorMessage(loadedDocument.analysisErrorMessage ?? 'The analysis failed on the backend.');
          setLoadState('analysis-failed');
          return;
        }

        if ((currentStatus === 'pending' || currentStatus === 'extracting' || currentStatus === 'analyzing') && activeAnalysisId) {
          setLoadState('analysis-pending');

          while (!abortController.signal.aborted) {
            const statusResult = await getAnalysisStatusFromApi(activeAnalysisId, abortController.signal);
            currentStatus = statusResult.status;

            if (currentStatus === 'failed') {
              setAnalysis(null);
              setAnalysisErrorMessage(statusResult.errorMessage ?? loadedDocument.analysisErrorMessage ?? 'The analysis failed on the backend.');
              setLoadState('analysis-failed');
              return;
            }

            if (currentStatus === 'completed') {
              break;
            }

            await wait(3000, abortController.signal);
          }
        }

        const analysisDetails = await getAnalysisByDocumentIdFromApi(id);
        if (cancelled) return;

        // Document exists but no analysis exists yet.
        if (!analysisDetails) {
          setAnalysis({
            ...loadedDocument,
            findings: [],
            summary: {
              missingCitations: 0,
              suspiciousReferences: 0,
              factualIssues: 0,
              styleInconsistencies: 0,
              unsupportedClaims: 0,
            },
            fullText: '',
          });
          setLoadState('loaded');
          return;
        }

        const findings = await getFindingsByAnalysisIdFromApi(
          {
          analysisId: analysisDetails.id,
          documentId: loadedDocument.id,
          signal: abortController.signal,
          },
        );
        if (cancelled) return;

        setAnalysis({
          ...loadedDocument,
          analysisId: loadedDocument.analysisId ?? analysisDetails.id,
          analysisDate: analysisDetails.analysisDate ?? loadedDocument.analysisDate,
          summary: computeSummaryFromFindings(findings),
          fullText: analysisDetails.fullText,
          findings,
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
  }, [analysisIdOverride, id, retryTrigger]);

  const headerDocument = analysis ?? document;

  if (!id) {
    return (
      <div className="max-w-[1800px] mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-slate-700 hover:text-slate-900"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Analysis Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">
              We couldn’t find an analysis for that document. It may have been deleted or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'loading') {
    return (
      <div className="max-w-[1800px] mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-slate-700 hover:text-slate-900"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Loading Analysis</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Fetching analysis details from the backend…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="max-w-[1800px] mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-slate-700 hover:text-slate-900"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Could Not Load Analysis</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">The backend API could not be reached.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'analysis-pending' && headerDocument) {
    return (
      <div className="max-w-[1800px] mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-slate-700 hover:text-slate-900"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-slate-900 mb-2">{headerDocument.title}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{headerDocument.studentName}</span>
              <span>•</span>
              <span>{headerDocument.course}</span>
              <span>•</span>
              <span>Submitted {formatDateOrDash(headerDocument.submissionDate)}</span>
            </div>
          </div>
          <Badge variant="outline" className={reviewPriorityBadgeClass[headerDocument.reviewPriority]}>
            {reviewPriorityLabelAnalysis[headerDocument.reviewPriority]}
          </Badge>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Analysis in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">
              The document is being analyzed. This page will update automatically when the backend marks the analysis as completed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'analysis-failed' && headerDocument) {
    return (
      <div className="max-w-[1800px] mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-slate-700 hover:text-slate-900"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-slate-900 mb-2">{headerDocument.title}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{headerDocument.studentName}</span>
              <span>•</span>
              <span>{headerDocument.course}</span>
              <span>•</span>
              <span>Submitted {formatDateOrDash(headerDocument.submissionDate)}</span>
            </div>
          </div>
          <Badge variant="outline" className={reviewPriorityBadgeClass[headerDocument.reviewPriority]}>
            {reviewPriorityLabelAnalysis[headerDocument.reviewPriority]}
          </Badge>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="border-b border-red-200 pb-4">
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Analysis Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-red-800">
              {analysisErrorMessage || 'The backend could not complete this analysis.'}
            </p>
            <Button onClick={() => void handleRetry()} disabled={isRetrying}>
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry Analysis'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Graceful handling for missing/invalid ids.
  if (loadState === 'not-found' || !analysis) {
    return (
      <div className="max-w-[1800px] mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-slate-700 hover:text-slate-900"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Analysis Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">
              We couldn’t find an analysis for that document. It may have been deleted or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paragraphs = analysis.fullText.split('\n\n');

  const getFindingsForParagraph = (index: number) => {
    return analysis.findings.filter(f => f.paragraphLocation === index);
  };

  const getCategoryFindings = (category: FindingCategory) => {
    return analysis.findings.filter(f => f.category === category);
  };

  const renderParagraphWithHighlights = (text: string, index: number) => {
    const findings = getFindingsForParagraph(index);
    const isHighlighted = highlightedParagraph === index;

    if (findings.length === 0) {
      return <p className="text-slate-700 leading-relaxed mb-4">{text}</p>;
    }

    const severityLevel = findings.some(f => f.severity === 'critical') 
      ? 'critical' 
      : findings.some(f => f.severity === 'warning') 
      ? 'warning' 
      : 'info';

    const highlightClass = 
      severityLevel === 'critical' 
        ? 'bg-red-50 border-l-4 border-red-500' 
        : severityLevel === 'warning'
        ? 'bg-amber-50 border-l-4 border-amber-500'
        : 'bg-blue-50 border-l-4 border-blue-500';

    return (
      <div 
        className={`p-4 mb-4 rounded cursor-pointer transition-all ${highlightClass} ${
          isHighlighted ? 'ring-2 ring-slate-900' : ''
        }`}
        onClick={() => {
          setHighlightedParagraph(index);
          setSelectedFinding(findings[0]);
        }}
      >
        <p className="text-slate-700 leading-relaxed">{text}</p>
        <div className="flex gap-2 mt-3">
          {findings.map((finding) => (
            <Badge key={finding.id} variant="outline" className="text-xs">
              {categoryLabels[finding.category]}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4 text-slate-700 hover:text-slate-900"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-slate-900 mb-2">{analysis.title}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{analysis.studentName}</span>
              <span>•</span>
              <span>{analysis.course}</span>
              <span>•</span>
              <span>Submitted {formatDateOrDash(analysis.submissionDate)}</span>
              <span>•</span>
              <span>Analyzed {formatDateOrDash(analysis.analysisDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate(`/review-notes/${id}`)}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Review Notes
            </Button>
            <Badge 
              variant="outline" 
              className={reviewPriorityBadgeClass[analysis.reviewPriority]}
            >
              {reviewPriorityLabelAnalysis[analysis.reviewPriority]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-700 mb-1">Missing Citations</p>
            <p className="text-red-900">{analysis.summary.missingCitations}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-700 mb-1">Suspicious References</p>
            <p className="text-red-900">{analysis.summary.suspiciousReferences}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 mb-1">Factual Issues</p>
            <p className="text-amber-900">{analysis.summary.factualIssues}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 mb-1">Style Inconsistencies</p>
            <p className="text-amber-900">{analysis.summary.styleInconsistencies}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 mb-1">Unsupported Claims</p>
            <p className="text-amber-900">{analysis.summary.unsupportedClaims}</p>
          </CardContent>
        </Card>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* Document Viewer */}
        <div className="col-span-3">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Document Text</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 max-h-[800px] overflow-y-auto">
              {paragraphs.map((paragraph, index) => (
                <div key={index}>
                  {renderParagraphWithHighlights(paragraph, index)}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Findings Panel */}
        <div className="col-span-2">
          <Card className="border-slate-200 sticky top-24">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Analysis Findings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="overview">
                <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-slate-200">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="citations">Citations</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                </TabsList>

                <div className="max-h-[700px] overflow-y-auto">
                  <TabsContent value="overview" className="p-6 space-y-4 mt-0">
                    {analysis.findings.slice(0, 6).map((finding) => (
                      <FindingCard 
                        key={finding.id} 
                        finding={finding}
                        onClick={() => setSelectedFinding(finding)}
                      />
                    ))}
                  </TabsContent>

                  <TabsContent value="citations" className="p-6 space-y-4 mt-0">
                    {getCategoryFindings('citation').length > 0 ? (
                      getCategoryFindings('citation').map((finding) => (
                        <FindingCard 
                          key={finding.id} 
                          finding={finding}
                          onClick={() => setSelectedFinding(finding)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No citation issues found.</p>
                    )}
                    {getCategoryFindings('reference').length > 0 && (
                      <>
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-sm text-slate-900 mb-4">Reference Issues</p>
                        </div>
                        {getCategoryFindings('reference').map((finding) => (
                          <FindingCard 
                            key={finding.id} 
                            finding={finding}
                            onClick={() => setSelectedFinding(finding)}
                          />
                        ))}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="style" className="p-6 space-y-4 mt-0">
                    {getCategoryFindings('style').length > 0 ? (
                      getCategoryFindings('style').map((finding) => (
                        <FindingCard 
                          key={finding.id} 
                          finding={finding}
                          onClick={() => setSelectedFinding(finding)}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No style issues found.</p>
                    )}
                    {getCategoryFindings('ai').length > 0 && (
                      <>
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-sm text-slate-900 mb-4">AI Review Notes</p>
                        </div>
                        {getCategoryFindings('ai').map((finding) => (
                          <FindingCard 
                            key={finding.id} 
                            finding={finding}
                            onClick={() => setSelectedFinding(finding)}
                          />
                        ))}
                      </>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Finding Detail Modal */}
      <Dialog open={!!selectedFinding} onOpenChange={(open) => {
        if (!open) {
          setSelectedFinding(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between mb-2">
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
              {categoryLabels[selectedFinding?.category || 'citation']} • Paragraph {formatParagraphLocation(selectedFinding?.paragraphLocation ?? -1)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-700 mb-2">Excerpt:</p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-700 italic">"{selectedFinding?.excerpt}"</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-700 mb-2">Why flagged:</p>
              <p className="text-sm text-slate-600">{selectedFinding?.description}</p>
            </div>

            <div>
              <p className="text-sm text-slate-700 mb-2">Recommendation:</p>
              <p className="text-sm text-slate-600">{selectedFinding?.recommendation}</p>
            </div>

            {selectedFinding?.followUpQuestion && (
              <div>
                <p className="text-sm text-slate-700 mb-2">Suggested follow-up question:</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">{selectedFinding.followUpQuestion}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-slate-700 mb-2">Professor Notes:</p>
              <Textarea 
                placeholder="Add your notes about this finding..."
                rows={3}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                onBlur={() => void handleNotesBlur()}
                disabled={isSavingNotes}
              />
              <p className="text-xs text-slate-500 mt-2">
                {isSavingNotes ? 'Saving notes…' : 'Notes save when you leave the field.'}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => void handleMarkReviewed()}
                disabled={isUpdatingReviewState || Boolean(selectedFinding?.reviewed)}
              >
                {isUpdatingReviewState ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {selectedFinding?.reviewed ? 'Reviewed' : 'Mark as Reviewed'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => void handleFlagForFollowUp()}
                disabled={isUpdatingFollowUpState || Boolean(selectedFinding?.flaggedForFollowUp)}
              >
                {isUpdatingFollowUpState ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
                {selectedFinding?.flaggedForFollowUp ? 'Flagged for Follow-Up' : 'Flag for Follow-Up'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FindingCard({ finding, onClick }: { finding: Finding; onClick: () => void }) {
  const Icon = categoryIcons[finding.category];

  return (
    <div 
      className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 text-slate-600 mt-0.5" />
          <p className="text-sm text-slate-900">{finding.title}</p>
        </div>
        <Badge variant="outline" className={severityColors[finding.severity]}>
          {severityLabels[finding.severity]}
        </Badge>
      </div>
      <p className="text-xs text-slate-600 mb-3">{finding.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Paragraph {formatParagraphLocation(finding.paragraphLocation)}</span>
        <ExternalLink className="h-3 w-3 text-slate-400" />
      </div>
    </div>
  );
}