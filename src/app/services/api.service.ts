import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export const BASE_URL = 'https://brainbytesapi.onrender.com';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private headers(admin = false): HttpHeaders {
    const token = admin
      ? localStorage.getItem('mmr_admin_token')
      : localStorage.getItem('mmr_user_token');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  // ── Generic ──────────────────────────────────────
  get(path: string, params: any = {}, admin = false): Observable<any> {
    let p = new HttpParams();
    Object.keys(params).forEach(k => params[k] != null && (p = p.set(k, params[k])));
    return this.http.get(`${BASE_URL}${path}`, { headers: this.headers(admin), params: p });
  }
  post(path: string, body: any = {}, admin = false): Observable<any> {
    return this.http.post(`${BASE_URL}${path}`, body, { headers: this.headers(admin) });
  }
  put(path: string, body: any = {}, admin = false): Observable<any> {
    return this.http.put(`${BASE_URL}${path}`, body, { headers: this.headers(admin) });
  }
  patch(path: string, body: any = {}, admin = false): Observable<any> {
    return this.http.patch(`${BASE_URL}${path}`, body, { headers: this.headers(admin) });
  }
  postForm(path: string, form: FormData, admin = false): Observable<any> {
    const token = admin
      ? localStorage.getItem('mmr_admin_token')
      : localStorage.getItem('mmr_user_token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.post(`${BASE_URL}${path}`, form, { headers });
  }

  // ── AUTH — User ──────────────────────────────────
  sendOtp(mobile_no: string, purpose = 'Login') {
    return this.post('/api/auth/send-otp', { mobile_no, purpose });
  }
  login(mobile_no: string, otp_code?: string, password?: string) {
    return this.post('/api/auth/login', { mobile_no, otp_code, password });
  }
  forgotPassword(mobile_no: string) {
    return this.post('/api/auth/forgot-password', { mobile_no });
  }
  resetPassword(mobile_no: string, otp_code: string, new_password: string) {
    return this.post('/api/auth/reset-password', { mobile_no, otp_code, new_password });
  }

  // ── AUTH — Admin ─────────────────────────────────
  adminLogin(email: string, password: string) {
    return this.post('/api/admin/auth/login', { email, password });
  }

  // ── User Profile ─────────────────────────────────
  getProfile()              { return this.get('/api/profile'); }
  updateProfile(data: any)  { return this.put('/api/profile', data); }
  getDocuments()            { return this.get('/api/profile/documents'); }
  uploadDoc(form: FormData) { return this.postForm('/api/profile/upload-doc', form); }

  // ── Sites & Plots ─────────────────────────────────
  getSites()                    { return this.get('/api/sites'); }
  getSite(id: number)           { return this.get(`/api/sites/${id}`); }
  getSitePlots(id: number, q: any = {}) { return this.get(`/api/sites/${id}/plots`, q); }
  getPlot(id: number)           { return this.get(`/api/plots/${id}`); }

  // ── Bookings ─────────────────────────────────────
  getBookings()             { return this.get('/api/bookings'); }
  getBooking(id: number)    { return this.get(`/api/bookings/${id}`); }
  createBooking(data: any)  { return this.post('/api/bookings', data); }
  uploadBookingProof(id: number, form: FormData) {
    return this.postForm(`/api/bookings/${id}/upload-proof`, form);
  }

  // ── EMI ───────────────────────────────────────────
  getEmis()                         { return this.get('/api/emi'); }
  getEmiSchedule(bookingId: number) { return this.get(`/api/emi/${bookingId}`); }
  uploadEmiProof(emiId: number, form: FormData) {
    return this.postForm(`/api/emi/${emiId}/upload-proof`, form);
  }
  getEmiVoucher(emiId: number)      { return this.get(`/api/emi/${emiId}/voucher`); }

  // ── Associate ─────────────────────────────────────
  getAssocDashboard()              { return this.get('/api/associate/dashboard'); }
  getAssocNetwork()                { return this.get('/api/associate/network'); }
  getAssocCommissions(q: any = {}) { return this.get('/api/associate/commissions', q); }
  getInviteCode()                  { return this.get('/api/associate/invite-code'); }

  // ── Notifications ────────────────────────────────
  getNotifications(q: any = {})    { return this.get('/api/notifications', q); }
  markNotifRead(id: number)        { return this.patch(`/api/notifications/${id}/read`, {}); }
  markAllRead()                    { return this.patch('/api/notifications/read-all', {}); }

  // ── Buyback ───────────────────────────────────────
  getBuybackStatus()               { return this.get('/api/buyback/status'); }
  applyBuyback(booking_id: number) { return this.post('/api/buyback/apply', { booking_id }); }

  // ── ADMIN — Users ─────────────────────────────────
  adminGetPendingUsers()           { return this.get('/api/admin/users/pending', {}, true); }
  adminGetUsers(q: any = {})       { return this.get('/api/admin/users', q, true); }
  adminGetUser(id: number)         { return this.get(`/api/admin/users/${id}`, {}, true); }
  adminApproveUser(id: number, note = '') {
    return this.post(`/api/admin/users/${id}/approve`, { verify_note: note }, true);
  }
  adminRejectUser(id: number, reason: string, custom = '') {
    return this.post(`/api/admin/users/${id}/reject`, { rejection_reason: reason, rejection_custom: custom }, true);
  }
  adminRequestInfo(id: number, message: string) {
    return this.post(`/api/admin/users/${id}/request-info`, { message }, true);
  }
  adminBlacklist(id: number, reason: string) {
    return this.post(`/api/admin/users/${id}/blacklist`, { reason }, true);
  }

  // ── ADMIN — Bookings & EMI ────────────────────────
  adminGetBookings(q: any = {})    { return this.get('/api/admin/bookings', q, true); }
  adminConfirmBooking(id: number)  { return this.post(`/api/admin/bookings/${id}/confirm`, {}, true); }
  adminCancelBooking(id: number, reason: string) {
    return this.post(`/api/admin/bookings/${id}/cancel`, { reason }, true);
  }
  adminGetOverdueEmi()             { return this.get('/api/admin/emi/overdue', {}, true); }
  adminConfirmEmi(id: number, paid_amount: number) {
    return this.post(`/api/admin/emi/${id}/confirm`, { paid_amount }, true);
  }

  // ── ADMIN — Sites & Plots ─────────────────────────
  adminGetSites()                  { return this.get('/api/admin/sites', {}, true); }
  adminCreateSite(data: any)       { return this.post('/api/admin/sites', data, true); }
  adminUpdateSite(id: number, data: any) { return this.put(`/api/admin/sites/${id}`, data, true); }
  adminCreatePlot(data: any)       { return this.post('/api/admin/plots', data, true); }
  adminUpdatePlotStatus(id: number, new_status: string, reason = '') {
    return this.put(`/api/admin/plots/${id}/status`, { new_status, reason }, true);
  }

  // ── ADMIN — Commissions ───────────────────────────
  adminGetPendingComm()            { return this.get('/api/admin/commissions/pending', {}, true); }
  adminApproveComm(id: number, payment_reference = '') {
    return this.post(`/api/admin/commissions/${id}/approve`, { payment_reference }, true);
  }

  // ── ADMIN — Notifications ─────────────────────────
  adminSendNotif(data: any)        { return this.post('/api/admin/notifications/send', data, true); }
  adminBulkNotif(data: any)        { return this.post('/api/admin/notifications/bulk', data, true); }

  // ── ADMIN — Dashboard & Audit ─────────────────────
  adminDashboard()                 { return this.get('/api/admin/dashboard', {}, true); }
  adminAuditLog(q: any = {})       { return this.get('/api/admin/audit-log', q, true); }
}
