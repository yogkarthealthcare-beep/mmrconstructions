import { AdminUser, AdminUsersPage } from './admin-users.types';

export function toAdminUsersPage(res: any): AdminUsersPage {
  const rows: AdminUser[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.data?.users)
      ? res.data.users
      : Array.isArray(res?.users)
        ? res.users
        : [];

  const totalRecords = Number(
    res?.totalRecords ?? res?.total ?? res?.data?.total ?? rows.length,
  );
  const currentPage = Number(res?.currentPage ?? res?.page ?? res?.data?.page ?? 1);
  const pageSize = Number(res?.pageSize ?? res?.limit ?? res?.data?.limit ?? 20);
  const totalPages = Number(res?.totalPages ?? Math.max(1, Math.ceil(totalRecords / pageSize)));

  return { rows, totalRecords, currentPage, pageSize, totalPages };
}
