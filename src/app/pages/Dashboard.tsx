import { useEffect, useMemo, useState } from 'react';
import { FileCheck, AlertCircle, CheckCircle, Clock, Plus, Filter, Loader2 } from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { buildKpisFromDocuments, buildPriorityDistributionFromDocuments } from '../services/kpis';
import type { Document } from '../types';
import { getAnalysisDetailRoute } from '../routeAccess';
import { listAnalysesFromApi, type AnalysisListItem } from '../services/analyses';
import { listDocumentsFromApi } from '../services/documents';
import { formatDateOrDash } from '../utils/dateFormat';
import {
  analysisStatusBadgeClass,
  analysisStatusLabel,
  reviewPriorityBadgeClass,
  reviewPriorityLabelLong,
  reviewStatusBadgeClass,
  reviewStatusLabel,
} from '../utils/reviewPresentation';

function normalizeCourse(value: string): string {
  return value.trim().toLowerCase();
}

export function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [courseFilter, setCourseFilter] = useState('all');

  const kpis = useMemo(() => buildKpisFromDocuments(documents), [documents]);
  const priorityDistribution = useMemo(() => buildPriorityDistributionFromDocuments(documents), [documents]);

  const totalDocuments = documents.length;
  const averagePerWeek = useMemo(() => {
    if (documents.length === 0) return 0;

    const timestamps = documents
      .map((d) => (d.submissionDate ? Date.parse(d.submissionDate) : Number.NaN))
      .filter((ts) => !Number.isNaN(ts))
      .sort((a, b) => a - b);

    if (timestamps.length < 2) return timestamps.length;

    const first = timestamps[0];
    const last = timestamps[timestamps.length - 1];
    const diffMs = Math.max(0, last - first);
    const weeks = Math.max(1, diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.round((timestamps.length / weeks) * 10) / 10;
  }, [documents]);

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const analysis of analyses) {
      const course = analysis.course.trim();
      if (!course) continue;
      const key = normalizeCourse(course);
      if (!map.has(key)) map.set(key, course);
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [documents]);

  const filteredAnalyses = useMemo(() => {
    if (courseFilter === 'all') return analyses;
    return analyses.filter((analysis) => normalizeCourse(analysis.course) === courseFilter);
  }, [analyses, courseFilter]);

  useEffect(() => {
    let cancelled = false;

    void listDocumentsFromApi()
      .then((docs) => {
        if (cancelled) return;
        setDocuments(docs);
      })
      .catch((err: unknown) => {
        console.warn('Failed to load documents from backend API', err);
        toast.error('Could not reach the backend API. Please try again.');
      });

    void listAnalysesFromApi()
      .then((items) => {
        if (cancelled) return;
        setAnalyses(items);
      })
      .catch((err: unknown) => {
        console.warn('Failed to load analyses from backend API', err);
        toast.error('Could not load analyses from the backend API.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Welcome Section */}
      <div>
        <p className="text-slate-600 text-sm mb-1">Welcome back, Professor.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          title="Total Documents Reviewed"
          value={kpis.totalReviewed}
          icon={FileCheck}
          colorClass="text-slate-700"
          trend="+12 this month"
          trendUp
        />
        <KPICard
          title="Pending Manual Review"
          value={kpis.pendingReview}
          icon={Clock}
          colorClass="text-blue-600"
        />
        <KPICard
          title="High Review Priority"
          value={kpis.highPriority}
          icon={AlertCircle}
          colorClass="text-red-600"
          trend="Requires attention"
        />
        <KPICard
          title="Verified / Low Concern"
          value={kpis.verified}
          icon={CheckCircle}
          colorClass="text-green-600"
          trend="74% of total"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Analyses Table */}
        <div className="col-span-2">
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900">Recent Analyses</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-40 h-9 text-sm">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
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
                  <Link to="/upload">
                    <Button className="bg-slate-900 hover:bg-slate-800 h-9">
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="text-slate-600">Document Title</TableHead>
                    <TableHead className="text-slate-600">Student</TableHead>
                    <TableHead className="text-slate-600">Course</TableHead>
                    <TableHead className="text-slate-600">Updated</TableHead>
                    <TableHead className="text-slate-600">Priority</TableHead>
                    <TableHead className="text-slate-600">Status</TableHead>
                    <TableHead className="text-slate-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalyses.map((analysis) => (
                    <TableRow key={analysis.id} className="border-slate-200">
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm text-slate-900 truncate">{analysis.title}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{analysis.studentName}</TableCell>
                      <TableCell className="text-xs text-slate-600">{analysis.course || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDateOrDash(analysis.updatedAt ?? analysis.analysisDate ?? analysis.createdAt ?? analysis.submissionDate, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={reviewPriorityBadgeClass[analysis.reviewPriority]}>
                          {reviewPriorityLabelLong[analysis.reviewPriority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className={analysisStatusBadgeClass[analysis.status]}>
                            {analysis.status === 'pending' || analysis.status === 'extracting' || analysis.status === 'analyzing' ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : null}
                            {analysisStatusLabel[analysis.status]}
                          </Badge>
                          {analysis.status === 'failed' && analysis.errorMessage ? (
                            <p className="text-xs text-red-600 max-w-[180px] truncate" title={analysis.errorMessage}>
                              {analysis.errorMessage}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={analysis.documentId ? getAnalysisDetailRoute(analysis.documentId) : '#'}>
                          <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900" disabled={!analysis.documentId}>
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Priority Distribution Chart */}
        <div>
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200 pb-4">
              <CardTitle className="text-slate-900">Review Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={priorityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry: any) => (
                      <span className="text-sm text-slate-700">{`${value} (${entry.payload.value})`}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Documents</span>
                  <span className="text-slate-900">{totalDocuments}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Average per Week</span>
                  <span className="text-slate-900">{averagePerWeek}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
