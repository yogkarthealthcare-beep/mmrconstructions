import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly DEFAULT_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days (2,592,000,000 ms)

  private _adminUser$    = new BehaviorSubject<any>(this.getAdminUser());
  private _user$         = new BehaviorSubject<any>(this.getUser());
  private _investorUser$ = new BehaviorSubject<any>(this.getInvestorUser());

  adminUser$    = this._adminUser$.asObservable();
  user$         = this._user$.asObservable();
  investorUser$ = this._investorUser$.asObservable();

  private isLoggingOut = false;
  private autoLogoutTimer: any = null;

  constructor(private router: Router) {
    this.checkInitialExpirations();
    this.scheduleAutoLogout();
    this.setupVisibilityListeners();
  }

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

  // ── JWT Helper & Expiration Decoder ──────────────────────────────
  parseJwtExp(token: string | null): number | null {
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      if (typeof parsed?.exp === 'number') {
        return parsed.exp * 1000; // convert seconds to milliseconds
      }
      return null;
    } catch {
      return null;
    }
  }

  private calculateExpiresAt(token: string | null, defaultDurationMs = this.DEFAULT_SESSION_DURATION_MS): number {
    const jwtExp = this.parseJwtExp(token);
    if (jwtExp && jwtExp > Date.now()) {
      return jwtExp;
    }
    return Date.now() + defaultDurationMs;
  }

  isTokenExpired(scope: 'admin' | 'user' | 'investor', token?: string | null): boolean {
    const t = token !== undefined ? token : (
      scope === 'admin' ? this.adminToken : (scope === 'investor' ? this.getAuthItem('mmr_investor_token') : this.userToken)
    );
    if (!t) return true;

    const now = Date.now();

    // 1. Check JWT exp claim directly
    const jwtExp = this.parseJwtExp(t);
    if (jwtExp && now >= jwtExp) {
      return true;
    }

    // 2. Check stored timestamp fallback
    const expKey = scope === 'admin' ? 'mmr_admin_expires_at' : (scope === 'investor' ? 'mmr_investor_expires_at' : 'mmr_user_expires_at');
    const storedExpStr = this.getAuthItem(expKey);
    if (storedExpStr) {
      const storedExp = Number(storedExpStr);
      if (!isNaN(storedExp) && storedExp > 0 && now >= storedExp) {
        return true;
      }
    }

    return false;
  }

  private getExpirationMs(scope: 'admin' | 'user' | 'investor'): number | null {
    const token = scope === 'admin' ? this.adminToken : (scope === 'investor' ? this.getAuthItem('mmr_investor_token') : this.userToken);
    if (!token) return null;
    const jwtExp = this.parseJwtExp(token);
    if (jwtExp) return jwtExp;
    const expKey = scope === 'admin' ? 'mmr_admin_expires_at' : (scope === 'investor' ? 'mmr_investor_expires_at' : 'mmr_user_expires_at');
    const stored = this.getAuthItem(expKey);
    return stored ? Number(stored) : null;
  }

  private scheduleAutoLogout() {
    if (this.autoLogoutTimer) {
      clearTimeout(this.autoLogoutTimer);
      this.autoLogoutTimer = null;
    }

    const now = Date.now();
    let activeScope: 'admin' | 'investor' | 'user' | null = null;
    let activeExp: number | null = null;

    if (this.adminToken) {
      activeScope = 'admin';
      activeExp = this.getExpirationMs('admin');
    } else if (this.getAuthItem('mmr_investor_token')) {
      activeScope = 'investor';
      activeExp = this.getExpirationMs('investor');
    } else if (this.userToken) {
      activeScope = 'user';
      activeExp = this.getExpirationMs('user');
    }

    if (!activeScope || !activeExp || activeExp <= 0) return;

    const delay = activeExp - now;
    if (delay <= 0) {
      this.handleAuthExpired(activeScope);
      return;
    }

    // Protect from 32-bit setTimeout integer limit (2,147,483,647 ms)
    const timeoutDelay = Math.min(delay, 2147483647);
    this.autoLogoutTimer = setTimeout(() => {
      // When timer fires, check again if real expiration has arrived
      if (Date.now() >= activeExp!) {
        this.handleAuthExpired(activeScope!);
      } else {
        this.scheduleAutoLogout();
      }
    }, timeoutDelay);
  }

  private checkInitialExpirations() {
    if (this.adminToken && this.isTokenExpired('admin')) {
      this.logoutAdmin(true);
    } else if (this.getAuthItem('mmr_investor_token') && this.isTokenExpired('investor')) {
      this.logoutInvestor(true);
    } else if (this.userToken && this.isTokenExpired('user')) {
      this.logoutUser(true);
    }
  }

  private setupVisibilityListeners() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkInitialExpirations();
          this.scheduleAutoLogout();
        }
      });
      window.addEventListener('focus', () => {
        this.checkInitialExpirations();
        this.scheduleAutoLogout();
      });
    }
  }

  // ── Admin ──────────────────────
  clearAllAuthStorage() {
    const keys = [
      'mmr_admin_token', 'mmr_admin_refresh', 'mmr_admin_user', 'mmr_admin_expires_at',
      'mmr_user_token', 'mmr_user_refresh', 'mmr_user', 'mmr_user_expires_at',
      'mmr_investor_token', 'mmr_investor_refresh', 'mmr_investor_user', 'mmr_investor_expires_at'
    ];
    keys.forEach(k => this.saveAuthItem(k, null));
  }

  setAdminSession(data: any) {
    if (!data) return;
    this.clearAllAuthStorage();
    if (data.token) {
      this.saveAuthItem('mmr_admin_token', data.token);
      const expiresAt = this.calculateExpiresAt(data.token, 30 * 24 * 60 * 60 * 1000); // 30d default for admin
      this.saveAuthItem('mmr_admin_expires_at', String(expiresAt));
    }
    if (data.refresh_token) this.saveAuthItem('mmr_admin_refresh', data.refresh_token);
    if (data.admin) this.saveAuthItem('mmr_admin_user', JSON.stringify(data.admin));
    this._adminUser$.next(data.admin || null);
    this.scheduleAutoLogout();
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

  isAdminLoggedIn() {
    const token = this.adminToken;
    if (!token) return false;
    if (this.isTokenExpired('admin', token)) {
      this.logoutAdmin(true);
      return false;
    }
    return true;
  }

  logoutAdmin(sessionExpired = false) {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    ['mmr_admin_token','mmr_admin_refresh','mmr_admin_user','mmr_admin_expires_at'].forEach(k => this.saveAuthItem(k, null));
    this._adminUser$.next(null);
    this.scheduleAutoLogout();
    const queryParams = sessionExpired ? { sessionExpired: 'true' } : undefined;
    this.router.navigate(['/admin-login'], { queryParams }).then(() => {
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
      const expiresAt = this.calculateExpiresAt(token);
      this.saveAuthItem('mmr_user_expires_at', String(expiresAt));
    }
    if (refreshToken) {
      this.saveAuthItem('mmr_user_refresh', refreshToken);
    }
    if (userObj) {
      this.saveAuthItem('mmr_user', JSON.stringify(userObj));
      this._user$.next(userObj);
    }
    this.scheduleAutoLogout();
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

  isUserLoggedIn(): boolean {
    const token = this.userToken;
    if (!token) return false;
    if (this.isTokenExpired('user', token)) {
      this.logoutUser(true);
      return false;
    }
    return true;
  }

  logoutUser(sessionExpired = false) {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    ['mmr_user_token','mmr_user_refresh','mmr_user','mmr_user_expires_at'].forEach(k => this.saveAuthItem(k, null));
    this._user$.next(null);
    this.scheduleAutoLogout();
    const queryParams = sessionExpired ? { sessionExpired: 'true' } : undefined;
    this.router.navigate(['/login'], { queryParams }).then(() => {
      this.isLoggingOut = false;
    });
  }

  // ── Helpers ─────────────────────
  isAssociate(): boolean {
    const user = this.getUser();
    if (!user) return false;
    const type = String(user.user_type || user.role || '').toLowerCase().trim();
    return type === 'associate' || type.includes('associate') || user.is_associate === true;
  }

  isApprovedUser(): boolean {
    const user = this.getUser();
    if (!user) return false;
    const status = String(user.account_status || user.status || 'Active').toLowerCase().trim();
    return status === 'active' || status === 'approved';
  }

  isInvestorLoggedIn(): boolean {
    const token = this.getAuthItem('mmr_investor_token');
    if (!token) return false;
    if (this.isTokenExpired('investor', token)) {
      this.logoutInvestor(true);
      return false;
    }
    return true;
  }

  getInvestorUser(): any {
    const s = this.getAuthItem('mmr_investor_user');
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }

  logoutInvestor(sessionExpired = false) {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    ['mmr_investor_token', 'mmr_investor_refresh', 'mmr_investor_user', 'mmr_investor_expires_at'].forEach(k => this.saveAuthItem(k, null));
    this._investorUser$.next(null);
    this.scheduleAutoLogout();
    const queryParams = sessionExpired ? { sessionExpired: 'true' } : undefined;
    this.router.navigate(['/login'], { queryParams }).then(() => {
      this.isLoggingOut = false;
    });
  }

  setInvestorSession(tokenOrData: any, userObj?: any) {
    if (!tokenOrData) return;
    this.clearAllAuthStorage();
    let token: string | null = null;

    if (typeof tokenOrData === 'string') {
      token = tokenOrData;
      this.saveAuthItem('mmr_investor_token', tokenOrData);
      if (userObj) {
        this.saveAuthItem('mmr_investor_user', JSON.stringify(userObj));
        this._investorUser$.next(userObj);
      }
    } else {
      token = tokenOrData.token || null;
      if (tokenOrData.token) this.saveAuthItem('mmr_investor_token', tokenOrData.token);
      if (tokenOrData.refresh_token) this.saveAuthItem('mmr_investor_refresh', tokenOrData.refresh_token);
      const user = tokenOrData.user || tokenOrData.investor || userObj;
      if (user) {
        this.saveAuthItem('mmr_investor_user', JSON.stringify(user));
        this._investorUser$.next(user);
      }
    }

    if (token) {
      const expiresAt = this.calculateExpiresAt(token);
      this.saveAuthItem('mmr_investor_expires_at', String(expiresAt));
    }
    this.scheduleAutoLogout();
  }

  updateInvestorUser(user: any) {
    if (user) {
      this.saveAuthItem('mmr_investor_user', JSON.stringify(user));
      this._investorUser$.next(user);
    }
  }

  isEnrollmentCompleted(): boolean {
    if (this.isInvestorLoggedIn()) {
      const inv = this.getInvestorUser();
      const status = String(inv?.enrollment_status || '').toLowerCase();
      return status === 'completed';
    }
    const user = this.getUser();
    if (!user) return false;
    const status = String(user?.enrollment_status || '').toLowerCase();
    return status === 'completed';
  }

  setEnrollmentCompleted() {
    if (this.isInvestorLoggedIn()) {
      const inv = this.getInvestorUser() || {};
      inv.enrollment_status = 'completed';
      this.updateInvestorUser(inv);
    } else {
      const user = this.getUser() || {};
      user.enrollment_status = 'completed';
      this.saveAuthItem('mmr_user', JSON.stringify(user));
      this._user$.next(user);
    }
  }

  getUserRolePrefix(): string {
    if (this.isInvestorLoggedIn()) return '/investor';
    const user = this.getUser();
    const type = String(user?.user_type || user?.role || '').toLowerCase();
    if (type.includes('associate')) return '/associate';
    if (type.includes('investor')) return '/investor';
    return '/customer';
  }

  handleAuthExpired(scope?: string, _url?: string) {
    if (scope === 'admin') {
      this.logoutAdmin(true);
    } else if (scope === 'investor') {
      this.logoutInvestor(true);
    } else {
      this.logoutUser(true);
    }
  }
}
