import { useEffect, useRef, useState } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { uploadDocumentToApi } from '../services/documents';
import { createAnalysisToApi, getAnalysisStatusFromApi, saveAnalysisNotesForAnalysisToApi } from '../services/analyses';

const analysisSteps = [
  'Extracting text from document',
  'Identifying references and citations',
  'Analyzing factual claims',
  'Detecting style patterns',
  'Generating findings report',
];

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

export function Upload() {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const pollingAbortControllerRef = useRef<AbortController | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    studentName: '',
    course: '',
    academicYear: '2025-2026',
    notes: '',
    citationAnalysis: true,
    referenceValidation: true,
    factualReview: true,
    styleConsistency: true,
    aiReview: true,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      setFileName(file.name);
      setUploadedDocumentId(null);
      setAnalysisId(null);
    }
  };

  useEffect(() => {
    return () => {
      pollingAbortControllerRef.current?.abort();
    };
  }, []);

  const handleStartAnalysis = async () => {
    if (!file && !uploadedDocumentId) return;

    pollingAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    pollingAbortControllerRef.current = abortController;

    setIsUploading(true);
    setCurrentStep(0);
    setProgress(0);

    try {
      let documentId = uploadedDocumentId;

      if (!documentId) {
        if (!file) throw new Error('No file selected');
        const createdDocument = await uploadDocumentToApi({
          file,
          title: formData.title.trim() || file.name,
          studentName: formData.studentName,
          course: formData.course,
          academicYear: formData.academicYear,
          reviewPriority: 'low',
        });
        documentId = createdDocument.id;
        setUploadedDocumentId(documentId);
      }

      const analysisDocumentId = Number(documentId);
      if (!Number.isFinite(analysisDocumentId)) {
        toast.error('Upload returned an invalid document id.');
        setIsUploading(false);
        setProgress(0);
        setCurrentStep(0);
        return;
      }

      const createdAnalysis = await createAnalysisToApi({ documentId: analysisDocumentId });
      const createdAnalysisId = createdAnalysis.analysisId;

      if (!createdAnalysisId) {
        toast.error('Analysis started, but no analysis id was returned by the backend.');
        setIsUploading(false);
        setProgress(0);
        setCurrentStep(0);
        return;
      }

      setAnalysisId(createdAnalysisId);

      if (formData.notes.trim()) {
        try {
          await saveAnalysisNotesForAnalysisToApi(createdAnalysisId, formData.notes);
        } catch (error) {
          console.error('Failed to save analysis notes', error);
          toast.error('Analysis started, but the initial notes could not be saved.');
        }
      }

      let analyzingPollCount = 0;

      try {
        while (!abortController.signal.aborted) {
          const statusResult = await getAnalysisStatusFromApi(createdAnalysisId, abortController.signal);

          switch (statusResult.status) {
            case 'pending':
              setCurrentStep(0);
              setProgress(15);
              break;
            case 'extracting':
              setCurrentStep(1);
              setProgress(35);
              break;
            case 'analyzing':
              analyzingPollCount += 1;
              setCurrentStep(analyzingPollCount >= 2 ? 3 : 2);
              setProgress(analyzingPollCount >= 2 ? 75 : 60);
              break;
            case 'completed':
              setCurrentStep(analysisSteps.length - 1);
              setProgress(100);
              await wait(500, abortController.signal);
              navigate(`/analysis/${documentId}`);
              return;
            case 'failed':
              toast.error(statusResult.errorMessage ?? 'Analysis failed. Please try again.');
              setIsUploading(false);
              setProgress(0);
              setCurrentStep(0);
              return;
            default:
              break;
          }

          await wait(3000, abortController.signal);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.error('Failed to create analysis', error);
        toast.error('Analysis polling failed. Please try again.');
        setIsUploading(false);
        setProgress(0);
        setCurrentStep(0);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('Upload failed', error);
      toast.error('Upload failed. Please check the file and try again.');
      setIsUploading(false);
      setProgress(0);
      setCurrentStep(0);
      setUploadedDocumentId(null);
      setAnalysisId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-slate-900 mb-1">Upload New Document</h2>
        <p className="text-sm text-slate-600">
          Submit a student document for academic integrity analysis
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Upload Form */}
        <div className="col-span-2 space-y-6">
          {/* File Upload */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-slate-400 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    {fileName ? (
                      <>
                        <FileText className="h-12 w-12 text-blue-600" />
                        <div>
                          <p className="text-slate-900">{fileName}</p>
                          <p className="text-sm text-slate-600 mt-1">Click to change file</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadIcon className="h-12 w-12 text-slate-400" />
                        <div>
                          <p className="text-slate-900">Drop your file here or click to browse</p>
                          <p className="text-sm text-slate-600 mt-1">Supports PDF, DOCX, and TXT files</p>
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Document Information */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Document Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Machine Learning in Healthcare"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={isUploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student">Student Name</Label>
                  <Input
                    id="student"
                    placeholder="e.g., Emma Richardson"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    placeholder="e.g., Course Code - Course Name"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    disabled={isUploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Academic Year</Label>
                  <Input
                    id="year"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Professor Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes or context about this submission..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={isUploading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Analysis Options */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Analysis Modules</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-900">Citation Analysis</p>
                  <p className="text-xs text-slate-600">Identify missing or incomplete citations</p>
                </div>
                <Switch
                  checked={formData.citationAnalysis}
                  onCheckedChange={(checked) => setFormData({ ...formData, citationAnalysis: checked })}
                  disabled={isUploading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-900">Reference Validation</p>
                  <p className="text-xs text-slate-600">Verify cited sources and detect fabrication</p>
                </div>
                <Switch
                  checked={formData.referenceValidation}
                  onCheckedChange={(checked) => setFormData({ ...formData, referenceValidation: checked })}
                  disabled={isUploading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-900">Factual Consistency Review</p>
                  <p className="text-xs text-slate-600">Detect contradictions and factual issues</p>
                </div>
                <Switch
                  checked={formData.factualReview}
                  onCheckedChange={(checked) => setFormData({ ...formData, factualReview: checked })}
                  disabled={isUploading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-900">Writing Style Consistency</p>
                  <p className="text-xs text-slate-600">Identify unusual style variations</p>
                </div>
                <Switch
                  checked={formData.styleConsistency}
                  onCheckedChange={(checked) => setFormData({ ...formData, styleConsistency: checked })}
                  disabled={isUploading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-900">AI Review Assistance</p>
                  <p className="text-xs text-slate-600">Note patterns that may indicate assistance</p>
                </div>
                <Switch
                  checked={formData.aiReview}
                  onCheckedChange={(checked) => setFormData({ ...formData, aiReview: checked })}
                  disabled={isUploading}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-slate-900 hover:bg-slate-800"
            size="lg"
            onClick={handleStartAnalysis}
            disabled={(!fileName && !uploadedDocumentId) || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              'Start Analysis'
            )}
          </Button>
        </div>

        {/* Progress Panel */}
        <div>
          <Card className="border-slate-200 sticky top-24">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">
                {isUploading ? 'Analysis Progress' : 'Analysis Steps'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {analysisId && !isUploading ? (
                  <p className="text-xs text-slate-500 mb-4">Last analysis id: {analysisId}</p>
                ) : null}
              {isUploading && (
                <div className="mb-6">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-slate-600 mt-2">{progress}% complete</p>
                </div>
              )}
              <div className="space-y-4">
                {analysisSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${
                      isUploading && index === currentStep
                        ? 'text-blue-600'
                        : isUploading && index < currentStep
                        ? 'text-green-600'
                        : 'text-slate-400'
                    }`}>
                      {isUploading && index < currentStep ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : isUploading && index === currentStep ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-current" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm ${
                        isUploading && index === currentStep
                          ? 'text-slate-900'
                          : isUploading && index < currentStep
                          ? 'text-slate-700'
                          : 'text-slate-600'
                      }`}>
                        {step}
                      </p>
                    </div>
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
