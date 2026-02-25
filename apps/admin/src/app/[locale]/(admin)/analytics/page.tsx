'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Award,
  BookOpen,
  GraduationCap,
  Download,
  Calendar,
} from 'lucide-react';


type DateRange = '7' | '30' | '90' | 'custom';

interface KPIResponse {
  users: {
    total: number;
    byRole: Record<string, number>;
    activeThisMonth: number;
    newThisWeek: number;
  };
  courses: {
    total: number;
    byStatus: Record<string, number>;
    pendingApproval: number;
    newThisWeek: number;
  };
  enrollments: {
    total: number;
    active: number;
  };
  accessCodes: {
    activeCount: number;
  };
}

interface EnrollmentTrendItem {
  month: string;
  enrollments: number;
}

interface UserGrowthItem {
  month: string;
  users: number;
}

interface CourseStatsResponse {
  byLevel: { level: string; count: number }[];
  byCategory: { category: string; count: number }[];
  averageCompletionRate: number;
  topEnrolled: { id: string; title: string; slug: string; enrollments: number }[];
}

interface InstructorStat {
  id: string;
  name: string;
  avatarUrl: string | null;
  courses: number;
  students: number;
  rating: number;
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const months = dateRange === '7' ? 1 : dateRange === '30' ? 1 : dateRange === '90' ? 3 : 6;

  // Fetch KPIs
  const { data: kpiData, isLoading: kpiLoading } = useQuery<KPIResponse>({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/kpis');
      return response.data.data;
    },
  });

  // Fetch enrollment trend
  const { data: enrollmentTrend, isLoading: enrollmentLoading } = useQuery<EnrollmentTrendItem[]>({
    queryKey: ['enrollment-trend', months],
    queryFn: async () => {
      const response = await apiClient.get(`/dashboard/enrollment-trend?months=${months}`);
      return response.data.data;
    },
  });

  // Fetch user growth
  const { data: userGrowth, isLoading: userGrowthLoading } = useQuery<UserGrowthItem[]>({
    queryKey: ['user-growth', months],
    queryFn: async () => {
      const response = await apiClient.get(`/dashboard/user-growth?months=${months}`);
      return response.data.data;
    },
  });

  // Fetch course stats
  const { data: courseStats, isLoading: courseStatsLoading } = useQuery<CourseStatsResponse>({
    queryKey: ['course-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/course-stats');
      return response.data.data;
    },
  });

  // Fetch top instructors
  const { data: topInstructors, isLoading: instructorsLoading } = useQuery<InstructorStat[]>({
    queryKey: ['top-instructors'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/top-instructors?limit=5');
      return response.data.data;
    },
  });

  const handleExport = () => {
    // Build CSV from available data
    const rows: string[] = ['Metric,Value'];
    if (kpiData) {
      rows.push(`Total Users,${kpiData.users.total}`);
      rows.push(`Active Users (Month),${kpiData.users.activeThisMonth}`);
      rows.push(`Total Courses,${kpiData.courses.total}`);
      rows.push(`Active Enrollments,${kpiData.enrollments.active}`);
      rows.push(`Total Enrollments,${kpiData.enrollments.total}`);
    }
    if (courseStats) {
      rows.push(`Average Completion Rate,${courseStats.averageCompletionRate.toFixed(1)}%`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground">Track performance metrics and insights</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Label className="text-base font-medium">Date Range</Label>
            </div>
            <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <TabsList>
                <TabsTrigger value="7">7 Days</TabsTrigger>
                <TabsTrigger value="30">30 Days</TabsTrigger>
                <TabsTrigger value="90">90 Days</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            {kpiLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">
                  {(kpiData?.users.activeThisMonth ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kpiData?.users.newThisWeek ?? 0} new this week
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {kpiLoading || courseStatsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold">
                  {(courseStats?.averageCompletionRate ?? 0).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg across active enrollments
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {kpiLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">
                  {(kpiData?.courses.total ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kpiData?.courses.newThisWeek ?? 0} new this week
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {kpiLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Active Enrollments</p>
                  <GraduationCap className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold">
                  {(kpiData?.enrollments.active ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(kpiData?.enrollments.total ?? 0).toLocaleString()} total
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowthLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="New Users"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Course Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Courses by Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            {courseStatsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseStats?.topEnrolled || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="enrollments"
                    fill="#6366f1"
                    name="Enrollments"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Enrollment Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={enrollmentTrend || []}>
                  <defs>
                    <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorEnrollments)"
                    name="Enrollments"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Courses by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Courses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {courseStatsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseStats?.byCategory || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Courses"
                    fill="#8b5cf6"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {courseStatsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Name</TableHead>
                    <TableHead className="text-right">Enrollments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(courseStats?.topEnrolled || []).map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell className="text-right">
                        {course.enrollments.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!courseStats?.topEnrolled || courseStats.topEnrolled.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No course data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Instructors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            {instructorsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead>
                    <TableHead className="text-right">Courses</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topInstructors || []).map((instructor) => (
                    <TableRow key={instructor.id}>
                      <TableCell className="font-medium">{instructor.name}</TableCell>
                      <TableCell className="text-right">{instructor.courses}</TableCell>
                      <TableCell className="text-right">
                        {instructor.students.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {instructor.rating > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-yellow-500">&#9733;</span>
                            <span>{instructor.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!topInstructors || topInstructors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No instructor data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
