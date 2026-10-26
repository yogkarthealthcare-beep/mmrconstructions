import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Universal enrollment guard that ensures the user has completed their enrollment form.
 * If enrollment is pending, blocks all protected internal routes and redirects to /enrollment.
 * If enrollment is already completed, blocks access to /enrollment and redirects to /dashboard.
 */
export const enrollmentGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const url = state.url.toLowerCase();
  const isInvestor = auth.isInvestorLoggedIn();
  const isUser = auth.isUserLoggedIn();

  if (!isInvestor && !isUser) {
    const targetLogin = url.startsWith('/investor') ? '/investor/login' : '/login';
    return router.createUrlTree([targetLogin], { queryParams: { returnUrl: state.url } });
  }

  if (auth.isTeamMember()) {
    if (url.includes('/enrollment')) {
      return true;
    }
    if (!auth.isEnrollmentCompleted()) {
      if (auth.isEnrollmentSkippedThisSession()) {
        return true;
      }
      return router.createUrlTree(['/team-member/enrollment']);
    }
    if (url.startsWith('/associate') || url.startsWith('/customer') || url.startsWith('/user')) {
      return router.createUrlTree(['/team-member/dashboard']);
    }
    return true;
  }

  const isCompleted = auth.isEnrollmentCompleted();
  const prefix = auth.getUserRolePrefix();

  // If navigating to enrollment form:
  if (url.includes('/enrollment')) {
    return true;
  }

  // If navigating to internal pages but enrollment is not done:
  if (!isCompleted) {
    if (auth.isEnrollmentSkippedThisSession()) {
      return true;
    }
    return router.createUrlTree([`${prefix}/enrollment`]);
  }

  return true;
};

export const customerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isUserLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (auth.isTeamMember()) {
    return router.createUrlTree(['/team-member/dashboard']);
  }
  const url = state.url.toLowerCase();
  const isCompleted = auth.isEnrollmentCompleted();

  if (url.includes('/enrollment')) {
    return true;
  }

  if (!isCompleted) {
    if (auth.isEnrollmentSkippedThisSession()) {
      return true;
    }
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
  if (auth.isTeamMember()) {
    return router.createUrlTree(['/team-member/dashboard']);
  }
  if (!auth.isAssociate()) {
    const prefix = auth.getUserRolePrefix();
    return router.createUrlTree([`${prefix}/dashboard`]);
  }
  const url = state.url.toLowerCase();
  const isCompleted = auth.isEnrollmentCompleted();

  if (url.includes('/enrollment')) {
    return true;
  }

  if (!isCompleted) {
    if (auth.isEnrollmentSkippedThisSession()) {
      return true;
    }
    return router.createUrlTree(['/associate/enrollment']);
  }
  return true;
};

export const investorGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isInvestorLoggedIn()) {
    return router.createUrlTree(['/investor/login'], { queryParams: { returnUrl: state.url } });
  }
  const url = state.url.toLowerCase();
  const isCompleted = auth.isEnrollmentCompleted();

  if (url.includes('/enrollment')) {
    return true;
  }

  if (!isCompleted) {
    if (auth.isEnrollmentSkippedThisSession()) {
      return true;
    }
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
  if (auth.isTeamMember()) {
    return router.createUrlTree(['/team-member/dashboard']);
  }
  const url = state.url.toLowerCase();
  const isCompleted = auth.isEnrollmentCompleted();
  const prefix = auth.getUserRolePrefix();

  if (url.includes('/enrollment')) {
    return true;
  }

  if (!isCompleted) {
    if (auth.isEnrollmentSkippedThisSession()) {
      return auth.isApprovedUser() ? true : router.createUrlTree(['/login'], { queryParams: { unapproved: 'true' } });
    }
    return router.createUrlTree([`${prefix}/enrollment`]);
  }
  return auth.isApprovedUser() ? true : router.createUrlTree(['/login'], { queryParams: { unapproved: 'true' } });
};

export const teamMemberGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isUserLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (!auth.isTeamMember()) {
    const prefix = auth.getUserRolePrefix();
    return router.createUrlTree([`${prefix}/dashboard`]);
  }
  const url = state.url.toLowerCase();
  if (url.includes('/enrollment')) {
    return true;
  }
  if (!auth.isEnrollmentCompleted()) {
    if (auth.isEnrollmentSkippedThisSession()) {
      return true;
    }
    return router.createUrlTree(['/team-member/enrollment']);
  }
  return true;
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdminLoggedIn()
    ? true
    : router.createUrlTree(['/admin-login'], { queryParams: { returnUrl: state.url } });
};

