'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderTree,
  BookOpen,
  KeyRound,
  Settings,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  CreditCard,
  UserCheck,
  Video,
  MessageSquare,
  Bell,
  BarChart3,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    titleKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    titleKey: 'users',
    href: '/users',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'students',
    href: '/users/students',
    icon: GraduationCap,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'instructors',
    href: '/users/instructors',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'categories',
    href: '/categories',
    icon: FolderTree,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'courses',
    href: '/courses',
    icon: BookOpen,
  },
  {
    titleKey: 'skillTrees',
    href: '/skill-trees',
    icon: GitBranch,
    roles: ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'],
  },
  {
    titleKey: 'accessCodes',
    href: '/access-codes',
    icon: KeyRound,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'subscriptions',
    href: '/subscriptions',
    icon: CreditCard,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'enrollments',
    href: '/enrollments',
    icon: UserCheck,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'streaming',
    href: '/streaming',
    icon: Video,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'community',
    href: '/community',
    icon: MessageSquare,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'auditLogs',
    href: '/audit-logs',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'images',
    href: '/images',
    icon: ImageIcon,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    titleKey: 'settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">{t('appName')}</span>
            </Link>
          )}
          {collapsed && (
            <GraduationCap className="mx-auto h-8 w-8 text-primary" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const title = t(item.titleKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? title : undefined}
              >
                <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
                {!collapsed && title}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('collapse')}
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
