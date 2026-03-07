import { useState } from 'react';
import { Filter, Download, Trash2, Eye, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { mockDocuments } from '../data/mockData';
import { Link } from 'react-router';
import type { ReviewPriority, ReviewStatus, FinalDecision } from '../types';

const priorityColors: Record<ReviewPriority, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

const statusColors: Record<ReviewStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  'in-review': 'bg-blue-100 text-blue-700 border-blue-200',
  reviewed: 'bg-green-100 text-green-700 border-green-200',
  flagged: 'bg-red-100 text-red-700 border-red-200',
};

const decisionColors: Record<FinalDecision, string> = {
  accept: 'bg-green-100 text-green-800 border-green-200',
  'accept-with-revisions': 'bg-blue-100 text-blue-800 border-blue-200',
  'request-clarification': 'bg-amber-100 text-amber-800 border-amber-200',
  escalate: 'bg-red-100 text-red-800 border-red-200',
  null: 'bg-slate-100 text-slate-600 border-slate-200',
};

const priorityLabels: Record<ReviewPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const statusLabels: Record<ReviewStatus, string> = {
  pending: 'Pending',
  'in-review': 'In Review',
  reviewed: 'Reviewed',
  flagged: 'Flagged',
};

const decisionLabels: Record<FinalDecision, string> = {
  accept: 'Accept',
  'accept-with-revisions': 'Accept w/ Revisions',
  'request-clarification': 'Needs Clarification',
  escalate: 'Escalated',
  null: 'Not Decided',
};

export function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Expand mock data with more entries
  const allDocuments = [
    ...mockDocuments,
    ...mockDocuments.map((doc, i) => ({
      ...doc,
      id: `${doc.id}-${i}`,
      submissionDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })),
  ];

  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.course.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCourse = courseFilter === 'all' || doc.course.includes(courseFilter);
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
                <SelectItem value="CSCI">Computer Science</SelectItem>
                <SelectItem value="POLS">Political Science</SelectItem>
                <SelectItem value="BIOL">Biology</SelectItem>
                <SelectItem value="URBN">Urban Planning</SelectItem>
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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
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
                    {new Date(doc.submissionDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {new Date(doc.analysisDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={priorityColors[doc.reviewPriority]}>
                      {priorityLabels[doc.reviewPriority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[doc.status]}>
                      {statusLabels[doc.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={decisionColors[doc.finalDecision || null]}>
                      {decisionLabels[doc.finalDecision || null]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/analysis/${doc.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
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
              <p className="text-slate-600">No documents found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
