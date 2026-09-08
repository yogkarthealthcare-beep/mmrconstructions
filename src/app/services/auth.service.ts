import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly ADMIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours
  readonly DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

  private _adminUser$    = new BehaviorSubject<any>(this.getAdminUser());
  private _user$         = new BehaviorSubject<any>(this.getUser());
  private _investorUser$ = new BehaviorSubject<any>(this.getInvestorUser());

  adminUser$    = this._adminUser$.asObservable();
  user$         = this._user$.asObservable();
  investorUser$ = this._investorUser$.asObservable();

  private isLoggingOutAdmin = false;
  private isLoggingOutUser = false;
  private isLoggingOutInvestor = false;

  private adminLogoutTimer: any = null;
  private userLogoutTimer: any = null;
  private investorLogoutTimer: any = null;

  constructor(private router: Router) {
    this.checkInitialExpirations();
    this.scheduleAllAutoLogouts();
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

  isTokenExpired(scope: 'admin' | 'user' | 'investor', token?: string | null): boolean {
    const t = token !== undefined ? token : (
      scope === 'admin' ? this.adminToken : (scope === 'investor' ? this.getAuthItem('mmr_investor_token') : this.userToken)
    );
    if (!t) return true;

    const now = Date.now();

    // 1. Check stored timestamp fallback
    const expKey = scope === 'admin' ? 'mmr_admin_expires_at' : (scope === 'investor' ? 'mmr_investor_expires_at' : 'mmr_user_expires_at');
    const storedExpStr = this.getAuthItem(expKey);
    if (storedExpStr) {
      const storedExp = Number(storedExpStr);
      if (!isNaN(storedExp) && storedExp > 0) {
        if (now >= storedExp) {
          return true;
        }
        return false;
      }
    }

    // 2. Check JWT exp claim directly
    const jwtExp = this.parseJwtExp(t);
    if (jwtExp) {
      if (now >= jwtExp) return true;
      return false;
    }

    // 3. Fallback: initialize 24h window
    const duration = scope === 'admin' ? this.ADMIN_SESSION_DURATION_MS : this.DEFAULT_SESSION_DURATION_MS;
    this.saveAuthItem(expKey, String(now + duration));
    return false;
  }

  private getExpirationMs(scope: 'admin' | 'user' | 'investor'): number | null {
    const token = scope === 'admin' ? this.adminToken : (scope === 'investor' ? this.getAuthItem('mmr_investor_token') : this.userToken);
    if (!token) return null;

    const expKey = scope === 'admin' ? 'mmr_admin_expires_at' : (scope === 'investor' ? 'mmr_investor_expires_at' : 'mmr_user_expires_at');
    const stored = this.getAuthItem(expKey);
    if (stored) {
      const num = Number(stored);
      if (!isNaN(num) && num > 0) return num;
    }

    const jwtExp = this.parseJwtExp(token);
    if (jwtExp && jwtExp > Date.now()) return jwtExp;

    const duration = scope === 'admin' ? this.ADMIN_SESSION_DURATION_MS : this.DEFAULT_SESSION_DURATION_MS;
    return Date.now() + duration;
  }

  private scheduleScopeAutoLogout(scope: 'admin' | 'user' | 'investor') {
    if (scope === 'admin') {
      if (this.adminLogoutTimer) {
        clearTimeout(this.adminLogoutTimer);
        this.adminLogoutTimer = null;
      }
      if (!this.adminToken) return;
      const exp = this.getExpirationMs('admin');
      if (!exp || exp <= 0) return;
      const delay = exp - Date.now();
      if (delay <= 0) {
        this.logoutAdmin(true);
        return;
      }
      this.adminLogoutTimer = setTimeout(() => {
        if (Date.now() >= exp) {
          this.logoutAdmin(true);
        } else {
          this.scheduleScopeAutoLogout('admin');
        }
      }, Math.min(delay, 2147483647));
    } else if (scope === 'user') {
      if (this.userLogoutTimer) {
        clearTimeout(this.userLogoutTimer);
        this.userLogoutTimer = null;
      }
      if (!this.userToken) return;
      const exp = this.getExpirationMs('user');
      if (!exp || exp <= 0) return;
      const delay = exp - Date.now();
      if (delay <= 0) {
        this.logoutUser(true);
        return;
      }
      this.userLogoutTimer = setTimeout(() => {
        if (Date.now() >= exp) {
          this.logoutUser(true);
        } else {
          this.scheduleScopeAutoLogout('user');
        }
      }, Math.min(delay, 2147483647));
    } else if (scope === 'investor') {
      if (this.investorLogoutTimer) {
        clearTimeout(this.investorLogoutTimer);
        this.investorLogoutTimer = null;
      }
      const token = this.getAuthItem('mmr_investor_token');
      if (!token) return;
      const exp = this.getExpirationMs('investor');
      if (!exp || exp <= 0) return;
      const delay = exp - Date.now();
      if (delay <= 0) {
        this.logoutInvestor(true);
        return;
      }
      this.investorLogoutTimer = setTimeout(() => {
        if (Date.now() >= exp) {
          this.logoutInvestor(true);
        } else {
          this.scheduleScopeAutoLogout('investor');
        }
      }, Math.min(delay, 2147483647));
    }
  }

  private scheduleAllAutoLogouts() {
    this.scheduleScopeAutoLogout('admin');
    this.scheduleScopeAutoLogout('user');
    this.scheduleScopeAutoLogout('investor');
  }

  private checkInitialExpirations() {
    if (this.adminToken && this.isTokenExpired('admin')) {
      this.logoutAdmin(true);
    }
    if (this.getAuthItem('mmr_investor_token') && this.isTokenExpired('investor')) {
      this.logoutInvestor(true);
    }
    if (this.userToken && this.isTokenExpired('user')) {
      this.logoutUser(true);
    }
  }

  private setupVisibilityListeners() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkInitialExpirations();
          this.scheduleAllAutoLogouts();
        }
      });
      window.addEventListener('focus', () => {
        this.checkInitialExpirations();
        this.scheduleAllAutoLogouts();
      });
    }
  }

  // ── Separate Storage Clearers per Scope ──────────────────────────
  clearAdminStorage() {
    ['mmr_admin_token', 'mmr_admin_refresh', 'mmr_admin_user', 'mmr_admin_expires_at']
      .forEach(k => this.saveAuthItem(k, null));
  }

  clearUserStorage() {
    ['mmr_user_token', 'mmr_user_refresh', 'mmr_user', 'mmr_user_expires_at']
      .forEach(k => this.saveAuthItem(k, null));
  }

  clearInvestorStorage() {
    ['mmr_investor_token', 'mmr_investor_refresh', 'mmr_investor_user', 'mmr_investor_expires_at']
      .forEach(k => this.saveAuthItem(k, null));
  }

  clearAllAuthStorage() {
    this.clearAdminStorage();
    this.clearUserStorage();
    this.clearInvestorStorage();
  }

  // ── Admin ──────────────────────
  setAdminSession(data: any) {
    if (!data) return;
    this.clearAdminStorage(); // Only clears admin storage!
    if (data.token) {
      this.saveAuthItem('mmr_admin_token', data.token);
      const expiresAt = Date.now() + this.ADMIN_SESSION_DURATION_MS; // Exactly 24 Hours
      this.saveAuthItem('mmr_admin_expires_at', String(expiresAt));
    }
    if (data.refresh_token) this.saveAuthItem('mmr_admin_refresh', data.refresh_token);
    if (data.admin) this.saveAuthItem('mmr_admin_user', JSON.stringify(data.admin));
    this._adminUser$.next(data.admin || null);
    this.scheduleScopeAutoLogout('admin');
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

  logoutAdmin(_sessionExpired = false) {
    if (this.isLoggingOutAdmin) return;
    this.isLoggingOutAdmin = true;
    if (this.adminLogoutTimer) {
      clearTimeout(this.adminLogoutTimer);
      this.adminLogoutTimer = null;
    }
    this.clearAdminStorage();
    this._adminUser$.next(null);
    this.router.navigate(['/admin-login']).then(() => {
      this.isLoggingOutAdmin = false;
    });
  }

  // ── User / Associate / Customer ──────────────────────
  setUserSession(data: any) {
    if (!data) return;
    this.clearUserStorage(); // Only clears user storage!
    const token = data.token || data.access_token || data.jwt || (typeof data === 'string' ? data : null);
    const refreshToken = data.refresh_token || data.refreshToken || '';
    const userObj = data.user || data.data?.user || (data.user_id ? data : null);

    if (token) {
      this.saveAuthItem('mmr_user_token', token);
      const expiresAt = Date.now() + this.DEFAULT_SESSION_DURATION_MS; // 24 Hours
      this.saveAuthItem('mmr_user_expires_at', String(expiresAt));
    }
    if (refreshToken) {
      this.saveAuthItem('mmr_user_refresh', refreshToken);
    }
    if (userObj) {
      this.saveAuthItem('mmr_user', JSON.stringify(userObj));
      this._user$.next(userObj);
    }
    this.scheduleScopeAutoLogout('user');
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
    if (this.isLoggingOutUser) return;
    this.isLoggingOutUser = true;
    if (this.userLogoutTimer) {
      clearTimeout(this.userLogoutTimer);
      this.userLogoutTimer = null;
    }
    this.clearUserStorage();
    this._user$.next(null);
    const queryParams = sessionExpired ? { sessionExpired: 'true' } : undefined;
    this.router.navigate(['/login'], { queryParams }).then(() => {
      this.isLoggingOutUser = false;
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

  // ── Investor ─────────────────────
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
    if (this.isLoggingOutInvestor) return;
    this.isLoggingOutInvestor = true;
    if (this.investorLogoutTimer) {
      clearTimeout(this.investorLogoutTimer);
      this.investorLogoutTimer = null;
    }
    this.clearInvestorStorage();
    this._investorUser$.next(null);
    const queryParams = sessionExpired ? { sessionExpired: 'true' } : undefined;
    this.router.navigate(['/login'], { queryParams }).then(() => {
      this.isLoggingOutInvestor = false;
    });
  }

  setInvestorSession(tokenOrData: any, userObj?: any) {
    if (!tokenOrData) return;
    this.clearInvestorStorage(); // Only clears investor storage!
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
      const expiresAt = Date.now() + this.DEFAULT_SESSION_DURATION_MS; // 24 Hours
      this.saveAuthItem('mmr_investor_expires_at', String(expiresAt));
    }
    this.scheduleScopeAutoLogout('investor');
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
