/**
 * lib/auth/roles.ts
 *
 * Role definitions and permission helpers.
 */

export type Role = 'admin' | 'payment_manager' | 'payment_agent' | 'viewer';

export const ROLES: Role[] = ['admin', 'payment_manager', 'payment_agent', 'viewer'];

/**
 * Permission definitions per role.
 */
export const PERMISSIONS = {
  /**
   * Can view the list table and KPI dashboard.
   */
  viewList: ['admin', 'payment_manager', 'payment_agent', 'viewer'] as Role[],

  /**
   * Can open the detail drawer/page.
   */
  viewDetail: ['admin', 'payment_manager', 'payment_agent', 'viewer'] as Role[],

  /**
   * Can see sensitive fields (phone, email, address, passport, payment_info, etc.)
   */
  viewSensitive: ['admin', 'payment_manager', 'payment_agent'] as Role[],

  /**
   * Can view raw JSON fields (payload_json, zendesk_payload_json, etc.)
   */
  viewRawJson: ['admin'] as Role[],

  /**
   * Can export CSV/XLSX (filtered results, no raw fields).
   */
  exportBasic: ['admin', 'payment_manager', 'payment_agent'] as Role[],

  /**
   * Can export with raw/advanced fields included.
   */
  exportAdvanced: ['admin'] as Role[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as Role[]).includes(role);
}

export function requirePermission(role: Role | undefined, permission: Permission): void {
  if (!role || !hasPermission(role, permission)) {
    throw new Error(`Forbidden: requires ${permission} permission`);
  }
}
