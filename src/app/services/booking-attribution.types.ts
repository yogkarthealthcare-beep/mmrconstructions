/**
 * MMR Construction & Developers
 * Phase 3: Booking Attribution & Hierarchy Types
 */

export type BuyerType = 'SELF' | 'ON_BEHALF';
export type AssociateApprovalStatus = 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';

export interface BookableCustomer {
  user_id: number;
  full_name: string;
  email?: string;
  mobile_no: string;
  masked_mobile?: string;
  member_id: string;
  account_status?: string;
  is_verified?: boolean;
  kyc_status?: string;
  registered_at?: string;
  created_at?: string;
  relationship?: 'DIRECT' | 'TEAM_MEMBER' | string;
  referrer_user_id?: number;
  referrer_name?: string;
  referrer_member_id?: string;
}

export interface BookingAttribution {
  booking_id: number;
  booking_serial: string;
  plot_id: number;
  plot_number?: string;
  site_name?: string;
  booking_type?: string;
  buyer_type: BuyerType;
  booked_by_user_id: number;
  sold_by_user_id?: number | null;
  associate_user_id?: number | null;
  associate_approval_status: AssociateApprovalStatus;
  associate_approval_notes?: string;
  associate_approval_decided_at?: string;
  associate_approval_overridden?: boolean;
  is_overdue?: boolean;
  pending_since?: string;
  customer_name?: string;
  booked_by_name?: string;
  sold_by_name?: string;
  associate_name?: string;
  advance_amount?: number;
  base_price?: number;
  payment_type?: string;
  created_at?: string;
}

export interface SalesTrackerSummary {
  user_id: number;
  full_name?: string;
  member_id?: string;
  total_gaj_sold: number;
  total_sales_count: number;
  total_commission_earned: number;
  pending_approval_count: number;
  monthly_gaj_sold?: number;
  yearly_gaj_sold?: number;
  customers_count?: number;
  plots_sold_count?: number;
  active_customers_count?: number;
  processing_count?: number;
  cancelled_deals_count?: number;
  total_sales_value?: number;
  plots_sold?: number;
  kpis?: any;
}

export interface CustomerSalesRow {
  booking_id: number;
  booking_serial: string;
  customer_name: string;
  customer_mobile: string;
  customer_member_id?: string;
  plot_number: string;
  site_name: string;
  plot_size_gaj: number;
  advance_amount: number;
  booking_status: string;
  associate_approval_status: AssociateApprovalStatus;
  sale_type: 'SELF_PURCHASE' | 'CUSTOMER_SALE';
  is_overdue?: boolean;
  created_at: string;
}

export interface ApprovalDecisionPayload {
  decision: 'approve' | 'reject';
  decision_notes?: string;
  rejection_reason?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  full_name: string;
  member_id: string;
  mobile_no?: string;
  total_gaj_sold: number;
  plots_sold_count: number;
  total_sales_value?: number;
  total_commission_earned?: number;
}

export interface BulkResolveAttributionPayload {
  booking_ids: number[];
  resolution_mode: 'SET_ATTRIBUTION' | 'MARK_DIRECT' | 'AUTO_RESOLVE_BY_CUSTOMER_REFERRER';
  sold_by_user_id?: number;
  associate_user_id?: number;
  notes?: string;
}

export interface UnattributedCustomer {
  user_id: number;
  member_id: string;
  full_name: string;
  mobile_no?: string;
  registered_at: string;
  sponsor_user_id?: number;
  referred_by_source?: string;
  unattributed_type: 'COMPANY_DIRECT' | 'LEGACY_AMBIGUOUS';
  total_bookings_count: number;
  total_sales_volume: number;
}

export interface UnattributedCustomerStats {
  total_unattributed: number;
  legacy_ambiguous_count: number;
  direct_signup_count: number;
}
