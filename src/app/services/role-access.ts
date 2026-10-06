export type UserRole = 'Customer' | 'Associate' | 'Team Member';

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

export const TEAM_MEMBER_PERMISSIONS = [
  'dashboard.view',
  'profile.view',
  'plots.view',
  'emi.view',
  'payments.view',
  'receipts.view',
  'documents.view',
  'notifications.view',
  'support.view',
];

export const ASSOCIATE_PERMISSIONS = [
  ...CUSTOMER_PERMISSIONS,
  'associate.dashboard.view',
  'team.member.enroll',
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
  const type = String(user?.user_type || '').toLowerCase().trim();
  if (type === 'team member' || type.includes('team member')) return 'Team Member';
  if (type === 'associate' || type.includes('associate')) return 'Associate';
  return 'Customer';
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

  const role = normalizeUserRole(user);
  if (role === 'Team Member') return TEAM_MEMBER_PERMISSIONS.includes(permission);
  if (role === 'Associate') return ASSOCIATE_PERMISSIONS.includes(permission);
  return CUSTOMER_PERMISSIONS.includes(permission);
}

export function canAccessAssociateFeatures(user: RoleAwareUser | null | undefined): boolean {
  return normalizeUserRole(user) === 'Associate'
    && isApprovedUser(user)
    && hasPermission(user, 'associate.dashboard.view');
}
