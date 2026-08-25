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
  clearAllAuthStorage() {
    const keys = [
      'mmr_admin_token', 'mmr_admin_refresh', 'mmr_admin_user',
      'mmr_user_token', 'mmr_user_refresh', 'mmr_user',
      'mmr_investor_token', 'mmr_investor_user'
    ];
    keys.forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
  }

  setAdminSession(data: any) {
    this.clearAllAuthStorage();
    sessionStorage.setItem('mmr_admin_token', data.token);
    sessionStorage.setItem('mmr_admin_refresh', data.refresh_token);
    sessionStorage.setItem('mmr_admin_user', JSON.stringify(data.admin));
    this._adminUser$.next(data.admin);
  }
  getAdminUser(): any {
    const s = sessionStorage.getItem('mmr_admin_user');
    if (!s || s === 'undefined' || s === 'null') return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  get adminToken() {
    const t = sessionStorage.getItem('mmr_admin_token');
    return (t && t !== 'undefined' && t !== 'null') ? t : null;
  }
  isAdminLoggedIn() { return !!this.adminToken; }
  logoutAdmin() {
    ['mmr_admin_token','mmr_admin_refresh','mmr_admin_user'].forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
    this._adminUser$.next(null);
    this.router.navigate(['/admin-login']);
  }

  // ── User ──────────────────────
  setUserSession(data: any) {
    if (!data) return;
    this.clearAllAuthStorage();
    const token = data.token || data.access_token || data.jwt || (typeof data === 'string' ? data : null);
    const refreshToken = data.refresh_token || data.refreshToken || '';
    const userObj = data.user || data.data?.user || (data.user_id ? data : null);

    if (token) {
      sessionStorage.setItem('mmr_user_token', token);
    }
    if (refreshToken) {
      sessionStorage.setItem('mmr_user_refresh', refreshToken);
    }
    if (userObj) {
      sessionStorage.setItem('mmr_user', JSON.stringify(userObj));
      this._user$.next(userObj);
    }
  }
  getUser(): any {
    const s = sessionStorage.getItem('mmr_user');
    if (!s || s === 'undefined' || s === 'null') return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  get userToken() {
    const t = sessionStorage.getItem('mmr_user_token');
    return (t && t !== 'undefined' && t !== 'null') ? t : null;
  }
  isUserLoggedIn() { return !!this.userToken; }
  logoutUser() {
    ['mmr_user_token','mmr_user_refresh','mmr_user'].forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
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
    return !!sessionStorage.getItem('mmr_investor_token');
  }
  getInvestorUser(): any {
    const s = sessionStorage.getItem('mmr_investor_user');
    if (!s || s === 'undefined' || s === 'null') return null;
    try { return JSON.parse(s); } catch { return null; }
  }
  logoutInvestor() {
    ['mmr_investor_token', 'mmr_investor_user'].forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
    this._investorUser$.next(null);
    this.router.navigate(['/login']);
  }
  setInvestorSession(tokenOrData: any, userObj?: any) {
    if (!tokenOrData) return;
    this.clearAllAuthStorage();
    if (typeof tokenOrData === 'string') {
      sessionStorage.setItem('mmr_investor_token', tokenOrData);
      if (userObj) {
        sessionStorage.setItem('mmr_investor_user', JSON.stringify(userObj));
        this._investorUser$.next(userObj);
      }
    } else {
      if (tokenOrData.token) sessionStorage.setItem('mmr_investor_token', tokenOrData.token);
      const user = tokenOrData.user || tokenOrData.investor;
      if (user) {
        sessionStorage.setItem('mmr_investor_user', JSON.stringify(user));
        this._investorUser$.next(user);
      }
    }
  }
  updateInvestorUser(user: any) {
    if (user) {
      sessionStorage.setItem('mmr_investor_user', JSON.stringify(user));
      this._investorUser$.next(user);
    }
  }
  handleAuthExpired(scope?: string, url?: string) {
    if (scope === 'admin') {
      this.logoutAdmin();
    } else {
      this.logoutUser();
      this.logoutInvestor();
    }
  }
}
