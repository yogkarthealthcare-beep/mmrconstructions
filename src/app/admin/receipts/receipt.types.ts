export interface Receipt {
  id: number;
  receipt_no: string;
  serial_no: number;
  plot_no?: string;
  plot_area?: string;
  customer_id?: number | null;
  customer_name: string;
  mobile_no: string;
  r_o_p?: string;
  payment_type: 'Cash' | 'Cheque' | 'Other' | string;
  payment_mode: 'Full Payment' | 'Installment' | 'Advance' | 'Booking Amount' | 'Other' | string;
  cheque_no?: string;
  cheque_date?: string;
  bank_name?: string;
  receipt_amount: number;
  paid_amount: number;
  inward_amount: number;
  amount_depositor_name?: string;
  advisor_name?: string;
  advisor_mobile?: string;
  full_payment_time?: string;
  receipt_date: string;
  plotting_place: string;
  depositor_signature?: string;
  authorized_signature?: string;
  notes?: string;
  status: 'Active' | 'Cancelled' | 'Deleted' | string;
  is_locked?: boolean;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface ReceiptSummary {
  totalReceipts: number;
  todayReceipts: number;
  todayCollection: number;
  totalCollection: number;
  activeReceipts: number;
  cancelledReceipts: number;
  cashReceipts?: number;
  chequeReceipts?: number;
  upiReceipts?: number;
}

export interface ReceiptPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReceiptApiResponse {
  success: boolean;
  message?: string;
  data: Receipt[];
  pagination: ReceiptPagination;
  summary: ReceiptSummary;
}

export interface ReceiptSingleResponse {
  success: boolean;
  message?: string;
  data: {
    receipt: Receipt;
    amountInWords: string;
    auditLogs?: any[];
  };
}

export interface CustomerLookupItem {
  user_id: number;
  member_id?: string;
  full_name: string;
  mobile_no: string;
  email?: string;
  user_type?: string;
}
