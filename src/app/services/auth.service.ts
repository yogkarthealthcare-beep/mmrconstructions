import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _adminUser$    = new BehaviorSubject<any>(this.getAdminUser());
  private _user$         = new BehaviorSubject<any>(this.getUser());
  private _investorUser$ = new BehaviorSubject<any>(this.getInvestorUser());

  adminUser$    = this._adminUser$.asObservable();
  user$         = this._user$.asObservable();
  investorUser$ = this._investorUser$.asObservable();

  constructor(private router: Router) {}

  // ── Admin ──────────────────────
  setAdminSession(data: any) {
    localStorage.setItem('mmr_admin_token', data.token);
    localStorage.setItem('mmr_admin_refresh', data.refresh_token);
    localStorage.setItem('mmr_admin_user', JSON.stringify(data.admin));
    this._adminUser$.next(data.admin);
  }
  getAdminUser(): any {
    const s = localStorage.getItem('mmr_admin_user');
    if (!s || s === 'undefined' || s === 'null') return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  get adminToken() {
    const t = localStorage.getItem('mmr_admin_token');
    return (t && t !== 'undefined' && t !== 'null') ? t : null;
  }
  isAdminLoggedIn() { return !!this.adminToken; }
  logoutAdmin() {
    ['mmr_admin_token','mmr_admin_refresh','mmr_admin_user'].forEach(k => localStorage.removeItem(k));
    this._adminUser$.next(null);
    this.router.navigate(['/admin-login']);
  }

  // ── User ──────────────────────
  setUserSession(data: any) {
    if (!data) return;
    const token = data.token || data.access_token || data.jwt || (typeof data === 'string' ? data : null);
    const refreshToken = data.refresh_token || data.refreshToken || '';
    const userObj = data.user || data.data?.user || (data.user_id ? data : null);

    if (token) {
      localStorage.setItem('mmr_user_token', token);
    }
    if (refreshToken) {
      localStorage.setItem('mmr_user_refresh', refreshToken);
    }
    if (userObj) {
      localStorage.setItem('mmr_user', JSON.stringify(userObj));
      this._user$.next(userObj);
    }
  }
  getUser(): any {
    const s = localStorage.getItem('mmr_user');
    if (!s || s === 'undefined' || s === 'null') return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  get userToken() {
    const t = localStorage.getItem('mmr_user_token');
    return (t && t !== 'undefined' && t !== 'null') ? t : null;
  }
  isUserLoggedIn() { return !!this.userToken; }
  logoutUser() {
    ['mmr_user_token','mmr_user_refresh','mmr_user'].forEach(k => localStorage.removeItem(k));
    this._user$.next(null);
    this.router.navigate(['/login']);
  }

  // ── Helpers ─────────────────────
  isAssociate(): boolean {
    const user = this.getUser();
    return user?.role === 'Associate' || user?.user_type === 'Associate' || user?.is_associate === true;
  }
  isApprovedUser(): boolean {
    const user = this.getUser();
    return user?.account_status === 'Active' || user?.account_status === 'Approved';
  }
  isInvestorLoggedIn(): boolean {
    return !!localStorage.getItem('mmr_investor_token');
  }
  getInvestorUser(): any {
    const s = localStorage.getItem('mmr_investor_user');
    if (!s || s === 'undefined' || s === 'null') return null;
    try { return JSON.parse(s); } catch { return null; }
  }
  logoutInvestor() {
    ['mmr_investor_token', 'mmr_investor_user'].forEach(k => localStorage.removeItem(k));
    this._investorUser$.next(null);
    this.router.navigate(['/login']);
  }
  setInvestorSession(tokenOrData: any, userObj?: any) {
    if (!tokenOrData) return;
    if (typeof tokenOrData === 'string') {
      localStorage.setItem('mmr_investor_token', tokenOrData);
      if (userObj) {
        localStorage.setItem('mmr_investor_user', JSON.stringify(userObj));
        this._investorUser$.next(userObj);
      }
    } else {
      if (tokenOrData.token) localStorage.setItem('mmr_investor_token', tokenOrData.token);
      const user = tokenOrData.user || tokenOrData.investor;
      if (user) {
        localStorage.setItem('mmr_investor_user', JSON.stringify(user));
        this._investorUser$.next(user);
      }
    }
  }
  updateInvestorUser(user: any) {
    if (user) {
      localStorage.setItem('mmr_investor_user', JSON.stringify(user));
      this._investorUser$.next(user);
    }
  }
  handleAuthExpired(_req?: any, _next?: any) {
    this.logoutUser();
    this.logoutAdmin();
  }
}
