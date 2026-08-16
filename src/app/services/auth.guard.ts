import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const userGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isUserLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
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

export const associateGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isUserLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return auth.isAssociate()
    ? true
    : router.createUrlTree(['/unauthorized']);
};

export const investorGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isInvestorLoggedIn()) {
    return router.createUrlTree(['/investor/login'], { queryParams: { returnUrl: state.url } });
  }
  return true;
};

