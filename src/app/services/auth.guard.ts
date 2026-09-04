import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Universal enrollment guard that ensures the user has completed their enrollment form.
 * If enrollment is pending, blocks all protected internal routes and redirects to /enrollment.
 */
export const enrollmentGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const url = state.url.toLowerCase();

  // If already navigating to an enrollment form, allow it
  if (url.includes('/enrollment')) {
    return true;
  }

  // Check if investor or standard user
  if (auth.isInvestorLoggedIn()) {
    if (!auth.isEnrollmentCompleted()) {
      return router.createUrlTree(['/investor/enrollment']);
    }
    return true;
  }

  if (auth.isUserLoggedIn()) {
    if (!auth.isEnrollmentCompleted()) {
      const prefix = auth.getUserRolePrefix();
      return router.createUrlTree([`${prefix}/enrollment`]);
    }
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const customerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isUserLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const url = state.url.toLowerCase();
  if (!url.includes('/enrollment') && !auth.isEnrollmentCompleted()) {
    return router.createUrlTree(['/customer/enrollment']);
  }
  return true;
};

export const associateGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isUserLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (!auth.isAssociate()) {
    return router.createUrlTree(['/unauthorized']);
  }
  const url = state.url.toLowerCase();
  if (!url.includes('/enrollment') && !auth.isEnrollmentCompleted()) {
    return router.createUrlTree(['/associate/enrollment']);
  }
  return true;
};

export const investorGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isInvestorLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const url = state.url.toLowerCase();
  if (!url.includes('/enrollment') && !auth.isEnrollmentCompleted()) {
    return router.createUrlTree(['/investor/enrollment']);
  }
  return true;
};

export const userGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isUserLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const url = state.url.toLowerCase();
  if (!url.includes('/enrollment') && !auth.isEnrollmentCompleted()) {
    const prefix = auth.getUserRolePrefix();
    return router.createUrlTree([`${prefix}/enrollment`]);
  }
  return auth.isApprovedUser() ? true : router.createUrlTree(['/unauthorized']);
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdminLoggedIn()
    ? true
    : router.createUrlTree(['/admin-login'], { queryParams: { returnUrl: state.url } });
};

