/**
 * Audit Log Service Interface
 *
 * Provider-agnostic interface for audit logging.
 * Implementations can use console, database, or external services.
 */

export const AUDIT_LOG_SERVICE = Symbol('AUDIT_LOG_SERVICE');

export interface AuditLogService {
  logDataChange(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes: { old?: Record<string, any>; new?: Record<string, any> },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void>;
}
