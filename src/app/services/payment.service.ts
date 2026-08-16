import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import {
  PaymentGateway,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyResponse,
  PaymentStatusResponse,
  CommonPaymentRecord,
  CommonPaymentStatus
} from './payment.types';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private api: ApiService) {}

  /**
   * Fetches active payment gateways from the backend.
   * Public endpoint.
   */
  getActiveGateways(): Observable<{ success: boolean; data: PaymentGateway[] }> {
    return this.api.get('/api/payment/gateways');
  }

  /**
   * Initiates payment for a booking/order.
   * Requires user authorization.
   */
  initiatePayment(payload: InitiatePaymentRequest): Observable<InitiatePaymentResponse> {
    return this.api.post('/api/payment/initiate', payload);
  }

  /**
   * Checks local database state for status.
   * Requires user authorization.
   */
  getPaymentStatus(orderId: string): Observable<PaymentStatusResponse> {
    return this.api.get(`/api/payment/status/${orderId}`);
  }

  /**
   * Explicitly verifies Cashfree status in case redirect target or manual return requires sync.
   * Requires user authorization.
   */
  verifyCashfreePayment(orderId: string): Observable<VerifyResponse> {
    return this.api.post('/api/payment/cashfree/verify', { order_id: orderId });
  }

  normalizePaymentResponse(raw: any, gatewayName = raw?.gateway_name || raw?.gateway): CommonPaymentRecord {
    const status = this.normalizePaymentStatus(raw?.payment_status || raw?.status || raw?.txStatus || raw?.event);
    return {
      transaction_id: raw?.transaction_id || raw?.id || raw?.payment_id || null,
      payment_reference_id: raw?.payment_reference_id || raw?.gateway_payment_id || raw?.razorpay_payment_id || raw?.cf_payment_id || raw?.reference_id || null,
      order_id: raw?.order_id || raw?.gateway_order_id || raw?.razorpay_order_id || raw?.cf_order_id || null,
      user_id: raw?.user_id || raw?.customer_id || null,
      user_name: raw?.user_name || raw?.customer_name || raw?.customer_details?.customer_name || null,
      user_email: raw?.user_email || raw?.customer_email || raw?.customer_details?.customer_email || null,
      user_mobile: raw?.user_mobile || raw?.customer_mobile || raw?.customer_details?.customer_phone || null,
      amount: Number(raw?.amount || raw?.order_amount || raw?.payment_amount || 0),
      currency: raw?.currency || raw?.order_currency || 'INR',
      gateway_name: gatewayName || 'unknown',
      payment_status: status,
      gateway_response: raw,
      payment_date: raw?.payment_date || raw?.created_at || raw?.updated_at || new Date().toISOString(),
      created_by: raw?.created_by || raw?.user_id || null,
    };
  }

  private normalizePaymentStatus(status: any): CommonPaymentStatus {
    const clean = String(status || '').toLowerCase();
    if (['success', 'paid', 'captured', 'completed', 'payment_success'].includes(clean)) return 'success';
    if (['failed', 'failure', 'declined', 'cancelled', 'canceled', 'payment_failed'].includes(clean)) return 'failed';
    if (['processing', 'authorized', 'initiated'].includes(clean)) return 'processing';
    if (['refunded', 'refund'].includes(clean)) return 'refunded';
    return 'pending';
  }
}
