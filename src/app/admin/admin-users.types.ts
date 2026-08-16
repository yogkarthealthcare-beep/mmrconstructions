export interface AdminUser {
  user_id: number;
  member_id?: string | null;
  user_type: 'Customer' | 'Associate' | string;
  full_name: string;
  mobile_no: string;
  email?: string | null;
  account_status: string;
  registered_at?: string | null;
  updated_at?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  invitation_code?: string | null;
  sponsor_name?: string | null;
  doc_count?: number;
}

export interface AdminUsersQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  user_type?: string;
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AdminUsersPage {
  rows: AdminUser[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}
