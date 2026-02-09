'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accessCodesApi, CodeQueryParams } from '@/lib/api/access-codes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Plus, Download, KeyRound, Copy } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function AccessCodesPage() {
  const [query, setQuery] = useState<CodeQueryParams>({
    page: 1,
    limit: 10,
    search: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['access-codes', query],
    queryFn: () => accessCodesApi.getAll(query),
  });

  const { data: stats } = useQuery({
    queryKey: ['access-codes-stats'],
    queryFn: accessCodesApi.getStats,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'EXPIRED': return 'secondary';
      case 'REVOKED': return 'destructive';
      default: return 'outline';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Codes</h1>
          <p className="text-muted-foreground">Generate and manage access codes</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate Codes
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Codes</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <KeyRound className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.byStatus?.ACTIVE || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {stats?.byStatus?.EXPIRED || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Redemptions (30d)</p>
              <p className="text-2xl font-bold">{stats?.redemptionsLast30Days || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Access Codes</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search codes..."
                className="pl-8 w-64"
                value={query.search}
                onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(code.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{code.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {code.course?.title || code.material?.title || '-'}
                      </TableCell>
                      <TableCell>
                        {code.currentRedemptions} / {code.maxRedemptions}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(code.status)}>
                          {code.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {code.expiresAt
                          ? format(new Date(code.expiresAt), 'PP')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(code.code)}>
                              Copy Code
                            </DropdownMenuItem>
                            {code.status === 'ACTIVE' && (
                              <DropdownMenuItem className="text-destructive">
                                Revoke Code
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {data?.data.length} of {data?.meta.total} codes
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={query.page === 1}
                    onClick={() => setQuery({ ...query, page: query.page! - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={query.page === data?.meta.totalPages}
                    onClick={() => setQuery({ ...query, page: query.page! + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
