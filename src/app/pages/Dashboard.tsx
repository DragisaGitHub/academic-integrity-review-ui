import { FileCheck, AlertCircle, CheckCircle, Clock, Plus, Filter } from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { mockKPIData, mockDocuments, mockPriorityDistribution } from '../data/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Link } from 'react-router';
import type { ReviewPriority, ReviewStatus } from '../types';

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

const priorityLabels: Record<ReviewPriority, string> = {
  low: 'Low Concern',
  medium: 'Needs Review',
  high: 'High Priority',
};

const statusLabels: Record<ReviewStatus, string> = {
  pending: 'Pending',
  'in-review': 'In Review',
  reviewed: 'Reviewed',
  flagged: 'Flagged',
};

export function Dashboard() {
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
          value={mockKPIData.totalReviewed}
          icon={FileCheck}
          colorClass="text-slate-700"
          trend="+12 this month"
          trendUp
        />
        <KPICard
          title="Pending Manual Review"
          value={mockKPIData.pendingReview}
          icon={Clock}
          colorClass="text-blue-600"
        />
        <KPICard
          title="High Review Priority"
          value={mockKPIData.highPriority}
          icon={AlertCircle}
          colorClass="text-red-600"
          trend="Requires attention"
        />
        <KPICard
          title="Verified / Low Concern"
          value={mockKPIData.verified}
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
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40 h-9 text-sm">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      <SelectItem value="csci">Computer Science</SelectItem>
                      <SelectItem value="pols">Political Science</SelectItem>
                      <SelectItem value="biol">Biology</SelectItem>
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
                    <TableHead className="text-slate-600">Submitted</TableHead>
                    <TableHead className="text-slate-600">Priority</TableHead>
                    <TableHead className="text-slate-600">Status</TableHead>
                    <TableHead className="text-slate-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDocuments.map((doc) => (
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
                      <TableCell className="text-right">
                        <Link to={`/analysis/${doc.id}`}>
                          <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900">
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
                    data={mockPriorityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockPriorityDistribution.map((entry, index) => (
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
                  <span className="text-slate-900">127</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Average per Week</span>
                  <span className="text-slate-900">8.4</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
