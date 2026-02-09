'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserQueryParams } from '@/lib/api/users';
import { User, PaginatedResponse } from '@/types';
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Search, MoreHorizontal, UserPlus, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type UsersTableMode = 'all' | 'students' | 'instructors';

interface UsersTableProps {
  title: string;
  description: string;
  tableTitle: string;
  mode?: UsersTableMode;
  addLabel?: string;
}

const fetchers: Record<
  UsersTableMode,
  (params: UserQueryParams) => Promise<PaginatedResponse<User>>
> = {
  all: usersApi.getAll,
  students: usersApi.getStudents,
  instructors: usersApi.getInstructors,
};

export function UsersTable({
  title,
  description,
  tableTitle,
  mode = 'all',
  addLabel = 'Add User',
}: UsersTableProps) {
  const [query, setQuery] = useState<UserQueryParams>({
    page: 1,
    limit: 10,
    search: '',
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: '', description: '', action: () => {} });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<PaginatedResponse<User>>({
    queryKey: [mode === 'all' ? 'users' : `users-${mode}`, query],
    queryFn: () => fetchers[mode](query),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      usersApi.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [mode === 'all' ? 'users' : `users-${mode}`] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user role',
        variant: 'destructive',
      });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      usersApi.updateStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [mode === 'all' ? 'users' : `users-${mode}`] });
      toast({
        title: 'Success',
        description: 'User status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user status',
        variant: 'destructive',
      });
    },
  });

  const handleChangeRole = (userId: string, role: string, roleName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Change User Role',
      description: `Are you sure you want to change this user's role to ${roleName}?`,
      action: () => {
        changeRoleMutation.mutate({ userId, role });
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleChangeStatus = (userId: string, status: string, statusName: string) => {
    let description = `Are you sure you want to ${statusName.toLowerCase()} this user?`;
    if (status === 'BANNED') {
      description = 'Are you sure you want to ban this user? They will lose all access to the platform.';
    }

    setConfirmDialog({
      open: true,
      title: `${statusName} User`,
      description,
      action: () => {
        changeStatusMutation.mutate({ userId, status });
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'ADMIN':
        return 'default';
      case 'INSTRUCTOR':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'warning';
      case 'BANNED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'NA';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{tableTitle}</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8 w-64"
                  value={query.search}
                  onChange={(e) => setQuery({ ...query, search: e.target.value, page: 1 })}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
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
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load users.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
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
                            <DropdownMenuItem>Edit User</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem
                                  disabled={user.role === 'STUDENT'}
                                  onClick={() => handleChangeRole(user.id, 'STUDENT', 'Student')}
                                >
                                  Student
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={user.role === 'INSTRUCTOR'}
                                  onClick={() => handleChangeRole(user.id, 'INSTRUCTOR', 'Instructor')}
                                >
                                  Instructor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={user.role === 'ADMIN'}
                                  onClick={() => handleChangeRole(user.id, 'ADMIN', 'Admin')}
                                >
                                  Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={user.role === 'SUPER_ADMIN'}
                                  onClick={() => handleChangeRole(user.id, 'SUPER_ADMIN', 'Super Admin')}
                                >
                                  Super Admin
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem
                                  disabled={user.status === 'ACTIVE'}
                                  onClick={() => handleChangeStatus(user.id, 'ACTIVE', 'Activate')}
                                >
                                  Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={user.status === 'SUSPENDED'}
                                  onClick={() => handleChangeStatus(user.id, 'SUSPENDED', 'Suspend')}
                                  className="text-orange-600"
                                >
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={user.status === 'BANNED'}
                                  onClick={() => handleChangeStatus(user.id, 'BANNED', 'Ban')}
                                  className="text-destructive"
                                >
                                  Ban
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {data?.data?.length || 0} of {data?.meta?.total || 0} users
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data || query.page === 1}
                    onClick={() => setQuery({ ...query, page: (query.page || 1) - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data || query.page === data?.meta?.totalPages}
                    onClick={() => setQuery({ ...query, page: (query.page || 1) + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.action}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
