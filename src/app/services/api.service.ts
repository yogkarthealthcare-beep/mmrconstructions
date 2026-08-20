import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export const BASE_URL = environment.apiBaseUrl || 'https://api.mmrconstructions.in';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private headers(admin = false): HttpHeaders {
    const getToken = (key: string) => {
      const v = localStorage.getItem(key);
      return (v && v !== 'undefined' && v !== 'null') ? v : null;
    };

    let token = admin
      ? getToken('mmr_admin_token')
      : (getToken('mmr_user_token') || getToken('mmr_investor_token'));

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
  delete(path: string, admin = false): Observable<any> {
    return this.http.delete(`${BASE_URL}${path}`, { headers: this.headers(admin) });
  }
  del(path: string, admin = false): Observable<any> {
    return this.delete(path, admin);
  }
  postForm(path: string, form: FormData, admin = false): Observable<any> {
    const token = admin
      ? localStorage.getItem('mmr_admin_token')
      : localStorage.getItem('mmr_user_token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.post(`${BASE_URL}${path}`, form, { headers });
  }
  putForm(path: string, form: FormData, admin = false): Observable<any> {
    const token = admin
      ? localStorage.getItem('mmr_admin_token')
      : localStorage.getItem('mmr_user_token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    return this.http.put(`${BASE_URL}${path}`, form, { headers });
  }

  // ── AUTH — User ──────────────────────────────────
  sendOtp(mobile_no: string, purpose = 'Login') {
    return this.post('/api/auth/send-otp', { mobile_no, purpose });
  }
  login(mobile_no: string, otp_code?: string, password?: string) {
    return this.post('/api/auth/login', { mobile_no, identifier: mobile_no, email: mobile_no, otp_code, password });
  }
  forgotPassword(identifier: string) {
    const isEmail = identifier.includes('@');
    const payload = isEmail ? { email: identifier } : { mobile_no: identifier };
    return this.post('/api/auth/forgot-password', payload);
  }
  resetPassword(identifier: string, otp_code: string, new_password: string) {
    const isEmail = identifier.includes('@');
    const payload = isEmail 
      ? { email: identifier, otp: otp_code, otp_code, new_password } 
      : { mobile_no: identifier, otp: otp_code, otp_code, new_password };
    return this.post('/api/auth/reset-password', payload);
  }
  clearOtpLogs() {
    return this.post('/api/auth/clear-otp-logs', {});
  }
  verifySponsorCode(code: string) {
    return this.get(`/api/auth/verify-sponsor/${encodeURIComponent(code)}`);
  }
  trackReferralCode(code: string) {
    return this.get(`/api/auth/referral/validate/${encodeURIComponent(code)}`);
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
  getCompanyDocuments()     { return this.get('/api/company-documents'); }
  url(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  }

  // ── Sites & Plots ─────────────────────────────────
  getHomeSliders()              { return this.get('/api/home-sliders'); }
  getSites()                    { return this.get('/api/sites'); }
  getSite(id: number)           { return this.get(`/api/sites/${id}`); }
  getSitePlots(id: number, q: any = {}) { return this.get(`/api/sites/${id}/plots`, q); }
  getPlot(id: number)           { return this.get(`/api/plots/${id}`); }
  getSiteDocuments(id: number)   { return this.get(`/api/sites/${id}/documents`); }
  getSiteMap(id: number)         { return this.get(`/api/sites/${id}/map`); }

  // ── Bookings ─────────────────────────────────────
  getBookings()                 { return this.get('/api/bookings'); }
  getBooking(id: number)        { return this.get(`/api/bookings/${id}`); }
  createBooking(data: any)      { return this.post('/api/bookings', data); }
  getBookingCompliance()        { return this.get('/api/booking/compliance'); }
  getBookingWorkflowConfig()    { return this.get('/api/booking/config'); }
  getBookingAppointmentSlots()  { return this.get('/api/booking/appointment-slots'); }
  initiatePlotBooking(data: any) { return this.post('/api/booking/initiate', data); }
  verifyOnlinePlotBooking(id: number, data: any) { return this.post(`/api/booking/${id}/online/verify`, data); }
  uploadBookingProof(id: number, form: FormData) {
    return this.postForm(`/api/bookings/${id}/upload-proof`, form);
  }

  // ── EMI ───────────────────────────────────────────
  getEmiCalculatorPlans()           { return this.get('/api/emi-calculator/plans'); }
  getEmis()                         { return this.get('/api/emi'); }
  getEmiSchedule(bookingId: number) { return this.get(`/api/emi/${bookingId}`); }
  uploadEmiProof(emiId: number, form: FormData) {
    return this.postForm(`/api/emi/${emiId}/upload-proof`, form);
  }
  getEmiVoucher(emiId: number)      { return this.get(`/api/emi/${emiId}/voucher`); }

  // ── Associate ─────────────────────────────────────
  getDashboardOverview()           { return this.get('/api/dashboard'); }
  getAssocDashboard()              { return this.get('/api/associate/dashboard'); }
  getAssocNetwork()                { return this.get('/api/associate/network'); }
  getAssocNetworkTree()            { return this.get('/api/associate/network/tree'); }
  getAssocCommissions(q: any = {}) { return this.get('/api/associate/commissions', q); }
  getInviteCode()                  { return this.get('/api/associate/invite-code'); }

  // ── Notifications ────────────────────────────────
  getNotifications(q: any = {})    { return this.get('/api/notifications', q); }
  markNotifRead(id: number)        { return this.patch(`/api/notifications/${id}/read`, {}); }
  markAllRead()                    { return this.patch('/api/notifications/read-all', {}); }

  // ── Buyback ───────────────────────────────────────
  getBuybackStatus()               { return this.get('/api/buyback/status'); }
  applyBuyback(booking_id: number) { return this.post('/api/buyback/apply', { booking_id }); }

  // ── ADMIN — Users & Customers ─────────────────────
  adminGetPendingUsers()           { return this.get('/api/admin/users/pending', {}, true); }
  adminGetUsers(q: any = {})       { return this.get('/api/admin/users', q, true); }
  adminGetUser(id: number)         { return this.get(`/api/admin/users/${id}`, {}, true); }
  adminGetCustomers(q: any = {})   { return this.get('/api/admin/customers', q, true); }
  adminCreateCustomer(data: any)   { return this.post('/api/admin/customers', data, true); }
  adminUpdateCustomer(id: number, data: any) { return this.put(`/api/admin/customers/${id}`, data, true); }
  adminGetAssociates(q: any = {})  { return this.get('/api/admin/associates', q, true); }
  adminCreateAssociate(data: any)  { return this.post('/api/admin/associates', data, true); }
  adminUpdateAssociate(id: number, data: any) { return this.put(`/api/admin/associates/${id}`, data, true); }
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
  adminGetBookingDetail(id: number) { return this.get(`/api/admin/bookings/${id}`, {}, true); }
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
  adminCreateSiteArea(data: any)   { return this.post('/api/admin/new-site-area', data, true); }
  adminUpdateSite(id: number, data: any) { return this.put(`/api/admin/sites/${id}`, data, true); }
  adminGetSitePlots(siteId: number) { return this.get(`/api/admin/sites/${siteId}/plots`, {}, true); }
  adminCreateSitePlot(siteId: number, data: any) { return this.post(`/api/admin/sites/${siteId}/plots`, data, true); }
  adminCreatePlot(data: any)       { return this.post('/api/admin/plots', data, true); }
  adminUpdatePlotStatus(id: number, new_status: string, reason = '') {
    return this.put(`/api/admin/plots/${id}/status`, { new_status, reason }, true);
  }

  // ── ADMIN — Commissions ───────────────────────────
  adminGetCommissions(q: any = {}) { return this.get('/api/admin/commissions', q, true); }
  adminGetPendingComm()            { return this.get('/api/admin/commissions/pending', {}, true); }
  adminApproveComm(id: number, payment_reference = '') {
    return this.post(`/api/admin/commissions/${id}/approve`, { payment_reference }, true);
  }
  adminRejectComm(id: number, reason: string) {
    return this.post(`/api/admin/commissions/${id}/reject`, { reason }, true);
  }

  // ── ADMIN — Notifications ─────────────────────────
  adminSendNotif(data: any)        { return this.post('/api/admin/notifications/send', data, true); }
  adminBulkNotif(data: any)        { return this.post('/api/admin/notifications/bulk', data, true); }

  // ── ADMIN — Database Backup & Recovery ───────────
  adminGetDatabaseBackupStatus()       { return this.get('/api/admin/database-backup/status', {}, true); }
  adminGetDatabaseBackupHistory()      { return this.get('/api/admin/database-backup/history', {}, true); }
  adminGetDatabaseRestoreUploads()     { return this.get('/api/admin/database-backup/restore-uploads', {}, true); }
  adminGetDatabaseRestoreHistory()     { return this.get('/api/admin/database-backup/restore-history', {}, true); }
  adminCreateDatabaseBackup()          { return this.post('/api/admin/database-backup/create', {}, true); }
  adminCreateAndDownloadDatabaseBackup() {
    return this.http.post(`${BASE_URL}/api/admin/database-backup/create-download`, {}, { headers: this.headers(true), responseType: 'blob', observe: 'response' });
  }
  adminDownloadDatabaseBackup(fileName: string) {
    return this.http.get(`${BASE_URL}/api/admin/database-backup/download/${fileName}`, { headers: this.headers(true), responseType: 'blob' });
  }
  adminDownloadDatabaseBackupUrl(fileName: string) { return `${BASE_URL}/api/admin/database-backup/download/${fileName}`; }
  adminDeleteDatabaseBackup(id: any)  { return this.delete(`/api/admin/database-backup/${id}`, true); }
  adminRestoreDatabaseBackup(fileName: string) { return this.post(`/api/admin/database-backup/restore/${fileName}`, {}, true); }
  adminUploadDatabaseRestoreFile(formData: FormData) { return this.postForm('/api/admin/database-backup/restore-upload', formData, true); }
  adminRestoreUploadedDatabaseBackup(uploadId: number, restore_mode: string) { return this.post(`/api/admin/database-backup/restore-upload/${uploadId}`, { restore_mode }, true); }
  adminUpdateDatabaseBackupSettings(payload: any) { return this.put('/api/admin/database-backup/settings', payload, true); }

  // ── ADMIN — Home Sliders & Settings ───────────────
  adminGetHomePageSettings()                    { return this.get('/api/admin/home-page/settings', {}, true); }
  adminUpdateHomePageSettings(data: any)         { return this.put('/api/admin/home-page/settings', data, true); }
  adminGetHomeSliders()                         { return this.get('/api/admin/home-sliders', {}, true); }
  adminGetHomeSlider(id: number)                { return this.get(`/api/admin/home-sliders/${id}`, {}, true); }
  adminCreateHomeSlider(formData: FormData)     { return this.postForm('/api/admin/home-sliders', formData, true); }
  adminBulkCreateHomeSliders(formData: FormData){ return this.postForm('/api/admin/home-sliders/bulk', formData, true); }
  adminUpdateHomeSlider(id: number, formData: FormData) { return this.putForm(`/api/admin/home-sliders/${id}`, formData, true); }
  adminDeleteHomeSlider(id: number)             { return this.delete(`/api/admin/home-sliders/${id}`, true); }

  // ── PUBLIC & SECTIONS ─────────────────────────────
  getHomePageSettings()                        { return this.get('/api/home-page/settings'); }
  getInvestors()                   { return this.get('/api/investors'); }

  // ── ADMIN — Analytics ─────────────────────────────
  getAdminAnalytics(params: any = {}) { return this.get('/api/admin/analytics', params, true); }
  exportAdminAnalyticsBlob(preset: string) {
    return this.http.get(`${BASE_URL}/api/admin/analytics/export?preset=${preset}`, { headers: this.headers(true), responseType: 'blob' });
  }

  // ── ADMIN — Dashboard & Audit ─────────────────────
  adminDashboard()                 { return this.get('/api/admin/dashboard', {}, true); }
  adminAuditLog(q: any = {})       { return this.get('/api/admin/audit-log', q, true); }

  // ── Missing Admin & Helper API Methods ─────────────────────
  adminChangePassword(data: any) { return this.post('/api/admin/auth/change-password', data, true); }

  // Commission Engine
  adminGetCommissionEngineSettings() { return this.get('/api/admin/commission-settings', {}, true); }
  adminGetCommissionEngineAudit(params: any = {}) { return this.get('/api/admin/commission-settings/audit', params, true); }
  adminUpdateCommissionEngineSettings(data: any) { return this.put('/api/admin/commission-settings', data, true); }
  getCommissionEngineSummary() { return this.get('/api/commission-engine/summary'); }

  // Company Documents (Admin)
  adminGetCompanyDocuments() { return this.get('/api/admin/company-documents', {}, true); }
  adminUpdateCompanyDocument(id: number, data: any) { return this.putForm(`/api/admin/company-documents/${id}`, data, true); }
  adminCreateCompanyDocument(data: any) { return this.postForm('/api/admin/company-documents', data, true); }
  adminDeleteCompanyDocument(id: number) { return this.delete(`/api/admin/company-documents/${id}`, true); }

  // EMI Calculator Mgmt (Admin)
  adminGetEmiCalculatorPlans(params: any = {}) { return this.get('/api/admin/emi-calculator/plans', params, true); }
  adminUpdateEmiCalculatorPlan(id: number, data: any) { return this.put(`/api/admin/emi-calculator/plans/${id}`, data, true); }
  adminCreateEmiCalculatorPlan(data: any) { return this.post('/api/admin/emi-calculator/plans', data, true); }
  adminDeleteEmiCalculatorPlan(id: number) { return this.delete(`/api/admin/emi-calculator/plans/${id}`, true); }

  // Investor Portal & Management (Admin)
  adminGetInvestorsPortal(params: any = {}) { return this.get('/api/admin/investors/portal', params, true); }
  adminGetInvestorPortalDeposits() { return this.get('/api/admin/investors/deposits', {}, true); }
  adminGetInvestorPortalWithdrawals() { return this.get('/api/admin/investors/withdrawals', {}, true); }
  adminGetInvestorPortalTransactions() { return this.get('/api/admin/investors/transactions', {}, true); }
  adminUpdateInvestorPortalDepositStatus(id: number, data: any) { return this.put(`/api/admin/investors/deposits/${id}`, data, true); }
  adminUpdateInvestorPortalWithdrawalStatus(id: number, data: any) { return this.put(`/api/admin/investors/withdrawals/${id}`, data, true); }
  adminUpdateInvestorPortalStatus(id: number, data: any) { return this.put(`/api/admin/investors/${id}/status`, data, true); }
  adminLoginAsUser(id: number, role: string) { return this.post('/api/admin/auth/impersonate', { user_id: id, role }, true); }
  adminGetInvestors() { return this.get('/api/admin/investors', {}, true); }
  adminUpdateInvestor(id: number, data: any) { return this.putForm(`/api/admin/investors/${id}`, data, true); }
  adminCreateInvestor(data: any) { return this.postForm('/api/admin/investors', data, true); }
  adminSetInvestorStatus(id: number, status: boolean) { return this.patch(`/api/admin/investors/${id}/status`, { is_active: status }, true); }
  adminDeleteInvestor(id: number) { return this.delete(`/api/admin/investors/${id}`, true); }

  // MLM Pages & Ranks (Admin)
  adminGetCommissionRules() { return this.get('/api/admin/mlm/commission-rules', {}, true); }
  adminGetRanks() { return this.get('/api/admin/mlm/ranks', {}, true); }
  adminGetPayoutRequests(params: any = {}) { return this.get('/api/admin/mlm/payout-requests', params, true); }
  adminGetMlmReports() { return this.get('/api/admin/mlm/reports', {}, true); }
  adminUpdateRank(id: number, data: any) { return this.put(`/api/admin/mlm/ranks/${id}`, data, true); }
  adminCreateRank(data: any) { return this.post('/api/admin/mlm/ranks', data, true); }
  adminUpdateCommissionRule(id: number, data: any) { return this.put(`/api/admin/mlm/commission-rules/${id}`, data, true); }
  adminCreateCommissionRule(data: any) { return this.post('/api/admin/mlm/commission-rules', data, true); }
  adminAdjustComm(id: number, amount: number, note = '') { return this.post(`/api/admin/commissions/${id}/adjust`, { amount, note }, true); }
  adminProcessPayout(id: number, action: string, data: any) { return this.post(`/api/admin/mlm/payout-requests/${id}/${action}`, data, true); }

  // Mobile App Settings (Admin & Public)
  adminGetMobileAppSettings() { return this.get('/api/admin/mobile-app/settings', {}, true); }
  adminUploadMobileAppLogo(data: FormData) { return this.postForm('/api/admin/mobile-app/logo', data, true); }
  adminUploadMobileAppApk(data: FormData) { return this.postForm('/api/admin/mobile-app/apk', data, true); }
  adminDeleteMobileAppLogo() { return this.delete('/api/admin/mobile-app/logo', true); }
  adminUpdateMobileAppSettings(data: any) { return this.put('/api/admin/mobile-app/settings', data, true); }
  adminToggleMobileAppVisibility(enabled: boolean) { return this.patch('/api/admin/mobile-app/visibility', { is_enabled: enabled }, true); }
  getMobileAppInfo() { return this.get('/api/mobile-app/info'); }

  // Orders Management & Utility
  getBlob(path: string) { return this.http.get(this.url(path), { headers: this.headers(), responseType: 'blob' }); }
  adminDeleteOrder(invNum: string) { return this.delete(`/api/admin/orders/${invNum}`, true); }

  // Plot Map & Detector (Admin)
  adminUpdatePlot(id: number, data: any) { return this.put(`/api/admin/plots/${id}`, data, true); }
  adminUploadSiteMap(siteId: number, form: FormData) { return this.postForm(`/api/admin/sites/${siteId}/map`, form, true); }
  adminSavePlotPolygon(plotId: number, data: any) { return this.put(`/api/admin/plots/${plotId}/polygon`, data, true); }
  adminUpdatePlotDetails(plotId: number, data: any) { return this.put(`/api/admin/plots/${plotId}/details`, data, true); }
  adminDeletePlot(id: number) { return this.delete(`/api/admin/plots/${id}`, true); }
  adminPlotImportTemplateUrl(siteId: number) { return `${BASE_URL}/api/admin/sites/${siteId}/plots/import-template`; }
  adminImportPlotDetails(siteId: number, form: FormData) { return this.postForm(`/api/admin/sites/${siteId}/plots/import`, form, true); }
  adminDetectPlots(siteId: number, data: any = {}) { return this.post(`/api/admin/sites/${siteId}/detect-plots`, data, true); }
  adminSaveDetectedPlots(siteId: number, data: any) { return this.post(`/api/admin/sites/${siteId}/detected-plots`, data, true); }

  // General Settings & Email Config (Admin)
  getEmailConfig() { return this.get('/api/admin/settings/email', {}, true); }
  saveEmailConfig(cfg: any) { return this.post('/api/admin/settings/email', cfg, true); }
  testEmail(email: string) { return this.post('/api/admin/settings/test-email', { email }, true); }
  getRegistrationToggle() { return this.get('/api/admin/settings/registration-toggle', {}, true); }
  setRegistrationToggle(enabled: boolean) { return this.post('/api/admin/settings/registration-toggle', { enabled }, true); }

  // Wallet & Withdrawals (Admin)
  adminGetWalletTransactions(params: any = {}) { return this.get('/api/admin/wallet/transactions', params, true); }
  adminGetWithdrawalRequests(params: any = {}) { return this.get('/api/admin/withdrawal-requests', params, true); }
  adminApproveWithdrawalRequest(id: number, data: any = {}) { return this.patch(`/api/admin/withdrawal-requests/${id}/approve`, typeof data === 'string' ? { remarks: data } : data, true); }
  adminReleaseWithdrawalRequest(id: number, refOrData?: any, remarks?: any) { return this.patch(`/api/admin/withdrawal-requests/${id}/release`, typeof refOrData === 'object' ? refOrData : { payout_reference_id: refOrData, remarks }, true); }
  adminRejectWithdrawalRequest(id: number | string, reasonOrBody: any) { return this.patch(`/api/admin/withdrawal-requests/${id}/reject`, typeof reasonOrBody === 'string' ? { rejection_reason: reasonOrBody } : reasonOrBody, true); }

  // WhatsApp Automation (Admin)
  adminWhatsappDashboard() { return this.get('/api/admin/whatsapp/dashboard', {}, true); }
  adminWhatsappSettings() { return this.get('/api/admin/whatsapp/settings', {}, true); }
  adminWhatsappTemplates() { return this.get('/api/admin/whatsapp/templates', {}, true); }
  adminWhatsappQueue() { return this.get('/api/admin/whatsapp/queue', {}, true); }
  adminWhatsappLogs() { return this.get('/api/admin/whatsapp/logs', {}, true); }
  adminSaveWhatsappSettings(data: any) { return this.put('/api/admin/whatsapp/settings', data, true); }
  adminUpdateWhatsappTemplate(id: number, data: any) { return this.put(`/api/admin/whatsapp/templates/${id}`, data, true); }
  adminToggleWhatsappTemplate(id: number, active: boolean) { return this.patch(`/api/admin/whatsapp/templates/${id}/status`, { is_active: active }, true); }
  adminSendWhatsappTest(data: any) { return this.post('/api/admin/whatsapp/test-message', data, true); }
  adminProcessWhatsappQueue(batch: number) { return this.post('/api/admin/whatsapp/queue/process', { batch_size: batch }, true); }

  // ── Investor Portal (User Side) ───────────────────────────
  deleteInvestorDocument(id: number) { return this.delete(`/api/investor/documents/${id}`); }
  investorDocumentUrl(id: any) { return `${BASE_URL}/api/investor/documents/${id}`; }
  investorForgotPassword(emailOrData: any) { return this.post('/api/investor/auth/forgot-password', typeof emailOrData === 'string' ? { email: emailOrData } : emailOrData); }
  investorResetPassword(data: any) { return this.post('/api/investor/auth/reset-password', data); }
  verifyInvestorEmail(token: string) { return this.post('/api/investor/auth/verify-email', { token }); }
  investorLogin(emailOrData: any, password?: string) { return typeof emailOrData === 'object' ? this.post('/api/investor/auth/login', emailOrData) : this.post('/api/investor/auth/login', { email: emailOrData, password }); }
  getInvestorDashboard() { return this.get('/api/investor/dashboard'); }
  getInvestorDeposits() { return this.get('/api/investor/deposits'); }
  submitInvestorDepositForm(data: FormData) { return this.postForm('/api/investor/deposit', data); }
  getInvestorDocuments() { return this.get('/api/investor/documents'); }
  uploadInvestorDocument(data: FormData) { return this.postForm('/api/investor/documents', data); }
  getInvestorNotifications() { return this.get('/api/investor/notifications'); }
  markInvestorNotificationRead(id: number) { return this.patch(`/api/investor/notifications/${id}/read`, {}); }
  getInvestorPayments(params: any = {}) { return this.get('/api/investor/payments', params); }
  uploadInvestorProfilePhoto(data: FormData) { return this.postForm('/api/investor/profile/photo', data); }
  getInvestorProfile() { return this.get('/api/investor/profile'); }
  updateInvestorProfile(data: any) { return this.put('/api/investor/profile', data); }
  updateInvestorBankDetails(data: any) { return this.put('/api/investor/profile/bank', data); }
  changeInvestorPassword(data: any) { return this.post('/api/investor/profile/change-password', data); }
  getInvestorSettlementPreference() { return this.get('/api/investor/settlement'); }
  setInvestorSettlementPreference(pref: string) { return this.post('/api/investor/settlement', { preference: pref }); }
  requestInvestorSettlementChange(data: any) { return this.post('/api/investor/settlement/request', data); }
  investorSignup(data: any) { return this.post('/api/investor/auth/signup', data); }
  getInvestorWallet() { return this.get('/api/investor/wallet'); }
  getInvestorWithdrawals() { return this.get('/api/investor/withdrawals'); }
  submitInvestorWithdrawal(data: any) { return this.post('/api/investor/withdrawals', data); }

  // ── Additional Admin Methods ─────────────────────────────
  adminGetAssociate(id: number) { return this.get(`/api/admin/associates/${id}`, {}, true); }
  adminGetBookPlotLeads(params: any = {}) { return this.get('/api/book-plot/leads', params, true); }
  adminUpdateBookPlotLeadStatus(id: number, status: string) { return this.patch(`/api/book-plot/leads/${id}/status`, { status }, true); }
  adminBookPlotLeadsExportUrl(params?: any) { return params ? `${BASE_URL}/api/book-plot/leads/export?${new URLSearchParams(params).toString()}` : `${BASE_URL}/api/book-plot/leads/export`; }
  adminGetBooking(id: number) { return this.get(`/api/admin/bookings/${id}`, {}, true); }
  adminApproveOfflineBooking(id: number, data?: any) { return this.post(`/api/admin/bookings/${id}/approve-offline`, data || {}, true); }
  adminRejectOfflineBooking(id: number, reasonOrData: any) { return this.post(`/api/admin/bookings/${id}/reject-offline`, typeof reasonOrData === 'string' ? { reason: reasonOrData } : reasonOrData, true); }
  adminRescheduleAppointment(id: number, data: any) { return this.post(`/api/admin/bookings/${id}/reschedule`, data, true); }
  adminApprovePartialPaymentCommission(id: number, data?: any) { return this.post(`/api/admin/bookings/${id}/approve-partial-commission`, data || {}, true); }
  adminGetBookingWorkflowSettings() { return this.get('/api/admin/booking/workflow-config', {}, true); }
  adminGetKyc(params: any = {}) { return this.get('/api/admin/kyc', params, true); }
  adminGetWorkflowAlerts() { return this.get('/api/admin/booking/workflow-alerts', {}, true); }
  adminUpdateBookingWorkflowSettings(data: any) { return this.put('/api/admin/booking/workflow-config', data, true); }
  adminUpdateKyc(id: number, statusOrData: any, note = '') { return this.put(`/api/admin/kyc/${id}`, typeof statusOrData === 'object' ? statusOrData : { status: statusOrData, note }, true); }
  adminGetBuybackTerms() { return this.get('/api/admin/buyback-terms', {}, true); }
  adminUpdateBuybackTerms(data: any) { return this.put('/api/admin/buyback-terms', data, true); }
  adminGetWithdrawalRequestDetail(id: any) { return this.get(`/api/admin/withdrawal-requests/${id}`, {}, true); }
  adminFailWithdrawalRequest(id: number, reason: string) { return this.patch(`/api/admin/withdrawal-requests/${id}/failed`, { reason }, true); }

  // ── User Wallet & MLM (User Side) ─────────────────────────
  getBuybackTerms() { return this.get('/api/buyback/terms'); }
  getBookPlotBackgrounds() { return this.get('/api/book-plot/backgrounds'); }
  createBookPlotLead(data: any) { return this.post('/api/book-plot/leads', data); }
  adminGetMlmNetwork() { return this.get('/api/admin/mlm/network', {}, true); }
  changePassword(data: any) { return this.post('/api/user/change-password', data); }
  initiateAddFund(amountOrPayload: any, gatewayName?: string) {
    const payload = (typeof amountOrPayload === 'object' && amountOrPayload !== null)
      ? amountOrPayload
      : { amount: Number(amountOrPayload), gateway_name: gatewayName };
    return this.post('/api/wallet/add-fund/initiate', payload);
  }
  verifyAddFund(data: any) { return this.post('/api/wallet/add-fund/verify', data); }
  cancelAddFund(orderIdOrPayload: any) {
    const payload = (typeof orderIdOrPayload === 'object' && orderIdOrPayload !== null)
      ? orderIdOrPayload
      : { order_id: orderIdOrPayload };
    return this.post('/api/wallet/add-fund/cancel', payload);
  }
  getWalletTransactions(params: any = {}) { return this.get('/api/wallet/transactions', params); }
  getWalletBalance(params: any = {}) { return this.get('/api/wallet/balance', params); }
  requestWithdrawal(data: any) { return this.post('/api/wallet/withdraw-request', data); }
  getWithdrawalRequests(params: any = {}) { return this.get('/api/wallet/withdraw-requests', params); }
}
