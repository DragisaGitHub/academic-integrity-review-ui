import { useState } from 'react';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

const suggestedQuestions = [
  'Can you explain the methodology you used in section 3?',
  'Where did you obtain the statistical data referenced in paragraph 5?',
  'Can you provide the complete citation for the Zhang et al. study?',
  'How did you verify the accuracy of the claims made in the literature review?',
  'Can you walk me through your research process for this paper?',
  'What primary sources did you consult for this topic?',
];

export function ReviewNotes() {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState({
    referencesChecked: false,
    oralDefenseRequired: false,
    factualDiscussed: false,
    finalReviewCompleted: false,
  });
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<string>('');

  const handleSave = () => {
    toast.success('Review notes saved successfully');
    setTimeout(() => navigate('/'), 1500);
  };

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
                    The Impact of Machine Learning on Modern Healthcare Systems
                  </CardTitle>
                  <p className="text-sm text-slate-600">Emma Richardson • CSCI 4950</p>
                </div>
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                  High Priority
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
                onChange={(e) => setNotes(e.target.value)}
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
                  onCheckedChange={(checked) =>
                    setChecklist({ ...checklist, referencesChecked: !!checked })
                  }
                />
                <Label htmlFor="references" className="text-sm text-slate-900 cursor-pointer">
                  References manually verified
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="oral"
                  checked={checklist.oralDefenseRequired}
                  onCheckedChange={(checked) =>
                    setChecklist({ ...checklist, oralDefenseRequired: !!checked })
                  }
                />
                <Label htmlFor="oral" className="text-sm text-slate-900 cursor-pointer">
                  Oral defense required
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="factual"
                  checked={checklist.factualDiscussed}
                  onCheckedChange={(checked) =>
                    setChecklist({ ...checklist, factualDiscussed: !!checked })
                  }
                />
                <Label htmlFor="factual" className="text-sm text-slate-900 cursor-pointer">
                  Factual issues discussed with student
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="final"
                  checked={checklist.finalReviewCompleted}
                  onCheckedChange={(checked) =>
                    setChecklist({ ...checklist, finalReviewCompleted: !!checked })
                  }
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
                <Select value={decision} onValueChange={setDecision}>
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
                    <SelectItem value="accept-revisions">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span>Accept with Revisions</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="clarification">
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
                    {decision === 'accept-revisions' && 'Minor revisions required before final acceptance.'}
                    {decision === 'clarification' && 'Student must provide additional clarification or evidence.'}
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
