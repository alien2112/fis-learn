'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Users,
  BookOpen,
  GraduationCap,
  KeyRound,
  Clock,
  UserPlus,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: dashboardApi.getKPIs,
  });

  const {
    data: enrollmentTrend,
    isLoading: trendLoading,
    isError: trendError,
  } = useQuery({
    queryKey: ['enrollment-trend'],
    queryFn: () => dashboardApi.getEnrollmentTrend(6),
  });

  const {
    data: recentActivity,
    isLoading: activityLoading,
    isError: activityError,
  } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => dashboardApi.getRecentActivity(5),
  });

  const hasDashboardError =
    kpisError || trendError || activityError;

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 lg:p-10 max-w-[1600px] mx-auto"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Overview of your e-learning platform
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline">
            Download Report
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" /> Invite User
          </Button>
        </div>
      </div>

      {hasDashboardError ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Dashboard data unavailable
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              One or more data sources failed to load. Check the API service and your session.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Users"
          value={kpis?.users.total}
          icon={Users}
          meta={kpis ? `${kpis.users.newThisWeek} new this week` : undefined}
          loading={kpisLoading}
          error={kpisError}
        />
        <KPICard
          title="Total Courses"
          value={kpis?.courses.total}
          icon={BookOpen}
          meta={kpis ? `${kpis.courses.newThisWeek} new this week` : undefined}
          loading={kpisLoading}
          error={kpisError}
        />
        <KPICard
          title="Active Enrollments"
          value={kpis?.enrollments.active}
          icon={GraduationCap}
          meta={kpis ? `${kpis.enrollments.total} total` : undefined}
          loading={kpisLoading}
          error={kpisError}
        />
        <KPICard
          title="Active Codes"
          value={kpis?.accessCodes.activeCount}
          icon={KeyRound}
          meta="Available access codes"
          loading={kpisLoading}
          error={kpisError}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart */}
        <Card className="md:col-span-4 shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>
              Student enrollment over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            {trendLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : trendError ? (
              <div className="h-[350px] flex items-center justify-center text-destructive">Failed to load data</div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enrollments"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Secondary Cards Column */}
        <div className="md:col-span-3 space-y-6">
          {/* Recent Activity */}
          <Card className="h-full shadow-sm border-muted/60 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest actions across the platform</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
              {activityLoading ? (
                <div className="space-y-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityError ? (
                <p className="text-sm text-destructive">Failed to load recent activity.</p>
              ) : (
                <div className="space-y-6">
                  {recentActivity?.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                  {(!recentActivity || recentActivity.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t bg-muted/20">
              <Button variant="ghost" className="w-full text-xs hover:bg-transparent hover:text-primary transition-colors justify-between group">
                View all activity <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Pending Approvals Card */}
        {kpis?.courses.pendingApproval ? (
          <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-700 dark:text-yellow-500">
                Action Required
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                  {kpis.courses.pendingApproval}
                </span>
                <span className="text-sm text-muted-foreground">courses pending</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Instructors are waiting for your review.
              </p>
              <Button size="sm" variant="outline" className="w-full border-yellow-200 hover:bg-yellow-100 hover:text-yellow-900 dark:border-yellow-900 dark:hover:bg-yellow-900/50">
                Review Courses
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Quick Stats: Active Users */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {kpis?.users.activeThisMonth?.toLocaleString() ?? 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Users active in the last 30 days
            </p>
          </CardContent>
        </Card>

        {/* Access Codes */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Codes</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {kpis?.accessCodes.activeCount ?? 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Active codes available for distribution
            </p>
            <Button size="sm" className="w-full">
              Generate New Codes
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  icon: Icon,
  meta,
  loading,
  error,
}: {
  title: string;
  value?: number | string;
  icon: React.ElementType;
  meta?: string;
  loading: boolean;
  error?: boolean;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-muted/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : error ? (
          <>
            <div className="text-2xl font-bold text-destructive">N/A</div>
            <p className="text-xs text-muted-foreground">Unavailable</p>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : (value || 'N/A')}
            </div>
            {meta ? <p className="text-xs mt-2 text-muted-foreground">{meta}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: { type: string; timestamp: string; data: Record<string, unknown> } }) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'user_registered':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'enrollment_created':
        return <GraduationCap className="h-4 w-4 text-green-500" />;
      case 'course_submitted':
        return <FileCheck className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityMessage = () => {
    switch (activity.type) {
      case 'user_registered':
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium hover:text-primary cursor-pointer transition-colors">
              {activity.data.userName as string}
            </span>
            <span className="text-xs text-muted-foreground">
              registered as {(activity.data.role as string)?.toLowerCase().replace('_', ' ')}
            </span>
          </div>
        );
      case 'enrollment_created':
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {activity.data.userName as string}
            </span>
            <span className="text-xs text-muted-foreground">
              enrolled in <span className="font-medium text-foreground">{activity.data.courseTitle as string}</span>
            </span>
          </div>
        );
      case 'course_submitted':
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {activity.data.instructorName as string}
            </span>
            <span className="text-xs text-muted-foreground">
              submitted <span className="font-medium text-foreground">{activity.data.courseTitle as string}</span>
            </span>
          </div>
        );
      default:
        return <span className="text-sm">Unknown activity</span>;
    }
  };

  return (
    <div className="flex items-start space-x-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border shrink-0">
        {getActivityIcon()}
      </div>
      <div className="flex-1 space-y-1">
        {getActivityMessage()}
      </div>
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
      </div>
    </div>
  );
}
