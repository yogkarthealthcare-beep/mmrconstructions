export interface PaymentGateway {
  gateway_name: string;
  display_name: string;
  status: 'active' | 'inactive' | 'maintenance';
  mode: 'sandbox' | 'production' | 'test' | 'live';
  logo: string;
  priority?: number;
  is_default?: boolean;
  allow_user_selection?: boolean;
  min_customer_fund_amount?: number;
  min_associate_fund_amount?: number;
}

export interface PaymentGatewayAdmin extends PaymentGateway {
  id?: string;
  is_enabled?: boolean;
  fallback_enabled?: boolean;
  // Credentials and URLs (masked in GET, accepts plain update in PUT)
  key_id?: string;
  key_secret?: string;
  client_id?: string;
  client_secret?: string;
  webhook_secret?: string;
  callback_url?: string;
  webhook_url?: string;
  success_url?: string;
  failure_url?: string;
  cancel_url?: string;
  environment_mode?: 'sandbox' | 'production' | 'test' | 'live';
  public_key?: string;
  secret_key?: string;
}

export interface PaymentSettings {
  user_gateway_selection: boolean;
  default_gateway: string;
  fallback_gateway: boolean;
}

export interface InitiatePaymentRequest {
  order_id: string;
  amount: number;
  gateway_name?: string;
  customer_name: string;
  customer_email: string;
  customer_mobile: string;
}

export interface RazorpayCheckoutDetails {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  callback_url: string;
}

export interface CashfreeCheckoutDetails {
  payment_session_id: string;
  order_id: string;
  environment: 'sandbox' | 'production';
  callback_url?: string;
}

export interface PayUCheckoutDetails {
  type: 'payu_form';
  action: string;
  method: 'POST';
  fields: Record<string, string | number>;
}

export interface InitiatePaymentResponse {
  success: boolean;
  message: string;
  data: {
    transaction_id: string;
    order_id: string;
    gateway_name: 'razorpay' | 'cashfree' | 'payu';
    gateway_order_id: string;
    checkout_details: RazorpayCheckoutDetails | CashfreeCheckoutDetails | PayUCheckoutDetails;
  };
}

export interface RazorpayVerifyRequest {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'pending';
    gateway_payment_id: string;
    gateway_order_id: string;
    gateway_signature?: string;
    amount: number;
    currency: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    order_id: string;
    gateway_name: string;
    amount: string;
    currency: string;
    payment_status: 'pending' | 'success' | 'failed' | 'refunded';
    gateway_payment_id: string | null;
    failure_reason: string | null;
    created_at: string;
    updated_at: string;
  };
}

export type CommonPaymentStatus = 'success' | 'failed' | 'pending' | 'processing' | 'refunded';

export interface CommonPaymentRecord {
  transaction_id: string | null;
  payment_reference_id: string | null;
  order_id: string | null;
  user_id: string | number | null;
  user_name: string | null;
  user_email: string | null;
  user_mobile: string | null;
  amount: number;
  currency: string;
  gateway_name: string;
  payment_status: CommonPaymentStatus;
  gateway_response: any;
  payment_date: string | null;
  created_by: string | number | null;
}

export interface PaymentAuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action: string;
  gateway_name: string;
  changes: any; // json showing old vs new values
  ip_address: string;
  created_at: string;
}
