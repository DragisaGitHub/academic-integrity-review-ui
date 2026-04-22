import { useEffect, useRef, useState } from 'react';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { Document, FinalDecision, ReviewChecklist } from '../types';
import { getDocumentByIdFromApi } from '../services/documents';
import { getReviewNoteByDocumentIdFromApi, saveReviewNoteForDocumentToApi } from '../services/reviewNotes';
import { reviewPriorityBadgeClass, reviewPriorityLabelLong } from '../utils/reviewPresentation';

const suggestedQuestions = [
  'Can you explain the methodology you used in section 3?',
  'Where did you obtain the statistical data referenced in paragraph 5?',
  'Can you provide the complete citation for the Zhang et al. study?',
  'How did you verify the accuracy of the claims made in the literature review?',
  'Can you walk me through your research process for this paper?',
  'What primary sources did you consult for this topic?',
];


export function ReviewNotes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'not-found' | 'error'>('loading');

  const [checklist, setChecklist] = useState<ReviewChecklist>({
    referencesChecked: false,
    oralDefenseRequired: false,
    factualDiscussed: false,
    finalReviewCompleted: false,
  });
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<FinalDecision>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!id) {
      setDocument(null);
      setLoadState('not-found');
      return;
    }

    setLoadState('loading');
    setDocument(null);
    setNotes('');
    setChecklist({
      referencesChecked: false,
      oralDefenseRequired: false,
      factualDiscussed: false,
      finalReviewCompleted: false,
    });
    setDecision(null);
    setIsDirty(false);

    let cancelled = false;

    (async () => {
      try {
        const apiDocument = await getDocumentByIdFromApi(id);
        if (cancelled) return;

        if (!apiDocument) {
          setDocument(null);
          setLoadState('not-found');
          return;
        }

        setDocument(apiDocument);
        setLoadState('loaded');

        const reviewNote = await getReviewNoteByDocumentIdFromApi(id);
        if (cancelled) return;

        // 404 => no review note yet; keep defaults and page usable.
        if (!reviewNote) return;

        // Don't clobber in-progress typing.
        if (isDirtyRef.current) return;

        setNotes(reviewNote.notes);
        setChecklist(reviewNote.checklist);
        setDecision(reviewNote.finalDecision);
      } catch (error) {
        console.error('Failed to load review note from backend', error);
        setLoadState('error');
        toast.error('Could not load review notes from the backend API.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!id) return;

    try {
      await saveReviewNoteForDocumentToApi(id, {
        notes,
        checklist,
        finalDecision: decision,
      });

      toast.success('Review notes saved successfully');
      setIsDirty(false);
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Failed to save review note to backend', error);
      toast.error('Could not save review notes. Please try again.');
    }
  };

  if (!id || loadState === 'loading') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-slate-900 mb-1">Review Notes & Workflow</h2>
          <p className="text-sm text-slate-600">Document your review process and final decision</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Loading Review Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Fetching document details from the backend…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-slate-900 mb-1">Review Notes & Workflow</h2>
          <p className="text-sm text-slate-600">Document your review process and final decision</p>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Could Not Load Review Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-600">The backend API could not be reached.</p>
            <Button
              variant="outline"
              className="text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Graceful handling for missing/invalid ids.
  if (loadState === 'not-found' || !document) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-slate-900 mb-1">Review Notes & Workflow</h2>
          <p className="text-sm text-slate-600">
            Document your review process and final decision
          </p>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-slate-900">Document Not Found</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-600">
              We couldn’t find the document for that review notes link. It may have been deleted or the URL is invalid.
            </p>
            <Button
              variant="outline"
              className="text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const courseShort = document.course.split(' - ')[0] || document.course;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-slate-900 mb-1">Review Notes & Workflow</h2>
        <p className="text-sm text-slate-600">
          Document your review process and final decision
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Notes Area */}
        <div className="col-span-2 space-y-6">
          {/* Document Info */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-slate-900 mb-1">
                    {document.title}
                  </CardTitle>
                  <p className="text-sm text-slate-600">{document.studentName} • {courseShort}</p>
                </div>
                <Badge variant="outline" className={reviewPriorityBadgeClass[document.reviewPriority]}>
                  {reviewPriorityLabelLong[document.reviewPriority]}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Notes Editor */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Professor Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea
                placeholder="Document your findings, observations, and discussion points..."
                rows={12}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setIsDirty(true);
                }}
                className="mb-4"
              />
              <p className="text-xs text-slate-600">
                These notes are private and visible only to you.
              </p>
            </CardContent>
          </Card>

          {/* Review Checklist */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Review Checklist</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="references"
                  checked={checklist.referencesChecked}
                  onCheckedChange={(checked) => {
                    setChecklist({ ...checklist, referencesChecked: !!checked });
                    setIsDirty(true);
                  }}
                />
                <Label htmlFor="references" className="text-sm text-slate-900 cursor-pointer">
                  References manually verified
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="oral"
                  checked={checklist.oralDefenseRequired}
                  onCheckedChange={(checked) => {
                    setChecklist({ ...checklist, oralDefenseRequired: !!checked });
                    setIsDirty(true);
                  }}
                />
                <Label htmlFor="oral" className="text-sm text-slate-900 cursor-pointer">
                  Oral defense required
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="factual"
                  checked={checklist.factualDiscussed}
                  onCheckedChange={(checked) => {
                    setChecklist({ ...checklist, factualDiscussed: !!checked });
                    setIsDirty(true);
                  }}
                />
                <Label htmlFor="factual" className="text-sm text-slate-900 cursor-pointer">
                  Factual issues discussed with student
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="final"
                  checked={checklist.finalReviewCompleted}
                  onCheckedChange={(checked) => {
                    setChecklist({ ...checklist, finalReviewCompleted: !!checked });
                    setIsDirty(true);
                  }}
                />
                <Label htmlFor="final" className="text-sm text-slate-900 cursor-pointer">
                  Final review completed
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Final Decision */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Final Decision</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="decision">Select Decision</Label>
                <Select value={decision ?? ''} onValueChange={(value) => {
                  setDecision((value as FinalDecision) || null);
                  setIsDirty(true);
                }}>
                  <SelectTrigger id="decision">
                    <SelectValue placeholder="Choose final decision..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accept">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Accept</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="accept-with-revisions">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span>Accept with Revisions</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="request-clarification">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span>Request Clarification</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="escalate">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span>Escalate for Further Review</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {decision && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-700">
                    {decision === 'accept' && 'Paper meets academic integrity standards.'}
                    {decision === 'accept-with-revisions' && 'Minor revisions required before final acceptance.'}
                    {decision === 'request-clarification' && 'Student must provide additional clarification or evidence.'}
                    {decision === 'escalate' && 'This case requires departmental review.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-slate-900 hover:bg-slate-800" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Review
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Questions */}
          <Card className="border-slate-200 sticky top-24">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Suggested Follow-Up Questions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {suggestedQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors"
                    onClick={() => {
                      setNotes(notes + (notes ? '\n\n' : '') + `Q: ${question}\nA: `);
                      setIsDirty(true);
                    }}
                  >
                    <p className="text-xs text-slate-700">{question}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
