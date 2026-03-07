import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ArrowLeft, 
  AlertCircle, 
  FileText, 
  BookOpen,
  CheckCircle,
  Flag,
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
import { mockAnalysis } from '../data/mockData';
import type { Finding, FindingCategory, FindingSeverity } from '../types';

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

export function Analysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [highlightedParagraph, setHighlightedParagraph] = useState<number | null>(null);

  const analysis = mockAnalysis;
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
              <span>Submitted {new Date(analysis.submissionDate).toLocaleDateString()}</span>
              <span>•</span>
              <span>Analyzed {new Date(analysis.analysisDate).toLocaleDateString()}</span>
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
              className={
                analysis.reviewPriority === 'high' 
                  ? 'bg-red-100 text-red-800 border-red-200' 
                  : analysis.reviewPriority === 'medium'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-green-100 text-green-800 border-green-200'
              }
            >
              {analysis.reviewPriority === 'high' ? 'High Review Priority' : 
               analysis.reviewPriority === 'medium' ? 'Needs Manual Review' : 'Low Concern'}
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
      <Dialog open={!!selectedFinding} onOpenChange={() => setSelectedFinding(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between mb-2">
              <DialogTitle className="text-slate-900">{selectedFinding?.title}</DialogTitle>
              <Badge variant="outline" className={severityColors[selectedFinding?.severity || 'info']}>
                {severityLabels[selectedFinding?.severity || 'info']}
              </Badge>
            </div>
            <DialogDescription className="text-slate-600">
              {categoryLabels[selectedFinding?.category || 'citation']} • Paragraph {selectedFinding?.paragraphLocation}
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
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Reviewed
              </Button>
              <Button variant="outline" className="flex-1">
                <Flag className="h-4 w-4 mr-2" />
                Flag for Follow-Up
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
        <span className="text-xs text-slate-500">Paragraph {finding.paragraphLocation}</span>
        <ExternalLink className="h-3 w-3 text-slate-400" />
      </div>
    </div>
  );
}