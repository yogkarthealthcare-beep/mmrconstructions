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
  const isAuthApi = req.url.includes('/api/auth/') || req.url.includes('/api/admin/auth/');
  
  let token;
  if (isAdminApi) {
    token = sessionStorage.getItem('mmr_admin_token');
  } else if (isInvestorApi) {
    token = sessionStorage.getItem('mmr_investor_token');
  } else {
    token = sessionStorage.getItem('mmr_user_token');
  }

  const request = !token || req.headers.has('Authorization')
    ? req
    : req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isAuthApi && isAuthFailure(error)) {
        const scope = isAdminApi || router.url.startsWith('/admin') ? 'admin' : 'user';
        auth.handleAuthExpired(scope, router.url);
        return EMPTY;
      }
      return throwError(() => error);
    }),
  );
};

function isAuthFailure(error: HttpErrorResponse) {
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
  ].some(pattern => message.includes(pattern));
}
