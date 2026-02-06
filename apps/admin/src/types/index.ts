// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION';
  locale: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// Pagination
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Category types
export interface Category {
  id: string;
  parentId?: string;
  name: string;
  description?: string;
  slug: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
  children?: Category[];
  _count?: {
    courses: number;
    children: number;
  };
}

// Course types
export interface Course {
  id: string;
  title: string;
  description?: string;
  slug: string;
  coverImageUrl?: string;
  language: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  pricingModel: 'FREE' | 'PAID' | 'ACCESS_CODE_ONLY';
  price?: number;
  isFeatured: boolean;
  categoryId?: string;
  category?: Category;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  _count?: {
    enrollments: number;
    sections: number;
  };
}

// Access Code types
export interface AccessCode {
  id: string;
  code: string;
  type: 'COURSE' | 'VIDEO';
  courseId?: string;
  materialId?: string;
  isSingleUse: boolean;
  maxRedemptions: number;
  currentRedemptions: number;
  expiresAt?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  course?: { id: string; title: string; slug: string };
  material?: { id: string; title: string; type: string };
  createdBy: { id: string; name: string };
  createdAt: string;
}

// Dashboard types
export interface DashboardKPIs {
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

export interface ActivityItem {
  type: 'user_registered' | 'enrollment_created' | 'course_submitted';
  timestamp: string;
  data: Record<string, unknown>;
}

// API Error
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
