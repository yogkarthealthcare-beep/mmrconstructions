export type UserRole = 'Customer' | 'Associate';

export interface RoleAwareUser {
  user_type?: string;
  account_status?: string;
  permissions?: string[] | Record<string, boolean>;
}

export const ACTIVE_ACCOUNT_STATUSES = ['Active', 'Approved'];

export const CUSTOMER_PERMISSIONS = [
  'dashboard.view',
  'profile.view',
  'plots.view',
  'plots.book',
  'emi.view',
  'emi.pay',
  'payments.view',
  'receipts.view',
  'buyback.view',
  'notifications.view',
  'support.view',
];

export const ASSOCIATE_PERMISSIONS = [
  ...CUSTOMER_PERMISSIONS,
  'associate.dashboard.view',
  'mlm.tree.view',
  'referral.manage',
  'commission.view',
  'bonus.view',
  'downline.view',
  'mlm.reports.view',
  'income.schedule.view',
  'income.tracker.view',
];

export function normalizeUserRole(user: RoleAwareUser | null | undefined): UserRole {
  return user?.user_type === 'Associate' ? 'Associate' : 'Customer';
}

export function isApprovedUser(user: RoleAwareUser | null | undefined): boolean {
  const status = user?.account_status;
  return !status || ACTIVE_ACCOUNT_STATUSES.includes(status);
}

export function hasPermission(user: RoleAwareUser | null | undefined, permission: string): boolean {
  if (!user || !isApprovedUser(user)) return false;

  const configured = user.permissions;
  if (Array.isArray(configured)) return configured.includes(permission);
  if (configured && typeof configured === 'object') return configured[permission] === true;

  const defaults = normalizeUserRole(user) === 'Associate'
    ? ASSOCIATE_PERMISSIONS
    : CUSTOMER_PERMISSIONS;
  return defaults.includes(permission);
}

export function canAccessAssociateFeatures(user: RoleAwareUser | null | undefined): boolean {
  return normalizeUserRole(user) === 'Associate'
    && isApprovedUser(user)
    && hasPermission(user, 'associate.dashboard.view');
}
