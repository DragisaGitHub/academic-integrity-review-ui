import { useEffect, useMemo, useState } from 'react';
import { Download, Trash2, Eye, Edit3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Link } from 'react-router';
import { toast } from 'sonner';
import type { Document, FinalDecision } from '../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { HttpError } from '../api';
import { deleteDocumentFromApi, exportDocumentsFromApi, listDocumentsFromApi, updateDocumentToApi } from '../services/documents';
import { formatDateOrDash } from '../utils/dateFormat';
import {
  analysisStatusBadgeClass,
  analysisStatusLabel,
  reviewPriorityBadgeClass,
  reviewPriorityLabelShort,
  reviewStatusBadgeClass,
  reviewStatusLabel,
} from '../utils/reviewPresentation';

function normalizeCourse(value: string): string {
  return value.trim().toLowerCase();
}

const decisionColors: Record<string, string> = {
  accept: 'bg-green-100 text-green-800 border-green-200',
  'accept-with-revisions': 'bg-blue-100 text-blue-800 border-blue-200',
  'request-clarification': 'bg-amber-100 text-amber-800 border-amber-200',
  escalate: 'bg-red-100 text-red-800 border-red-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200',
};

const decisionLabels: Record<string, string> = {
  accept: 'Accept',
  'accept-with-revisions': 'Accept w/ Revisions',
  'request-clarification': 'Needs Clarification',
  escalate: 'Escalated',
  none: 'Not Decided',
};

export function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    studentName: '',
    course: '',
    academicYear: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  function openEditDialog(document: Document): void {
    setEditTarget(document);
    setEditForm({
      title: document.title,
      studentName: document.studentName,
      course: document.course,
      academicYear: document.academicYear,
    });
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editTarget) return;

    setIsSavingEdit(true);
    try {
      const updatedDocument = await updateDocumentToApi(editTarget.id, {
        title: editForm.title,
        studentName: editForm.studentName,
        course: editForm.course,
        academicYear: editForm.academicYear,
      });

      setDocuments((previous) => previous.map((document) => (document.id === updatedDocument.id ? updatedDocument : document)));
      setEditTarget(null);
      toast.success('Document updated.');
    } catch (error) {
      console.error('Failed to update document', error);
      toast.error('Could not update the document.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    try {
      const { blob, filename } = await exportDocumentsFromApi({
        search: searchQuery,
        course: courseFilter,
        priority: priorityFilter,
        status: statusFilter,
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Export downloaded.');
    } catch (error) {
      console.error('Failed to export documents', error);
      toast.error('Could not export documents.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await deleteDocumentFromApi(deleteTarget.id);
      setDocuments((previous) => previous.filter((doc) => doc.id !== deleteTarget.id));
      toast.success('Document deleted.');
      setDeleteTarget(null);
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 409) {
          toast.error('Cannot delete this document while analysis is still running.');
        } else if (error.status === 404) {
          toast.error('Document not found. It may have already been deleted.');
          setDocuments((previous) => previous.filter((doc) => doc.id !== deleteTarget.id));
          setDeleteTarget(null);
        } else {
          toast.error('Failed to delete document.');
        }
      } else {
        toast.error('Failed to delete document.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasLoadError(false);

    void listDocumentsFromApi()
      .then((docs) => {
        if (cancelled) return;
        setDocuments(docs);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('Failed to load history documents from backend API', err);
        setHasLoadError(true);
        toast.error('Could not load history from the backend API.');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const doc of documents) {
      const course = doc.course.trim();
      if (!course) continue;
      const key = normalizeCourse(course);
      if (!map.has(key)) map.set(key, course);
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [documents]);

  const filteredDocuments = documents.filter(doc => {
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      doc.title.toLowerCase().indexOf(query) !== -1 ||
      doc.studentName.toLowerCase().indexOf(query) !== -1 ||
      doc.course.toLowerCase().indexOf(query) !== -1;

    const matchesCourse =
      courseFilter === 'all' || normalizeCourse(doc.course) === courseFilter;
    const matchesPriority = priorityFilter === 'all' || doc.reviewPriority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesCourse && matchesPriority && matchesStatus;
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h2 className="text-slate-900 mb-1">Analysis History</h2>
        <p className="text-sm text-slate-600">
          View and manage all analyzed documents
        </p>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-slate-900">Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2">
              <Input
                placeholder="Search by title, student, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courseOptions.map((course) => (
                  <SelectItem key={course.value} value={course.value}>
                    {course.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-review">In Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900">
              Documents ({filteredDocuments.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="text-slate-600">Document Title</TableHead>
                <TableHead className="text-slate-600">Student</TableHead>
                <TableHead className="text-slate-600">Course</TableHead>
                <TableHead className="text-slate-600">Submitted</TableHead>
                <TableHead className="text-slate-600">Analyzed</TableHead>
                <TableHead className="text-slate-600">Priority</TableHead>
                <TableHead className="text-slate-600">Status</TableHead>
                <TableHead className="text-slate-600">Decision</TableHead>
                <TableHead className="text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="border-slate-200">
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm text-slate-900 truncate">{doc.title}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">{doc.studentName}</TableCell>
                  <TableCell className="text-xs text-slate-600">{doc.course}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {formatDateOrDash(doc.submissionDate, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {doc.analysisStatus && doc.analysisStatus !== 'completed'
                      ? '—'
                      : formatDateOrDash(doc.analysisDate, {
                          month: 'short',
                          day: 'numeric',
                        })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={reviewPriorityBadgeClass[doc.reviewPriority]}>
                      {reviewPriorityLabelShort[doc.reviewPriority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc.analysisStatus && doc.analysisStatus !== 'completed' ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className={analysisStatusBadgeClass[doc.analysisStatus]}>
                          {doc.analysisStatus === 'pending' || doc.analysisStatus === 'extracting' || doc.analysisStatus === 'analyzing' ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : null}
                          {analysisStatusLabel[doc.analysisStatus]}
                        </Badge>
                        {doc.analysisStatus === 'failed' && doc.analysisErrorMessage ? (
                          <p className="text-xs text-red-600 max-w-[200px] truncate" title={doc.analysisErrorMessage}>
                            {doc.analysisErrorMessage}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <Badge variant="outline" className={reviewStatusBadgeClass[doc.status]}>
                        {reviewStatusLabel[doc.status]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const decisionKey = (doc.finalDecision ?? 'none') as FinalDecision | 'none';
                      return (
                        <Badge variant="outline" className={decisionColors[decisionKey]}>
                          {decisionLabels[decisionKey]}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/analysis/${doc.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(doc)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredDocuments.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-600">
                {isLoading
                  ? 'Loading documents…'
                  : hasLoadError
                  ? 'Could not load documents from the backend.'
                  : 'No documents found matching your filters.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => {
        if (!open && !isSavingEdit) setEditTarget(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update the stored document metadata.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-title" className="text-sm text-slate-700">Document Title</label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(event) => setEditForm((previous) => ({ ...previous, title: event.target.value }))}
                disabled={isSavingEdit}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-student" className="text-sm text-slate-700">Student Name</label>
              <Input
                id="edit-student"
                value={editForm.studentName}
                onChange={(event) => setEditForm((previous) => ({ ...previous, studentName: event.target.value }))}
                disabled={isSavingEdit}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-course" className="text-sm text-slate-700">Course</label>
              <Input
                id="edit-course"
                value={editForm.course}
                onChange={(event) => setEditForm((previous) => ({ ...previous, course: event.target.value }))}
                disabled={isSavingEdit}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-academic-year" className="text-sm text-slate-700">Academic Year</label>
              <Input
                id="edit-academic-year"
                value={editForm.academicYear}
                onChange={(event) => setEditForm((previous) => ({ ...previous, academicYear: event.target.value }))}
                disabled={isSavingEdit}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={isSavingEdit}>
              {isSavingEdit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open && !isDeleting) setDeleteTarget(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.title}"? This will permanently remove the document, its analysis, and any review notes.`
                : 'Are you sure you want to delete this document?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
