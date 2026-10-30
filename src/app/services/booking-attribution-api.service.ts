import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  BookableCustomer,
  BookingAttribution,
  SalesTrackerSummary,
  CustomerSalesRow,
  ApprovalDecisionPayload,
  LeaderboardEntry,
  BulkResolveAttributionPayload,
  UnattributedCustomer,
  UnattributedCustomerStats
} from './booking-attribution.types';

export const BASE_URL = environment.apiBaseUrl || 'https://api.mmrconstructions.in';

export interface AttributionAppError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

@Injectable({ providedIn: 'root' })
export class BookingAttributionApiService {
  constructor(private http: HttpClient) {}

  private getAuthHeaders(isAdmin = false): HttpHeaders {
    let token: string | null = null;
    if (isAdmin) {
      token = sessionStorage.getItem('mmr_admin_token') || localStorage.getItem('mmr_admin_token');
    } else {
      token = sessionStorage.getItem('mmr_user_token') || localStorage.getItem('mmr_user_token');
    }
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMsg = 'An unexpected error occurred. Please try again.';
    const status = error.status;
    const serverMsg = error.error?.message || error.message;

    if (status === 400) {
      if (/referral/i.test(serverMsg) || /code/i.test(serverMsg)) {
        userMsg = serverMsg || 'Invalid referral code or ineligible referrer.';
      } else if (/emi/i.test(serverMsg)) {
        userMsg = 'EMI option is disabled for Associate / Team Member bookings. Direct customer purchase only.';
      } else {
        userMsg = serverMsg || 'Bad request. Please verify your input data.';
      }
    } else if (status === 403) {
      if (/on-behalf/i.test(serverMsg) || /other/i.test(serverMsg)) {
        userMsg = 'Customers are not permitted to make bookings on behalf of others.';
      } else if (/kyc/i.test(serverMsg) || /document/i.test(serverMsg)) {
        userMsg = 'document upload AND KYC not done';
      } else {
        userMsg = serverMsg || 'document upload AND KYC not done';
      }
    } else if (status === 409) {
      if (/plot/i.test(serverMsg) || /unavailable/i.test(serverMsg)) {
        userMsg = 'This plot is currently locked, under booking, or already confirmed by another client.';
      } else if (/approval/i.test(serverMsg) || /state/i.test(serverMsg)) {
        userMsg = 'Booking state conflict: This booking has already been processed or modified.';
      } else {
        userMsg = serverMsg || 'Conflict: The requested resource has already been modified.';
      }
    } else if (status === 404) {
      userMsg = serverMsg || 'The requested record or booking was not found.';
    } else if (status >= 500) {
      userMsg = 'Server encounter error. Please contact administrative support.';
    }

    const appError: AttributionAppError = {
      status,
      message: userMsg,
      details: error.error
    };

    return throwError(() => appError);
  }

  // ── Team Member & Associate Booking APIs ──────────────────────────

  /**
   * Search bookable customers for on-behalf bookings.
   * Calls GET /api/my-bookable-customers?search=...
   */
  getMyBookableCustomers(search = '', filters: { team_member_id?: number | string; type?: string } = {}): Observable<BookableCustomer[]> {
    let params = new HttpParams();
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    if (filters.team_member_id) {
      params = params.set('team_member_id', String(filters.team_member_id));
    }
    if (filters.type) {
      params = params.set('type', String(filters.type));
    }

    return this.http.get<any>(`${BASE_URL}/api/my-bookable-customers`, {
      headers: this.getAuthHeaders(false),
      params
    }).pipe(
      map(res => (res?.data || res || []) as BookableCustomer[]),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Fetch runtime booking capabilities (EMI policy, allowed payment methods).
   * Calls GET /api/booking-capabilities
   */
  getBookingCapabilities(): Observable<{
    allow_emi_on_behalf: boolean;
    booking_approval_enabled: boolean;
    referral_invalid_code_mode: string;
    allowed_payment_methods: string[];
  }> {
    return this.http.get<any>(`${BASE_URL}/api/booking-capabilities`, {
      headers: this.getAuthHeaders(false)
    }).pipe(
      map(res => res?.data || {
        allow_emi_on_behalf: false,
        booking_approval_enabled: true,
        referral_invalid_code_mode: 'reject',
        allowed_payment_methods: ['Bank Transfer / NEFT / RTGS', 'UPI / QR Code', 'Online Payment Gateway']
      }),
      catchError(() => of({
        allow_emi_on_behalf: false,
        booking_approval_enabled: true,
        referral_invalid_code_mode: 'reject',
        allowed_payment_methods: ['Bank Transfer / NEFT / RTGS', 'UPI / QR Code', 'Online Payment Gateway']
      }))
    );
  }

  /**
   * Submit plot booking with attribution (SELF or ON_BEHALF).
   * Calls POST /api/bookings or POST /api/associate/bookings
   */
  createAttributedBooking(payload: {
    plot_id: number;
    site_id?: number;
    payment_type: string;
    payment_method?: string;
    payment_option?: string;
    advance_amount: number;
    booking_amount?: number;
    buyer_type: 'SELF' | 'ON_BEHALF';
    customer_id?: number;
    team_member_user_id?: number;
    installment_plan_id?: number | null;
    notes?: string;
    custom_plot_price?: number;
    plot_price?: number;
    base_price?: number;
  }, isAssociateRoute = false): Observable<any> {
    const endpoint = isAssociateRoute ? `${BASE_URL}/api/associate/bookings` : `${BASE_URL}/api/bookings`;
    return this.http.post<any>(endpoint, payload, {
      headers: this.getAuthHeaders(false)
    }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  // ── Team Member Performance & Sales APIs ──────────────────────────

  /**
   * Fetch aggregate performance numbers for Team Member.
   * Calls GET /api/team-members/:id/sales-summary
   */
  getTeamMemberSalesSummary(teamMemberId: number): Observable<SalesTrackerSummary> {
    return this.http.get<any>(`${BASE_URL}/api/team-members/${teamMemberId}/sales-summary`, {
      headers: this.getAuthHeaders(false)
    }).pipe(
      map(res => (res?.data || res) as SalesTrackerSummary),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Fetch paginated customer sales attributed to Team Member.
   * Calls GET /api/team-members/:id/customers-sales
   */
  getTeamMemberCustomersSales(teamMemberId: number, params: { page?: number; limit?: number; search?: string } = {}): Observable<{ data: CustomerSalesRow[]; total: number }> {
    let q = new HttpParams();
    if (params.page) q = q.set('page', String(params.page));
    if (params.limit) q = q.set('limit', String(params.limit));
    if (params.search) q = q.set('search', params.search);

    return this.http.get<any>(`${BASE_URL}/api/team-members/${teamMemberId}/customers-sales`, {
      headers: this.getAuthHeaders(false),
      params: q
    }).pipe(
      map(res => {
        const rows = (res?.data || res?.items || res || []) as CustomerSalesRow[];
        const total = res?.total || res?.count || rows.length;
        return { data: rows, total };
      }),
      catchError(err => this.handleError(err))
    );
  }

  // ── Associate Approvals & Team Sales APIs ──────────────────────────

  /**
   * Fetch booking approval queue for Associate.
   * Calls GET /api/associate/booking-approvals?status=...&overdue=...
   */
  getAssociateBookingApprovals(status = 'All', overdueOnly = false): Observable<BookingAttribution[]> {
    let q = new HttpParams();
    if (status && status !== 'All') q = q.set('status', status);
    if (overdueOnly) q = q.set('overdue', 'true');

    return this.http.get<any>(`${BASE_URL}/api/associate/booking-approvals`, {
      headers: this.getAuthHeaders(false),
      params: q
    }).pipe(
      map(res => (res?.data || res || []) as BookingAttribution[]),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Approve or reject a Team Member booking.
   * Calls POST /api/associate/booking-approvals/:id/decide
   */
  decideAssociateApproval(bookingId: number, payload: ApprovalDecisionPayload): Observable<any> {
    const action = payload.decision === 'approve' ? 'approve' : 'reject';
    const body = {
      decision: payload.decision,
      reason: payload.rejection_reason || payload.decision_notes || '',
      decision_notes: payload.decision_notes,
      rejection_reason: payload.rejection_reason
    };
    return this.http.post<any>(`${BASE_URL}/api/associate/booking-approvals/${bookingId}/decide`, body, {
      headers: this.getAuthHeaders(false)
    }).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return this.http.post<any>(`${BASE_URL}/api/associate/booking-approvals/${bookingId}/${action}`, body, {
            headers: this.getAuthHeaders(false)
          });
        }
        return throwError(() => err);
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Fetch team sales report for Associate.
   * Calls GET /api/associate/team-sales
   */
  getAssociateTeamSales(associateId: number, params: any = {}): Observable<any> {
    let q = new HttpParams();
    if (params.page) q = q.set('page', String(params.page));
    if (params.limit) q = q.set('limit', String(params.limit));
    if (params.search) q = q.set('search', params.search);

    return this.http.get<any>(`${BASE_URL}/api/associate/team-sales`, {
      headers: this.getAuthHeaders(false),
      params: q
    }).pipe(
      map(res => res?.data || res),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Export team sales report as CSV blob.
   * Calls GET /api/associate/team-sales/export
   */
  exportAssociateTeamSalesCsv(): Observable<Blob> {
    return this.http.get(`${BASE_URL}/api/associate/team-sales/export`, {
      headers: this.getAuthHeaders(false),
      responseType: 'blob'
    }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  // ── Admin Leaderboards, Queue & Attribution APIs ───────────────────

  /**
   * Fetch Leaderboards for Associates or Team Members.
   * Calls GET /api/admin/leaderboards?type=...&period=...
   */
  getLeaderboards(type: 'team-members' | 'associates', period = 'all'): Observable<LeaderboardEntry[]> {
    const q = new HttpParams()
      .set('type', type)
      .set('period', period);

    return this.http.get<any>(`${BASE_URL}/api/admin/leaderboards`, {
      headers: this.getAuthHeaders(true),
      params: q
    }).pipe(
      map(res => (res?.data || res || []) as LeaderboardEntry[]),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Export Leaderboard as CSV blob.
   * Calls GET /api/admin/leaderboards/export?type=...
   */
  exportLeaderboardCsv(type: 'team-members' | 'associates'): Observable<Blob> {
    const q = new HttpParams().set('type', type);
    return this.http.get(`${BASE_URL}/api/admin/leaderboards/export`, {
      headers: this.getAuthHeaders(true),
      params: q,
      responseType: 'blob'
    }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Fetch unattributed bookings list for Admin.
   * Calls GET /api/admin/bookings/unattributed
   */
  getUnattributedBookings(params: any = {}): Observable<{ data: BookingAttribution[]; total: number }> {
    let q = new HttpParams();
    if (params.page) q = q.set('page', String(params.page));
    if (params.limit) q = q.set('limit', String(params.limit));
    if (params.search) q = q.set('search', params.search);

    return this.http.get<any>(`${BASE_URL}/api/admin/bookings/unattributed`, {
      headers: this.getAuthHeaders(true),
      params: q
    }).pipe(
      map(res => {
        const rows = (res?.data || res?.items || res || []) as BookingAttribution[];
        const total = res?.total || res?.count || rows.length;
        return { data: rows, total };
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Admin override for Associate Approval.
   * Calls POST /api/admin/bookings/:id/override-approval
   */
  overrideBookingApproval(bookingId: number, payload: { status: 'Approved' | 'Rejected' | 'NotRequired'; notes?: string }): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/admin/bookings/${bookingId}/override-approval`, payload, {
      headers: this.getAuthHeaders(true)
    }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Admin bulk resolve attribution for multiple bookings.
   * Calls POST /api/admin/bookings/bulk-resolve-attribution
   */
  bulkResolveAttribution(payload: BulkResolveAttributionPayload): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/admin/bookings/bulk-resolve-attribution`, payload, {
      headers: this.getAuthHeaders(true)
    }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  // ── Unattributed Customers & Referrer Assignment (Spec Compliance) ─

  /**
   * Fetch unattributed customers with tabs COMPANY_DIRECT vs LEGACY_AMBIGUOUS.
   * Calls GET /api/admin/sales-attribution/unattributed
   */
  getUnattributedCustomers(params: { tab?: string; page?: number; limit?: number; search?: string } = {}): Observable<{
    stats: UnattributedCustomerStats;
    customers: UnattributedCustomer[];
  }> {
    let q = new HttpParams();
    if (params.tab && params.tab !== 'ALL') q = q.set('tab', params.tab);
    if (params.page) q = q.set('page', String(params.page));
    if (params.limit) q = q.set('limit', String(params.limit));
    if (params.search) q = q.set('search', params.search.trim());

    return this.http.get<any>(`${BASE_URL}/api/admin/sales-attribution/unattributed`, {
      headers: this.getAuthHeaders(true),
      params: q
    }).pipe(
      map(res => {
        const body = res?.data || res || {};
        return {
          stats: body.stats || { total_unattributed: 0, legacy_ambiguous_count: 0, direct_signup_count: 0 },
          customers: (body.customers || []) as UnattributedCustomer[]
        };
      }),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Admin assigns/changes referrer for an individual customer.
   * Calls PATCH /api/admin/users/:id/referrer with mandatory reason.
   */
  assignCustomerReferrer(userId: number, payload: { referrer_member_id?: string; referrer_user_id?: number; reason: string }): Observable<any> {
    return this.http.patch<any>(`${BASE_URL}/api/admin/users/${userId}/referrer`, payload, {
      headers: this.getAuthHeaders(true)
    }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Bulk resolve customer referrals via CSV upload with dry-run preview and per-row results.
   * Calls POST /api/admin/referrals/bulk-resolve
   */
  bulkResolveCustomerReferrals(payload: { reason: string; dry_run?: boolean; override?: boolean; rows: any[] }): Observable<{
    results: any[];
    errors: any[];
    total_processed: number;
    success_count: number;
    error_count: number;
    is_dry_run: boolean;
  }> {
    return this.http.post<any>(`${BASE_URL}/api/admin/referrals/bulk-resolve`, payload, {
      headers: this.getAuthHeaders(true)
    }).pipe(
      map(res => res?.data || res || {}),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Search active Associates & Team Members for referrer picker.
   * Calls GET /api/admin/users?role=Associate,Team+Member&search=...
   */
  searchActiveReferrers(search: string): Observable<Array<{ user_id: number; member_id: string; full_name: string; user_type: string }>> {
    let q = new HttpParams().set('search', search.trim()).set('limit', '10');
    return this.http.get<any>(`${BASE_URL}/api/admin/users`, {
      headers: this.getAuthHeaders(true),
      params: q
    }).pipe(
      map(res => {
        const users = (res?.data?.users || res?.data || res?.users || []) as any[];
        return users
          .filter(u => ['Associate', 'Team Member'].includes(u.user_type))
          .map(u => ({
            user_id: u.user_id,
            member_id: u.member_id,
            full_name: u.full_name,
            user_type: u.user_type
          }));
      }),
      catchError(() => of([]))
    );
  }
}
