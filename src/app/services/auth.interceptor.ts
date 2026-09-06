import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAppApi = req.url.includes('/api/');
  if (!isAppApi) {
    return next(req);
  }

  const isAdminApi = req.url.includes('/api/admin/');
  const isInvestorApi = req.url.includes('/api/investor/');
  const isAuthApi = req.url.includes('/api/auth/') || req.url.includes('/api/admin/auth/') || req.url.includes('/api/investor/auth/');
  
  const scope: 'admin' | 'investor' | 'user' = isAdminApi || router.url.startsWith('/admin')
    ? 'admin'
    : (isInvestorApi || router.url.startsWith('/investor') ? 'investor' : 'user');

  let token: string | null = null;
  if (scope === 'admin') {
    token = sessionStorage.getItem('mmr_admin_token') || localStorage.getItem('mmr_admin_token');
  } else if (scope === 'investor') {
    token = sessionStorage.getItem('mmr_investor_token') || localStorage.getItem('mmr_investor_token');
  } else {
    token = sessionStorage.getItem('mmr_user_token') || localStorage.getItem('mmr_user_token') || sessionStorage.getItem('mmr_investor_token') || localStorage.getItem('mmr_investor_token');
  }

  // If token is already expired before sending non-auth API calls, intercept and logout immediately
  if (!isAuthApi && token && auth.isTokenExpired(scope, token)) {
    auth.handleAuthExpired(scope, router.url);
    return EMPTY;
  }

  const request = !token || req.headers.has('Authorization')
    ? req
    : req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isAuthApi && isAuthFailure(error)) {
        auth.handleAuthExpired(scope, router.url);
        return EMPTY;
      }
      return throwError(() => error);
    }),
  );
};

function isAuthFailure(error: HttpErrorResponse): boolean {
  if (error.status === 401) return true;
  const message = [
    error.error?.message,
    error.error?.error,
    error.statusText,
    error.message,
  ].filter(Boolean).join(' ').toLowerCase();

  return [
    'token expired',
    'expired token',
    'invalid token',
    'unauthorized',
    'authentication failed',
    'session expired',
    'invalid or expired token',
  ].some(pattern => message.includes(pattern));
}
