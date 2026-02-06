'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold">Admin Panel</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <span className="text-xs font-normal text-muted-foreground cursor-pointer hover:text-primary">Mark all as read</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {/* Mock Data */}
              <div className="flex flex-col gap-1 p-1">
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">New User Registration</span>
                    <span className="text-[10px] text-muted-foreground">2m ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    John Doe (student) has just signed up. verify their documents.
                  </p>
                  <div className="h-2 w-2 rounded-full bg-blue-500 absolute top-4 right-2"></div>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer bg-muted/50">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">System Alert</span>
                    <span className="text-[10px] text-muted-foreground">1h ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Database backup completed successfully.
                  </p>
                </DropdownMenuItem>

                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">Course Approval</span>
                    <span className="text-[10px] text-muted-foreground">3h ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Instructor Sarah submitted "React Advanced" for review.
                  </p>
                  <div className="h-2 w-2 rounded-full bg-blue-500 absolute top-4 right-2"></div>
                </DropdownMenuItem>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="w-full text-center justify-center text-primary font-medium cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback>{user ? getInitials(user.name) : '?'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                <Badge
                  variant={getRoleBadgeVariant(user?.role || '')}
                  className="w-fit"
                >
                  {user?.role?.replace('_', ' ')}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
