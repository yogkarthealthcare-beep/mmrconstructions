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

  private isLoggingOut = false;

  private saveAuthItem(key: string, value: string | null) {
    try {
      if (value == null) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.setItem(key, value);
      }
    } catch {}
  }

  private getAuthItem(key: string): string | null {
    try {
      const v = sessionStorage.getItem(key) || localStorage.getItem(key);
      return (v && v !== 'undefined' && v !== 'null') ? v : null;
    } catch {
      return null;
    }
  }

  // ── Admin ──────────────────────
  clearAllAuthStorage() {
    const keys = [
      'mmr_admin_token', 'mmr_admin_refresh', 'mmr_admin_user',
      'mmr_user_token', 'mmr_user_refresh', 'mmr_user',
      'mmr_investor_token', 'mmr_investor_user'
    ];
    keys.forEach(k => this.saveAuthItem(k, null));
  }

  setAdminSession(data: any) {
    if (!data) return;
    this.clearAllAuthStorage();
    if (data.token) this.saveAuthItem('mmr_admin_token', data.token);
    if (data.refresh_token) this.saveAuthItem('mmr_admin_refresh', data.refresh_token);
    if (data.admin) this.saveAuthItem('mmr_admin_user', JSON.stringify(data.admin));
    this._adminUser$.next(data.admin || null);
  }

  getAdminUser(): any {
    const s = this.getAuthItem('mmr_admin_user');
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  get adminToken() {
    return this.getAuthItem('mmr_admin_token');
  }

  isAdminLoggedIn() { return !!this.adminToken; }

  logoutAdmin() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    ['mmr_admin_token','mmr_admin_refresh','mmr_admin_user'].forEach(k => this.saveAuthItem(k, null));
    this._adminUser$.next(null);
    this.router.navigate(['/admin-login']).then(() => {
      this.isLoggingOut = false;
    });
  }

  // ── User ──────────────────────
  setUserSession(data: any) {
    if (!data) return;
    this.clearAllAuthStorage();
    const token = data.token || data.access_token || data.jwt || (typeof data === 'string' ? data : null);
    const refreshToken = data.refresh_token || data.refreshToken || '';
    const userObj = data.user || data.data?.user || (data.user_id ? data : null);

    if (token) {
      this.saveAuthItem('mmr_user_token', token);
    }
    if (refreshToken) {
      this.saveAuthItem('mmr_user_refresh', refreshToken);
    }
    if (userObj) {
      this.saveAuthItem('mmr_user', JSON.stringify(userObj));
      this._user$.next(userObj);
    }
  }

  getUser(): any {
    const s = this.getAuthItem('mmr_user');
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  get userToken() {
    return this.getAuthItem('mmr_user_token');
  }

  isUserLoggedIn() { return !!this.userToken; }

  logoutUser() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    ['mmr_user_token','mmr_user_refresh','mmr_user'].forEach(k => this.saveAuthItem(k, null));
    this._user$.next(null);
    this.router.navigate(['/login']).then(() => {
      this.isLoggingOut = false;
    });
  }

  // ── Helpers ─────────────────────
  isAssociate(): boolean {
    const user = this.getUser();
    return user?.role === 'Associate' || user?.user_type === 'Associate' || user?.is_associate === true;
  }

  isApprovedUser(): boolean {
    const user = this.getUser();
    if (!user) return false;
    const status = String(user.account_status || user.status || 'Active').toLowerCase();
    return status === 'active' || status === 'approved';
  }

  isInvestorLoggedIn(): boolean {
    return !!this.getAuthItem('mmr_investor_token');
  }

  getInvestorUser(): any {
    const s = this.getAuthItem('mmr_investor_user');
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }

  logoutInvestor() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    ['mmr_investor_token', 'mmr_investor_user'].forEach(k => this.saveAuthItem(k, null));
    this._investorUser$.next(null);
    this.router.navigate(['/login']).then(() => {
      this.isLoggingOut = false;
    });
  }

  setInvestorSession(tokenOrData: any, userObj?: any) {
    if (!tokenOrData) return;
    this.clearAllAuthStorage();
    if (typeof tokenOrData === 'string') {
      this.saveAuthItem('mmr_investor_token', tokenOrData);
      if (userObj) {
        this.saveAuthItem('mmr_investor_user', JSON.stringify(userObj));
        this._investorUser$.next(userObj);
      }
    } else {
      if (tokenOrData.token) this.saveAuthItem('mmr_investor_token', tokenOrData.token);
      const user = tokenOrData.user || tokenOrData.investor || userObj;
      if (user) {
        this.saveAuthItem('mmr_investor_user', JSON.stringify(user));
        this._investorUser$.next(user);
      }
    }
  }

  updateInvestorUser(user: any) {
    if (user) {
      this.saveAuthItem('mmr_investor_user', JSON.stringify(user));
      this._investorUser$.next(user);
    }
  }

  handleAuthExpired(scope?: string, _url?: string) {
    if (scope === 'admin') {
      this.logoutAdmin();
    } else {
      this.logoutUser();
      this.logoutInvestor();
    }
  }
}
