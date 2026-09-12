import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
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
  private heartbeatInterval: any = null;

  constructor(private router: Router) {
    this.checkInitialExpirations();
    this.scheduleAllAutoLogouts();
    this.setupVisibilityListeners();
    this.setupNavigationListener();
    this.setupPeriodicHeartbeat();
  }

  // ── Date & Expiration Helpers ─────────────────────────────────────
  /**
   * Returns the local date in 'YYYY-MM-DD' format.
   */
  getLocalDateString(baseDate: Date = new Date()): string {
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculates the exact timestamp (ms) for 00:00:00.000 of the next calendar day.
   */
  getNextDayMidnightTimestamp(baseDate: Date = new Date()): number {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1, 0, 0, 0, 0);
    return d.getTime();
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

  // ── Token Expiration Checker ──────────────────────────────────────
  /**
   * Checks whether a session has expired according to the Next-Day policy:
   * 1. If no token exists -> expired.
   * 2. If the stored login_date is different from today's date -> expired (next day reached).
   * 3. If Date.now() >= stored midnight timestamp -> expired.
   * 4. If login_date or expires_at is missing -> expired.
   */
  isTokenExpired(scope: 'admin' | 'user' | 'investor', token?: string | null): boolean {
    const rawToken = token !== undefined ? token : (
      scope === 'admin' 
        ? this.getAuthItem('mmr_admin_token') 
        : (scope === 'investor' ? this.getAuthItem('mmr_investor_token') : this.getAuthItem('mmr_user_token'))
    );
    if (!rawToken) return true;

    const loginDateKey = scope === 'admin' ? 'mmr_admin_login_date' : (scope === 'investor' ? 'mmr_investor_login_date' : 'mmr_user_login_date');
    const expKey = scope === 'admin' ? 'mmr_admin_expires_at' : (scope === 'investor' ? 'mmr_investor_expires_at' : 'mmr_user_expires_at');

    const storedLoginDate = this.getAuthItem(loginDateKey);
    const storedExpStr = this.getAuthItem(expKey);

    const now = new Date();
    const currentDateStr = this.getLocalDateString(now);
    const currentTimeMs = now.getTime();

    // 1. Check if calendar day changed (Next Day auto-logout on refresh or visit)
    if (storedLoginDate && storedLoginDate !== currentDateStr) {
      return true;
    }

    // 2. Check if current time has crossed midnight timestamp
    if (storedExpStr) {
      const storedExp = Number(storedExpStr);
      if (!isNaN(storedExp) && storedExp > 0) {
        if (currentTimeMs >= storedExp) {
          return true;
        }
        // If login date matches today and timestamp is in future, it's valid
        if (storedLoginDate === currentDateStr) {
          return false;
        }
      }
    }

    // 3. Fallback: If login_date or expires_at is missing for an active token,
    // expire it strictly so sessions never persist beyond the intended day.
    return true;
  }

  private getExpirationMs(scope: 'admin' | 'user' | 'investor'): number | null {
    const expKey = scope === 'admin' ? 'mmr_admin_expires_at' : (scope === 'investor' ? 'mmr_investor_expires_at' : 'mmr_user_expires_at');
    const stored = this.getAuthItem(expKey);
    if (stored) {
      const num = Number(stored);
      if (!isNaN(num) && num > 0) return num;
    }
    return null;
  }

  private scheduleScopeAutoLogout(scope: 'admin' | 'user' | 'investor') {
    if (scope === 'admin') {
      if (this.adminLogoutTimer) {
        clearTimeout(this.adminLogoutTimer);
        this.adminLogoutTimer = null;
      }
      const token = this.getAuthItem('mmr_admin_token');
      if (!token) return;
      const exp = this.getExpirationMs('admin');
      if (!exp || exp <= 0 || this.isTokenExpired('admin', token)) {
        this.logoutAdmin(true);
        return;
      }
      const delay = exp - Date.now();
      if (delay <= 0) {
        this.logoutAdmin(true);
        return;
      }
      this.adminLogoutTimer = setTimeout(() => {
        if (this.isTokenExpired('admin')) {
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
      const token = this.getAuthItem('mmr_user_token');
      if (!token) return;
      const exp = this.getExpirationMs('user');
      if (!exp || exp <= 0 || this.isTokenExpired('user', token)) {
        this.logoutUser(true);
        return;
      }
      const delay = exp - Date.now();
      if (delay <= 0) {
        this.logoutUser(true);
        return;
      }
      this.userLogoutTimer = setTimeout(() => {
        if (this.isTokenExpired('user')) {
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
      if (!exp || exp <= 0 || this.isTokenExpired('investor', token)) {
        this.logoutInvestor(true);
        return;
      }
      const delay = exp - Date.now();
      if (delay <= 0) {
        this.logoutInvestor(true);
        return;
      }
      this.investorLogoutTimer = setTimeout(() => {
        if (this.isTokenExpired('investor')) {
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
    if (this.getAuthItem('mmr_admin_token') && this.isTokenExpired('admin')) {
      this.logoutAdmin(true);
    }
    if (this.getAuthItem('mmr_investor_token') && this.isTokenExpired('investor')) {
      this.logoutInvestor(true);
    }
    if (this.getAuthItem('mmr_user_token') && this.isTokenExpired('user')) {
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

  private setupNavigationListener() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.checkInitialExpirations();
      }
    });
  }

  private setupPeriodicHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    // Check every 30 seconds for active tabs to catch midnight date rollover
    this.heartbeatInterval = setInterval(() => {
      this.checkInitialExpirations();
    }, 30000);
  }

  // ── Separate Storage Clearers per Scope ──────────────────────────
  clearAdminStorage() {
    ['mmr_admin_token', 'mmr_admin_refresh', 'mmr_admin_user', 'mmr_admin_expires_at', 'mmr_admin_login_date']
      .forEach(k => this.saveAuthItem(k, null));
  }

  clearUserStorage() {
    ['mmr_user_token', 'mmr_user_refresh', 'mmr_user', 'mmr_user_expires_at', 'mmr_user_login_date']
      .forEach(k => this.saveAuthItem(k, null));
  }

  clearInvestorStorage() {
    ['mmr_investor_token', 'mmr_investor_refresh', 'mmr_investor_user', 'mmr_investor_expires_at', 'mmr_investor_login_date']
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
    this.clearAdminStorage();
    if (data.token) {
      const now = new Date();
      const loginDate = this.getLocalDateString(now);
      const expiresAt = this.getNextDayMidnightTimestamp(now);

      this.saveAuthItem('mmr_admin_token', data.token);
      this.saveAuthItem('mmr_admin_login_date', loginDate);
      this.saveAuthItem('mmr_admin_expires_at', String(expiresAt));
    }
    if (data.refresh_token) this.saveAuthItem('mmr_admin_refresh', data.refresh_token);
    if (data.admin) this.saveAuthItem('mmr_admin_user', JSON.stringify(data.admin));
    this._adminUser$.next(data.admin || null);
    this.scheduleScopeAutoLogout('admin');
  }

  getAdminUser(): any {
    if (this.isTokenExpired('admin')) {
      return null;
    }
    const s = this.getAuthItem('mmr_admin_user');
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  get adminToken(): string | null {
    if (this.isTokenExpired('admin')) {
      return null;
    }
    return this.getAuthItem('mmr_admin_token');
  }

  isAdminLoggedIn(): boolean {
    const token = this.getAuthItem('mmr_admin_token');
    if (!token) return false;
    if (this.isTokenExpired('admin', token)) {
      this.logoutAdmin(true);
      return false;
    }
    return true;
  }

  logoutAdmin(sessionExpired = false) {
    if (this.isLoggingOutAdmin) return;
    this.isLoggingOutAdmin = true;
    if (this.adminLogoutTimer) {
      clearTimeout(this.adminLogoutTimer);
      this.adminLogoutTimer = null;
    }
    this.clearAdminStorage();
    this._adminUser$.next(null);
    const queryParams = sessionExpired ? { sessionExpired: 'true' } : undefined;
    this.router.navigate(['/admin-login'], { queryParams }).then(() => {
      this.isLoggingOutAdmin = false;
    });
  }

  // ── User / Associate / Customer ──────────────────────
  setUserSession(data: any) {
    if (!data) return;
    this.clearUserStorage();
    const token = data.token || data.access_token || data.jwt || (typeof data === 'string' ? data : null);
    const refreshToken = data.refresh_token || data.refreshToken || '';
    const userObj = data.user || data.data?.user || (data.user_id ? data : null);

    if (token) {
      const now = new Date();
      const loginDate = this.getLocalDateString(now);
      const expiresAt = this.getNextDayMidnightTimestamp(now);

      this.saveAuthItem('mmr_user_token', token);
      this.saveAuthItem('mmr_user_login_date', loginDate);
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
    if (this.isTokenExpired('user')) {
      return null;
    }
    const s = this.getAuthItem('mmr_user');
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  get userToken(): string | null {
    if (this.isTokenExpired('user')) {
      return null;
    }
    return this.getAuthItem('mmr_user_token');
  }

  isUserLoggedIn(): boolean {
    const token = this.getAuthItem('mmr_user_token');
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
    if (this.isTokenExpired('investor')) {
      return null;
    }
    const s = this.getAuthItem('mmr_investor_user');
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }

  get investorToken(): string | null {
    if (this.isTokenExpired('investor')) {
      return null;
    }
    return this.getAuthItem('mmr_investor_token');
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
    this.clearInvestorStorage();
    let token: string | null = null;
    let refreshToken: string | null = null;
    let user: any = null;

    if (typeof tokenOrData === 'string') {
      token = tokenOrData;
      user = userObj;
    } else {
      token = tokenOrData.token || null;
      refreshToken = tokenOrData.refresh_token || null;
      user = tokenOrData.user || tokenOrData.investor || userObj;
    }

    if (token) {
      const now = new Date();
      const loginDate = this.getLocalDateString(now);
      const expiresAt = this.getNextDayMidnightTimestamp(now);

      this.saveAuthItem('mmr_investor_token', token);
      this.saveAuthItem('mmr_investor_login_date', loginDate);
      this.saveAuthItem('mmr_investor_expires_at', String(expiresAt));
    }
    if (refreshToken) {
      this.saveAuthItem('mmr_investor_refresh', refreshToken);
    }
    if (user) {
      this.saveAuthItem('mmr_investor_user', JSON.stringify(user));
      this._investorUser$.next(user);
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
      if (!inv) return false;
      const status = String(inv.enrollment_status || inv.enrollmentStatus || '').toLowerCase().trim();
      if (status === 'completed' || status === 'submitted') return true;
      if (inv.is_enrolled === true || inv.isEnrolled === true || inv.enrollment_form_submitted === true || inv.enrollment_completed === true) return true;
      return false;
    }
    const user = this.getUser();
    if (!user) return false;
    const status = String(user.enrollment_status || user.enrollmentStatus || '').toLowerCase().trim();
    if (status === 'completed' || status === 'submitted') return true;
    if (user.is_enrolled === true || user.isEnrolled === true || user.enrollment_form_submitted === true || user.enrollment_completed === true) return true;
    return false;
  }

  setEnrollmentCompleted() {
    if (this.isInvestorLoggedIn()) {
      const inv = this.getInvestorUser() || {};
      inv.enrollment_status = 'completed';
      inv.is_enrolled = true;
      this.updateInvestorUser(inv);
    } else {
      const user = this.getUser() || {};
      user.enrollment_status = 'completed';
      user.is_enrolled = true;
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

