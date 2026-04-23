import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { getAnalysisDetailRoute } from '../routeAccess';
import { listAnalysesFromApi, type AnalysisListItem } from '../services/analyses';
import { analysisStatusBadgeClass, analysisStatusLabel } from '../utils/reviewPresentation';
import { formatDateOrDash } from '../utils/dateFormat';

export function Analyses() {
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setHasLoadError(false);

      try {
        const nextAnalyses = await listAnalysesFromApi();
        if (cancelled) return;
        setAnalyses(nextAnalyses);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load analyses', error);
        setHasLoadError(true);
        toast.error('Could not load analyses from the backend API.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-16 w-16 text-slate-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-slate-900 mb-2">Loading Analyses</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Fetching the latest analysis lifecycle data from the backend.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <RefreshCcw className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-slate-900 mb-2">Could Not Load Analyses</h3>
            <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
              The backend API could not be reached.
            </p>
            <Link to="/upload">
              <Button className="bg-slate-900 hover:bg-slate-800">
                Upload Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-slate-900 mb-2">No Analyses Yet</h3>
            <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
              Upload a document to begin analyzing student papers for academic integrity patterns.
            </p>
            <Link to="/upload">
              <Button className="bg-slate-900 hover:bg-slate-800">
                Upload Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-slate-900 mb-1">Analyses</h2>
        <p className="text-sm text-slate-600">Track document analyses and open a document&apos;s analysis details.</p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="text-slate-600">Analysis</TableHead>
                <TableHead className="text-slate-600">Student</TableHead>
                <TableHead className="text-slate-600">Course</TableHead>
                <TableHead className="text-slate-600">Status</TableHead>
                <TableHead className="text-slate-600">Updated</TableHead>
                <TableHead className="text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map((analysis) => (
                <TableRow key={analysis.id} className="border-slate-200">
                  <TableCell>
                    <div>
                      <p className="text-sm text-slate-900">{analysis.title}</p>
                      <p className="text-xs text-slate-500">Analysis #{analysis.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">{analysis.studentName}</TableCell>
                  <TableCell className="text-xs text-slate-600">{analysis.course || '—'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className={analysisStatusBadgeClass[analysis.status]}>
                        {analysis.status === 'pending' || analysis.status === 'extracting' || analysis.status === 'analyzing' ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : null}
                        {analysisStatusLabel[analysis.status]}
                      </Badge>
                      {analysis.status === 'failed' && analysis.errorMessage ? (
                        <p className="text-xs text-red-600 max-w-[220px] truncate" title={analysis.errorMessage}>
                          {analysis.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {formatDateOrDash(analysis.updatedAt ?? analysis.analysisDate ?? analysis.createdAt, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {analysis.documentId ? (
                      <Link to={getAnalysisDetailRoute(analysis.documentId)}>
                        <Button variant="outline" size="sm">Open</Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>Open</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
