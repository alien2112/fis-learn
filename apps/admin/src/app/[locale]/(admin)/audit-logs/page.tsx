'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi, AuditLog, AuditLogsFilters } from '@/lib/api/audit-logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

// Common action types
const COMMON_ACTIONS = [
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_REGISTER',
  'USER_UPDATE',
  'USER_DELETE',
  'COURSE_CREATE',
  'COURSE_UPDATE',
  'COURSE_DELETE',
  'COURSE_APPROVE',
  'COURSE_REJECT',
  'COURSE_PUBLISH',
  'SUBSCRIPTION_CREATE',
  'SUBSCRIPTION_UPDATE',
  'SUBSCRIPTION_CANCEL',
  'ENROLLMENT_CREATE',
  'ENROLLMENT_DELETE',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
];

// Common entity types
const ENTITY_TYPES = [
  'USER',
  'COURSE',
  'SUBSCRIPTION',
  'ENROLLMENT',
  'PAYMENT',
  'CATEGORY',
  'ACCESS_CODE',
  'LIVE_EVENT',
  'COMMUNITY_MESSAGE',
];

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogsFilters>({
    page: 1,
    limit: 20,
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch audit logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditLogsApi.getAuditLogs(filters),
  });

  const handleFilterChange = (key: keyof AuditLogsFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const toggleExpandRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const handleExportToCSV = () => {
    if (!data?.data || data.data.length === 0) return;

    const headers = ['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = data.data.map((log) => [
      format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      log.userId || 'System',
      log.action,
      log.entityType,
      log.entityId || 'N/A',
      log.ipAddress || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'default';
    if (action.includes('UPDATE') || action.includes('APPROVE')) return 'secondary';
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('CANCEL'))
      return 'destructive';
    if (action.includes('LOGIN')) return 'outline';
    return 'default';
  };

  const getEntityTypeBadgeVariant = (entityType: string) => {
    switch (entityType) {
      case 'USER':
        return 'default';
      case 'COURSE':
        return 'secondary';
      case 'SUBSCRIPTION':
      case 'PAYMENT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const truncateText = (text: string, maxLength: number = 20) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const hasActiveFilters = () => {
    return (
      filters.userId ||
      filters.entityType ||
      filters.entityId ||
      filters.action ||
      filters.startDate ||
      filters.endDate
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            View and filter system activity and user actions
          </p>
        </div>
        <Button onClick={handleExportToCSV} disabled={!data?.data || data.data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Action Filter */}
            <div className="space-y-2">
              <Label htmlFor="action-filter">Action</Label>
              <Select
                value={filters.action || ''}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger id="action-filter">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  {COMMON_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="entity-type-filter">Entity Type</Label>
              <Select
                value={filters.entityType || ''}
                onValueChange={(value) => handleFilterChange('entityType', value)}
              >
                <SelectTrigger id="entity-type-filter">
                  <SelectValue placeholder="Select entity type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User ID Filter */}
            <div className="space-y-2">
              <Label htmlFor="user-id-filter">User ID</Label>
              <Input
                id="user-id-filter"
                placeholder="Enter user ID..."
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />
            </div>

            {/* Entity ID Filter */}
            <div className="space-y-2">
              <Label htmlFor="entity-id-filter">Entity ID</Label>
              <Input
                id="entity-id-filter"
                placeholder="Enter entity ID..."
                value={filters.entityId || ''}
                onChange={(e) => handleFilterChange('entityId', e.target.value)}
              />
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="start-date-filter">Start Date</Label>
              <Input
                id="start-date-filter"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            {/* End Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="end-date-filter">End Date</Label>
              <Input
                id="end-date-filter"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-2 mt-4">
            <Button onClick={() => refetch()} disabled={isLoading}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            {hasActiveFilters() && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Audit Logs
            {data?.meta && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({data.meta.total} total records)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters()
                  ? 'Try adjusting your filters'
                  : 'Audit logs will appear here as actions are performed'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="w-12">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((log) => (
                      <>
                        <TableRow key={log.id}>
                          <TableCell className="font-medium text-sm">
                            {formatTimestamp(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            {log.userId ? (
                              <span className="text-sm font-mono">{log.userId}</span>
                            ) : (
                              <Badge variant="outline">System</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getEntityTypeBadgeVariant(log.entityType)}>
                              {log.entityType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.entityId ? (
                              <span
                                className="text-sm font-mono"
                                title={log.entityId}
                              >
                                {truncateText(log.entityId, 16)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {log.ipAddress || (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandRow(log.id)}
                            >
                              {expandedRow === log.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRow === log.id && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/50">
                              <div className="p-4 space-y-4">
                                {/* User Agent */}
                                {log.userAgent && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">User Agent</h4>
                                    <p className="text-sm text-muted-foreground font-mono">
                                      {log.userAgent}
                                    </p>
                                  </div>
                                )}

                                {/* Old Values */}
                                {log.oldValues && Object.keys(log.oldValues).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">
                                      Old Values (Before)
                                    </h4>
                                    <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                                      {JSON.stringify(log.oldValues, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {/* New Values */}
                                {log.newValues && Object.keys(log.newValues).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">
                                      New Values (After)
                                    </h4>
                                    <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                                      {JSON.stringify(log.newValues, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {!log.userAgent &&
                                  (!log.oldValues || Object.keys(log.oldValues).length === 0) &&
                                  (!log.newValues || Object.keys(log.newValues).length === 0) && (
                                    <p className="text-sm text-muted-foreground">
                                      No additional details available
                                    </p>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.meta && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total
                    records)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.meta.page - 1)}
                      disabled={data.meta.page === 1 || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.meta.page + 1)}
                      disabled={data.meta.page === data.meta.totalPages || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
