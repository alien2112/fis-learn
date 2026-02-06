// ============ ENUMS ============

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum PricingModel {
  FREE = 'FREE',
  PAID = 'PAID',
  ACCESS_CODE_ONLY = 'ACCESS_CODE_ONLY',
}

export enum ContentType {
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
}

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
}

export enum AccessCodeStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum AccessCodeType {
  COURSE = 'COURSE',
  VIDEO = 'VIDEO',
}

export enum BlogPostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
}

// ============ INTERFACES ============

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
  status: UserStatus;
  locale: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  slug: string;
  coverImageUrl?: string;
  language: string;
  level: CourseLevel;
  status: CourseStatus;
  pricingModel: PricingModel;
  price?: number;
  isFeatured: boolean;
  categoryId?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

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
}

export interface AccessCode {
  id: string;
  code: string;
  type: AccessCodeType;
  courseId?: string;
  materialId?: string;
  isSingleUse: boolean;
  maxRedemptions: number;
  currentRedemptions: number;
  expiresAt?: Date;
  status: AccessCodeStatus;
  createdById: string;
  createdAt: Date;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progressPercent: number;
  enrolledAt: Date;
  completedAt?: Date;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// ============ DASHBOARD TYPES ============

export interface DashboardKPIs {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalAdmins: number;
  totalCourses: number;
  publishedCourses: number;
  pendingCourses: number;
  totalEnrollments: number;
  activeStudentsThisMonth: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ActivityItem {
  id: string;
  type: 'registration' | 'enrollment' | 'course_submission' | 'course_approval';
  description: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
}
