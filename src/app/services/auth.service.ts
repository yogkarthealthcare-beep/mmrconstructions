import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _adminUser$ = new BehaviorSubject<any>(this.getAdminUser());
  private _user$      = new BehaviorSubject<any>(this.getUser());

  adminUser$ = this._adminUser$.asObservable();
  user$      = this._user$.asObservable();

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
    return s ? JSON.parse(s) : null;
  }
  get adminToken() { return localStorage.getItem('mmr_admin_token'); }
  isAdminLoggedIn() { return !!this.adminToken; }
  logoutAdmin() {
    ['mmr_admin_token','mmr_admin_refresh','mmr_admin_user'].forEach(k => localStorage.removeItem(k));
    this._adminUser$.next(null);
    this.router.navigate(['/admin-login']);
  }

  // ── User ──────────────────────
  setUserSession(data: any) {
    localStorage.setItem('mmr_user_token', data.token);
    localStorage.setItem('mmr_user_refresh', data.refresh_token);
    localStorage.setItem('mmr_user', JSON.stringify(data.user));
    this._user$.next(data.user);
  }
  getUser(): any {
    const s = localStorage.getItem('mmr_user');
    return s ? JSON.parse(s) : null;
  }
  get userToken() { return localStorage.getItem('mmr_user_token'); }
  isUserLoggedIn() { return !!this.userToken; }
  logoutUser() {
    ['mmr_user_token','mmr_user_refresh','mmr_user'].forEach(k => localStorage.removeItem(k));
    this._user$.next(null);
    this.router.navigate(['/login']);
  }
}
