'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { streamingApi, CreateStreamDto, Stream, StreamStatus } from '@/lib/api/streaming';
import { coursesApi } from '@/lib/api/courses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Video,
  Plus,
  MoreHorizontal,
  Users,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Play,
  StopCircle,
  Eye,
  XCircle,
  Radio,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FormData extends CreateStreamDto {
  id?: string;
}

export default function StreamingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [formData, setFormData] = useState<FormData>({
    courseId: '',
    title: '',
    description: '',
    scheduledStart: '',
    scheduledEnd: '',
    maxParticipants: undefined,
  });

  // Fetch streams
  const { data: streams, isLoading } = useQuery({
    queryKey: ['streams'],
    queryFn: streamingApi.getAllStreams,
    refetchInterval: (data) => {
      // Auto-refresh every 10 seconds if there are LIVE streams
      const hasLiveStreams = data?.some(s => s.status === 'LIVE');
      return hasLiveStreams ? 10000 : false;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['streaming-stats'],
    queryFn: streamingApi.getStats,
    refetchInterval: (data) => {
      // Auto-refresh stats every 10 seconds if there are live streams
      return data && data.liveNow > 0 ? 10000 : false;
    },
  });

  // Fetch courses for dropdown
  const { data: coursesData } = useQuery({
    queryKey: ['courses-for-streaming'],
    queryFn: () => coursesApi.getAll({ limit: 1000 }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: streamingApi.createStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['streaming-stats'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Stream created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create stream',
        variant: 'destructive'
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      streamingApi.updateStream(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['streaming-stats'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Stream updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update stream',
        variant: 'destructive'
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: streamingApi.deleteStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['streaming-stats'] });
      setIsDeleteDialogOpen(false);
      setSelectedStream(null);
      toast({ title: 'Success', description: 'Stream deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete stream',
        variant: 'destructive'
      });
    },
  });

  // Start stream mutation
  const startStreamMutation = useMutation({
    mutationFn: streamingApi.startStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['streaming-stats'] });
      toast({ title: 'Success', description: 'Stream started successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start stream',
        variant: 'destructive'
      });
    },
  });

  // End stream mutation
  const endStreamMutation = useMutation({
    mutationFn: streamingApi.endStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['streaming-stats'] });
      toast({ title: 'Success', description: 'Stream ended successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to end stream',
        variant: 'destructive'
      });
    },
  });

  // Cancel stream mutation
  const cancelStreamMutation = useMutation({
    mutationFn: streamingApi.cancelStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['streaming-stats'] });
      toast({ title: 'Success', description: 'Stream cancelled successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel stream',
        variant: 'destructive'
      });
    },
  });

  const resetForm = () => {
    setFormData({
      courseId: '',
      title: '',
      description: '',
      scheduledStart: '',
      scheduledEnd: '',
      maxParticipants: undefined,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (stream: Stream) => {
    setSelectedStream(stream);
    setFormData({
      id: stream.id,
      courseId: stream.courseId,
      title: stream.title,
      description: '',
      scheduledStart: stream.scheduledAt ? new Date(stream.scheduledAt).toISOString().slice(0, 16) : '',
      scheduledEnd: '',
      maxParticipants: undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDelete = (stream: Stream) => {
    setSelectedStream(stream);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;

    updateMutation.mutate({
      id: formData.id,
      data: formData,
    });
  };

  const handleDelete = () => {
    if (!selectedStream) return;
    deleteMutation.mutate(selectedStream.id);
  };

  const handleStartStream = (stream: Stream) => {
    startStreamMutation.mutate(stream.id);
  };

  const handleEndStream = (stream: Stream) => {
    endStreamMutation.mutate(stream.id);
  };

  const handleCancelStream = (stream: Stream) => {
    cancelStreamMutation.mutate(stream.id);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getDurationOrStatus = (stream: Stream) => {
    if (stream.status === 'LIVE') {
      return <span className="text-red-600 font-bold flex items-center gap-1"><Radio className="h-4 w-4" /> LIVE NOW</span>;
    }
    if (stream.status === 'ENDED') {
      if (stream.startedAt && stream.endedAt) {
        const duration = Math.floor((new Date(stream.endedAt).getTime() - new Date(stream.startedAt).getTime()) / 60000);
        return `${duration} min`;
      }
      return 'Ended';
    }
    if (stream.scheduledAt && stream.endedAt) {
      const duration = Math.floor((new Date(stream.endedAt).getTime() - new Date(stream.scheduledAt).getTime()) / 60000);
      return `${duration} min (scheduled)`;
    }
    return stream.status;
  };

  const getViewersDisplay = (stream: Stream) => {
    if (stream.status === 'LIVE') {
      return `${stream._count?.viewers || 0}`;
    }
    if (stream.status === 'ENDED') {
      return `${stream._count?.viewers || 0} total`;
    }
    return '-';
  };

  const getStatusBadgeVariant = (status: StreamStatus): any => {
    switch (status) {
      case 'SCHEDULED':
        return 'default';
      case 'LIVE':
        return 'destructive';
      case 'ENDED':
        return 'secondary';
      case 'CANCELLED':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Filter streams
  const filteredStreams = streams?.filter(stream => {
    if (statusFilter !== 'ALL' && stream.status !== statusFilter) return false;
    if (courseFilter !== 'ALL' && stream.courseId !== courseFilter) return false;
    return true;
  }) || [];

  // Get unique courses from streams for filter
  const coursesInStreams = Array.from(new Set(streams?.map(s => s.courseId) || []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Streaming Management</h1>
          <p className="text-muted-foreground">Manage live streams and recordings</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Stream
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Streams</p>
                <p className="text-2xl font-bold">{stats?.totalStreams || 0}</p>
              </div>
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Now</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.liveNow || 0}
                </p>
              </div>
              <Radio className="h-8 w-8 text-red-600 animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.scheduled || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Viewers (Today)</p>
                <p className="text-2xl font-bold">{stats?.totalViewersToday || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="w-48">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="LIVE">Live</SelectItem>
                  <SelectItem value="ENDED">Ended</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Label>Course</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Courses</SelectItem>
                  {coursesInStreams.map(courseId => {
                    const stream = streams?.find(s => s.courseId === courseId);
                    return (
                      <SelectItem key={courseId} value={courseId}>
                        {stream?.course?.title || courseId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streams Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Streams</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filteredStreams || filteredStreams.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No streams yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first live stream
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Stream
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Scheduled Start</TableHead>
                  <TableHead>Duration/Status</TableHead>
                  <TableHead>Viewers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStreams.map((stream) => (
                  <TableRow key={stream.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {stream.status === 'LIVE' && (
                          <Radio className="h-4 w-4 text-red-600 animate-pulse" />
                        )}
                        <span className="font-medium">{stream.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {stream.course?.title || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatDateTime(stream.scheduledAt)}
                    </TableCell>
                    <TableCell>
                      {getDurationOrStatus(stream)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {getViewersDisplay(stream)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(stream.status)}>
                        {stream.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(stream)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {stream.status === 'SCHEDULED' && (
                            <DropdownMenuItem onClick={() => handleStartStream(stream)}>
                              <Play className="mr-2 h-4 w-4" />
                              Start Stream
                            </DropdownMenuItem>
                          )}
                          {stream.status === 'LIVE' && (
                            <DropdownMenuItem onClick={() => handleEndStream(stream)}>
                              <StopCircle className="mr-2 h-4 w-4" />
                              End Stream
                            </DropdownMenuItem>
                          )}
                          {stream.status === 'ENDED' && stream.streamId && (
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Recording
                            </DropdownMenuItem>
                          )}
                          {stream.status === 'SCHEDULED' && (
                            <DropdownMenuItem onClick={() => handleCancelStream(stream)}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleOpenDelete(stream)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Stream Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Live Stream</DialogTitle>
            <DialogDescription>
              Schedule a new live stream session for a course
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Week 1: Introduction to React"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Stream description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, courseId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesData?.data.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledStart">Scheduled Start</Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    value={formData.scheduledStart}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledEnd">Scheduled End</Label>
                  <Input
                    id="scheduledEnd"
                    type="datetime-local"
                    value={formData.scheduledEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledEnd: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxParticipants || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipants: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Stream'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Stream Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Stream</DialogTitle>
            <DialogDescription>Update stream details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g., Week 1: Introduction to React"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Stream description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-course">Course *</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, courseId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesData?.data.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-scheduledStart">Scheduled Start</Label>
                  <Input
                    id="edit-scheduledStart"
                    type="datetime-local"
                    value={formData.scheduledStart}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledStart: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-scheduledEnd">Scheduled End</Label>
                  <Input
                    id="edit-scheduledEnd"
                    type="datetime-local"
                    value={formData.scheduledEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledEnd: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxParticipants">Max Participants</Label>
                <Input
                  id="edit-maxParticipants"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxParticipants || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipants: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Stream'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stream</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedStream?.title}"? This action cannot
              be undone.
              {selectedStream?.status === 'LIVE' && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This stream is currently LIVE!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
