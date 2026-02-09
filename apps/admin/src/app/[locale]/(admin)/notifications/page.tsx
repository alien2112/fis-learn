'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationsApi,
  SendBulkNotificationDto,
  BulkNotification,
  NotificationType,
  RecipientGroup,
} from '@/lib/api/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
  Bell,
  Plus,
  Send,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FormData extends SendBulkNotificationDto {
  isScheduled: boolean;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    message: '',
    type: 'INFO',
    recipientGroup: 'ALL_USERS',
    recipientIds: undefined,
    scheduledFor: undefined,
    isScheduled: false,
  });
  const [recipientIdsText, setRecipientIdsText] = useState('');

  // Fetch bulk history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['bulk-notifications', currentPage],
    queryFn: () => notificationsApi.getBulkHistory(currentPage, 20),
  });

  // Calculate stats from history
  const stats = useMemo(() => {
    if (!historyData?.data) {
      return {
        totalSentToday: 0,
        totalRecipientsToday: 0,
        deliveryRate: 0,
        pending: 0,
      };
    }
    return notificationsApi.calculateStats(historyData.data);
  }, [historyData]);

  // Send bulk mutation
  const sendBulkMutation = useMutation({
    mutationFn: notificationsApi.sendBulk,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bulk-notifications'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: data.message || `Notification queued for ${data.recipientCount} recipients`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send notification',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      subject: '',
      message: '',
      type: 'INFO',
      recipientGroup: 'ALL_USERS',
      recipientIds: undefined,
      scheduledFor: undefined,
      isScheduled: false,
    });
    setRecipientIdsText('');
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate subject length
    if (formData.subject.length > 200) {
      toast({
        title: 'Validation Error',
        description: 'Subject must be 200 characters or less',
        variant: 'destructive',
      });
      return;
    }

    // Validate message length
    if (formData.message.length > 5000) {
      toast({
        title: 'Validation Error',
        description: 'Message must be 5000 characters or less',
        variant: 'destructive',
      });
      return;
    }

    // Parse recipient IDs if custom
    let recipientIds: string[] | undefined = undefined;
    if (formData.recipientGroup === 'CUSTOM') {
      recipientIds = recipientIdsText
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);

      if (recipientIds.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please provide at least one recipient ID for custom recipients',
          variant: 'destructive',
        });
        return;
      }
    }

    const payload: SendBulkNotificationDto = {
      subject: formData.subject,
      message: formData.message,
      type: formData.type,
      recipientGroup: formData.recipientGroup,
      recipientIds,
      scheduledFor: formData.isScheduled ? formData.scheduledFor : undefined,
    };

    sendBulkMutation.mutate(payload);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PROCESSING':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'FAILED':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'success';
      case 'ERROR':
        return 'destructive';
      case 'WARNING':
        return 'secondary';
      case 'INFO':
      default:
        return 'default';
    }
  };

  const getRecipientGroupLabel = (group: RecipientGroup) => {
    switch (group) {
      case 'ALL_USERS':
        return 'All Users';
      case 'ALL_STUDENTS':
        return 'All Students';
      case 'ALL_INSTRUCTORS':
        return 'All Instructors';
      case 'ALL_ADMINS':
        return 'All Admins';
      case 'CUSTOM':
        return 'Custom';
      default:
        return group;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Management</h1>
          <p className="text-muted-foreground">Send and manage bulk notifications</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Send Bulk Notification
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent (Today)</p>
                <p className="text-2xl font-bold">{stats.totalSentToday}</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Recipients (Today)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalRecipientsToday}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.deliveryRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !historyData?.data || historyData.data.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No notifications sent yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by sending your first bulk notification
              </p>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Send Notification
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient Group</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.data.map((notification) => {
                    const deliveryPercentage =
                      notification.recipientCount > 0
                        ? (notification.deliveredCount / notification.recipientCount) * 100
                        : 0;

                    return (
                      <TableRow key={notification.id}>
                        <TableCell className="text-sm">
                          {formatDate(notification.sentAt)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{notification.subject}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {notification.message}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(notification.type)}>
                            {notification.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getRecipientGroupLabel(notification.recipientGroup)}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {notification.recipientCount}
                        </TableCell>
                        <TableCell>
                          {notification.status === 'PROCESSING' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">
                                  {notification.deliveredCount} / {notification.recipientCount}
                                </span>
                                <span className="text-muted-foreground">
                                  ({deliveryPercentage.toFixed(0)}%)
                                </span>
                              </div>
                              <Progress value={deliveryPercentage} className="h-1.5" />
                            </div>
                          ) : (
                            <div className="text-sm font-medium">
                              {notification.deliveredCount} / {notification.recipientCount}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(notification.status)}>
                            {notification.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{notification.sentBy.name}</p>
                            <p className="text-muted-foreground">{notification.sentBy.email}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {historyData.meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {historyData.meta.page} of {historyData.meta.totalPages} ({historyData.meta.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === historyData.meta.totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(historyData.meta.totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Send Bulk Notification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Bulk Notification</DialogTitle>
            <DialogDescription>
              Create and send a notification to multiple users
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6 py-4">
              {/* Left Column - Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="subject"
                    placeholder="Enter notification subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.subject.length} / 200 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    Message <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Enter notification message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    maxLength={5000}
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.message.length} / 5000 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Notification Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: NotificationType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Select
                    value={formData.recipientGroup}
                    onValueChange={(value: RecipientGroup) =>
                      setFormData({ ...formData, recipientGroup: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_USERS">All Users</SelectItem>
                      <SelectItem value="ALL_STUDENTS">All Students</SelectItem>
                      <SelectItem value="ALL_INSTRUCTORS">All Instructors</SelectItem>
                      <SelectItem value="ALL_ADMINS">All Admins</SelectItem>
                      <SelectItem value="CUSTOM">Custom (Specify IDs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recipientGroup === 'CUSTOM' && (
                  <div className="space-y-2">
                    <Label htmlFor="recipientIds">
                      Recipient User IDs <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="recipientIds"
                      placeholder="Enter user IDs separated by commas (e.g., user-1, user-2, user-3)"
                      value={recipientIdsText}
                      onChange={(e) => setRecipientIdsText(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter comma-separated user IDs
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isScheduled"
                      checked={formData.isScheduled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isScheduled: checked })
                      }
                    />
                    <Label htmlFor="isScheduled">Schedule for later</Label>
                  </div>

                  {formData.isScheduled && (
                    <div className="space-y-2">
                      <Label htmlFor="scheduledFor">Schedule Date & Time</Label>
                      <Input
                        id="scheduledFor"
                        type="datetime-local"
                        value={formData.scheduledFor || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, scheduledFor: e.target.value })
                        }
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        formData.type === 'SUCCESS' ? 'bg-green-100' :
                        formData.type === 'ERROR' ? 'bg-red-100' :
                        formData.type === 'WARNING' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      }`}>
                        {formData.type === 'SUCCESS' ? (
                          <CheckCircle2 className={`h-5 w-5 ${
                            formData.type === 'SUCCESS' ? 'text-green-600' :
                            formData.type === 'ERROR' ? 'text-red-600' :
                            formData.type === 'WARNING' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                        ) : formData.type === 'ERROR' ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : formData.type === 'WARNING' ? (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <Bell className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base break-words">
                          {formData.subject || 'Notification Subject'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Just now
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {formData.message || 'Your notification message will appear here...'}
                    </p>
                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        To: {getRecipientGroupLabel(formData.recipientGroup)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formData.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs font-medium mb-2">Notification Details:</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Type: {formData.type}</li>
                    <li>• Recipients: {getRecipientGroupLabel(formData.recipientGroup)}</li>
                    {formData.isScheduled && formData.scheduledFor && (
                      <li>• Scheduled: {formatDate(formData.scheduledFor)}</li>
                    )}
                    {!formData.isScheduled && <li>• Send: Immediately</li>}
                  </ul>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sendBulkMutation.isPending}>
                {sendBulkMutation.isPending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {formData.isScheduled ? 'Schedule Notification' : 'Send Notification'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
