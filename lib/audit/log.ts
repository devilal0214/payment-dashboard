/**
 * lib/audit/log.ts
 *
 * Audit logging to disk file.
 * Does NOT require any extra DB permissions.
 */
import fs from 'fs';
import path from 'path';

export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'ticket_view'
  | 'export'
  | 'export_large'
  | 'raw_data_access';

export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  userId?: string | number;
  username?: string;
  role?: string;
  resourceId?: string | number;
  details?: Record<string, unknown>;
  ip?: string;
}

function getLogPath(): string {
  const dir = process.env.AUDIT_LOG_DIR
    ? path.resolve(process.env.AUDIT_LOG_DIR)
    : path.join(process.cwd(), 'logs');
  // Ensure directory exists
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Daily log rotation
  const date = new Date().toISOString().slice(0, 10);
  return path.join(dir, `audit-${date}.log`);
}

export function auditLog(entry: AuditEntry): void {
  try {
    const line = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    }) + '\n';
    fs.appendFileSync(getLogPath(), line, 'utf8');
  } catch (err) {
    // Audit log failure should never crash the app
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}

export function createAuditEntry(
  action: AuditAction,
  user: { id?: number; username?: string; role?: string } | null,
  options: Partial<Omit<AuditEntry, 'action' | 'timestamp'>> = {},
): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    userId: user?.id,
    username: user?.username,
    role: user?.role,
    ...options,
  };
}
