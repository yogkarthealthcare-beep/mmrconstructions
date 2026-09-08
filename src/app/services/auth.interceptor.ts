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

  let request = req;
  if (!req.headers.has('Authorization')) {
    let token: string | null = null;
    if (isAdminApi || (router.url.startsWith('/admin') && !req.url.includes('/api/customer/') && !req.url.includes('/api/associate/'))) {
      token = auth.adminToken;
    } else if (isInvestorApi || router.url.startsWith('/investor')) {
      token = sessionStorage.getItem('mmr_investor_token') || localStorage.getItem('mmr_investor_token');
    } else {
      token = auth.userToken;
    }

    if (token) {
      request = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isAuthApi && isAuthFailure(error)) {
        // Only trigger session expiration for matching authenticated scope
        if (isAdminApi && auth.isAdminLoggedIn()) {
          auth.handleAuthExpired('admin', router.url);
          return EMPTY;
        } else if (isInvestorApi && auth.isInvestorLoggedIn()) {
          auth.handleAuthExpired('investor', router.url);
          return EMPTY;
        } else if (!isAdminApi && !isInvestorApi && auth.isUserLoggedIn() && (router.url.startsWith('/customer') || router.url.startsWith('/associate'))) {
          auth.handleAuthExpired('user', router.url);
          return EMPTY;
        }
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
