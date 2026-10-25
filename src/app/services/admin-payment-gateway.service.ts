import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { PaymentGatewayAdmin, PaymentSettings, PaymentAuditLog } from './payment.types';

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentGatewayService {
  constructor(private api: ApiService) {}

  /**
   * Retrieves administrative global payment settings.
   */
  getSettings(): Observable<{ success: boolean; data: PaymentSettings }> {
    return this.api.get('/api/admin/payment/settings', {}, true);
  }

  /**
   * Updates global settings (e.g. default gateway, enable fallback gateway).
   */
  updateSettings(settings: PaymentSettings): Observable<{ success: boolean; message: string }> {
    return this.api.post('/api/admin/payment/settings', settings, true);
  }

  /**
   * Fetches configurations for all gateways (including masked keys).
   */
  getGateways(): Observable<{ success: boolean; data: PaymentGatewayAdmin[] }> {
    return this.api.get('/api/admin/payment-gateways', {}, true);
  }

  /**
   * Retrieves specific credentials and config settings for a single gateway.
   */
  getGateway(gatewayName: string): Observable<{ success: boolean; data: PaymentGatewayAdmin }> {
    return this.api.get(`/api/admin/payment-gateways/${gatewayName}`, {}, true);
  }

  /**
   * Creates a gateway config when a supported gateway has not been registered yet.
   */
  createGateway(config: Partial<PaymentGatewayAdmin>): Observable<{ success: boolean; message: string; data: PaymentGatewayAdmin }> {
    return this.api.post('/api/admin/payment-gateways', config, true);
  }

  /**
   * Updates key credentials, webhook secrets, and statuses for a single gateway.
   */
  updateGateway(gatewayName: string, config: Partial<PaymentGatewayAdmin>): Observable<{ success: boolean; message: string }> {
    return this.api.put(`/api/admin/payment-gateways/${gatewayName}`, config, true);
  }

  /**
   * Fetches audit logs showing history of configuration adjustments.
   */
  getAuditLogs(params: any = {}): Observable<{ success: boolean; data: PaymentAuditLog[] }> {
    return this.api.get('/api/admin/payment-gateways/audit-logs', params, true);
  }

  /**
   * Fetches all UPI QR configurations (QR1, QR2).
   */
  getUpiQrConfigs(): Observable<{ success: boolean; data: any[] }> {
    return this.api.get('/api/admin/payment-gateways/upi-qr', {}, true);
  }

  /**
   * Saves or updates a UPI QR configuration with optional image upload.
   */
  saveUpiQrConfig(formData: FormData): Observable<{ success: boolean; data: any; message: string }> {
    return this.api.post('/api/admin/payment-gateways/upi-qr', formData, true);
  }

  /**
   * Retrieves active UPI QR configurations for customer booking flow.
   */
  getActiveUpiQrs(): Observable<{ success: boolean; data: any[] }> {
    return this.api.get('/api/payment/active-upi-qrs', {}, false);
  }
}
