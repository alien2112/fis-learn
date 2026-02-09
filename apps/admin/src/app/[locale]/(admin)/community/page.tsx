'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi, CommunityReport, CommunityMessage } from '@/lib/api/community';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Pin,
  Lock,
  AlertTriangle,
  EyeOff,
  XCircle,
  Unlock,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CommunityModerationPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('reports');
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<'hide' | null>(null);

  // Fetch reported messages
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['community-reports'],
    queryFn: communityApi.getReportedMessages,
  });

  // Fetch pinned messages
  const { data: pinnedMessages, isLoading: pinnedLoading } = useQuery({
    queryKey: ['community-pinned'],
    queryFn: communityApi.getPinnedMessages,
  });

  // Fetch locked threads
  const { data: lockedThreads, isLoading: lockedLoading } = useQuery({
    queryKey: ['community-locked'],
    queryFn: communityApi.getLockedThreads,
  });

  // Hide message mutation
  const hideMutation = useMutation({
    mutationFn: communityApi.hideMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-reports'] });
      queryClient.invalidateQueries({ queryKey: ['community-pinned'] });
      queryClient.invalidateQueries({ queryKey: ['community-locked'] });
      setHideDialogOpen(false);
      setSelectedMessageId(null);
      toast({ title: 'Success', description: 'Message hidden successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to hide message',
        variant: 'destructive',
      });
    },
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: communityApi.resolveReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-reports'] });
      toast({ title: 'Success', description: 'Report marked as resolved' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resolve report',
        variant: 'destructive',
      });
    },
  });

  // Unpin message mutation
  const unpinMutation = useMutation({
    mutationFn: (messageId: string) => communityApi.pinMessage(messageId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-pinned'] });
      toast({ title: 'Success', description: 'Message unpinned successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to unpin message',
        variant: 'destructive',
      });
    },
  });

  // Unlock thread mutation
  const unlockMutation = useMutation({
    mutationFn: (messageId: string) => communityApi.lockThread(messageId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-locked'] });
      toast({ title: 'Success', description: 'Thread unlocked successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to unlock thread',
        variant: 'destructive',
      });
    },
  });

  const handleOpenHideDialog = (messageId: string) => {
    setSelectedMessageId(messageId);
    setSelectedAction('hide');
    setHideDialogOpen(true);
  };

  const handleConfirmHide = () => {
    if (selectedMessageId) {
      hideMutation.mutate(selectedMessageId);
    }
  };

  const handleIgnoreReport = (reportId: string) => {
    resolveReportMutation.mutate(reportId);
  };

  const handleUnpin = (messageId: string) => {
    unpinMutation.mutate(messageId);
  };

  const handleUnlock = (messageId: string) => {
    unlockMutation.mutate(messageId);
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community Moderation</h1>
          <p className="text-muted-foreground">
            Manage reported content, pinned messages, and locked threads
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold text-red-600">
                  {reports?.length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pinned Messages</p>
                <p className="text-2xl font-bold">{pinnedMessages?.length || 0}</p>
              </div>
              <Pin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Locked Threads</p>
                <p className="text-2xl font-bold">{lockedThreads?.length || 0}</p>
              </div>
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Reported Content
          </TabsTrigger>
          <TabsTrigger value="pinned">
            <Pin className="mr-2 h-4 w-4" />
            Pinned Messages
          </TabsTrigger>
          <TabsTrigger value="locked">
            <Lock className="mr-2 h-4 w-4" />
            Locked Threads
          </TabsTrigger>
        </TabsList>

        {/* Reported Content Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reported Content</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !reports || reports.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No pending reports</p>
                  <p className="text-sm text-muted-foreground">
                    All community content is currently clean
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message Preview</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reported Date</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm line-clamp-2">
                              {truncateContent(report.message.content)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {report.message.author.avatarUrl ? (
                                <img
                                  src={report.message.author.avatarUrl}
                                  alt={report.message.author.name}
                                />
                              ) : (
                                <div className="bg-primary/10 flex items-center justify-center h-full">
                                  {report.message.author.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {report.message.author.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {report.message.author.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.message.channel.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{report.reporter.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {report.reporter.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{report.reason}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(report.reportedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenHideDialog(report.messageId)}
                              disabled={hideMutation.isPending}
                            >
                              <EyeOff className="mr-1 h-3 w-3" />
                              Hide
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleIgnoreReport(report.id)}
                              disabled={resolveReportMutation.isPending}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Ignore
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pinned Messages Tab */}
        <TabsContent value="pinned">
          <Card>
            <CardHeader>
              <CardTitle>Pinned Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {pinnedLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !pinnedMessages || pinnedMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Pin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No pinned messages</p>
                  <p className="text-sm text-muted-foreground">
                    Pin important messages to highlight them in channels
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message Preview</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Pinned Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pinnedMessages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm line-clamp-2">
                              {truncateContent(message.content)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{message.channel.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {message.author.avatarUrl ? (
                                <img
                                  src={message.author.avatarUrl}
                                  alt={message.author.name}
                                />
                              ) : (
                                <div className="bg-primary/10 flex items-center justify-center h-full">
                                  {message.author.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </Avatar>
                            <p className="text-sm font-medium">{message.author.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(message.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnpin(message.id)}
                            disabled={unpinMutation.isPending}
                          >
                            <Pin className="mr-1 h-3 w-3" />
                            Unpin
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locked Threads Tab */}
        <TabsContent value="locked">
          <Card>
            <CardHeader>
              <CardTitle>Locked Threads</CardTitle>
            </CardHeader>
            <CardContent>
              {lockedLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !lockedThreads || lockedThreads.length === 0 ? (
                <div className="text-center py-12">
                  <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No locked threads</p>
                  <p className="text-sm text-muted-foreground">
                    Lock threads to prevent further replies
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message Preview</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Locked Date</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockedThreads.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm line-clamp-2">
                              {truncateContent(message.content)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{message.channel.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {message.author.avatarUrl ? (
                                <img
                                  src={message.author.avatarUrl}
                                  alt={message.author.name}
                                />
                              ) : (
                                <div className="bg-primary/10 flex items-center justify-center h-full">
                                  {message.author.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </Avatar>
                            <p className="text-sm font-medium">{message.author.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(message.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnlock(message.id)}
                            disabled={unlockMutation.isPending}
                          >
                            <Unlock className="mr-1 h-3 w-3" />
                            Unlock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hide Confirmation Dialog */}
      <AlertDialog open={hideDialogOpen} onOpenChange={setHideDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to hide this message? This action will remove it from
              public view but can be restored later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHideDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmHide}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {hideMutation.isPending ? 'Hiding...' : 'Hide Message'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
