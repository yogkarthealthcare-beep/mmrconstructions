import { Routes } from '@angular/router';

export const INVESTOR_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./investor-dashboard/investor-dashboard.component').then(m => m.InvestorDashboardComponent) 
  },
  { 
    path: 'wallet', 
    loadComponent: () => import('./investor-wallet/investor-wallet.component').then(m => m.InvestorWalletComponent) 
  },
  { 
    path: 'deposit', 
    loadComponent: () => import('./investor-deposit/investor-deposit.component').then(m => m.InvestorDepositComponent) 
  },
  { 
    path: 'withdrawal', 
    loadComponent: () => import('./investor-withdrawal/investor-withdrawal.component').then(m => m.InvestorWithdrawalComponent) 
  },
  { 
    path: 'payments', 
    loadComponent: () => import('./investor-payments/investor-payments.component').then(m => m.InvestorPaymentsComponent) 
  },
  { 
    path: 'payment-history', 
    loadComponent: () => import('./investor-payments/investor-payments.component').then(m => m.InvestorPaymentsComponent) 
  },
  { 
    path: 'transactions', 
    loadComponent: () => import('./investor-payments/investor-payments.component').then(m => m.InvestorPaymentsComponent) 
  },
  { 
    path: 'settlement', 
    loadComponent: () => import('./investor-settlement/investor-settlement.component').then(m => m.InvestorSettlementComponent) 
  },
  { 
    path: 'documents', 
    loadComponent: () => import('./investor-documents/investor-documents.component').then(m => m.InvestorDocumentsComponent) 
  },
  { 
    path: 'profile', 
    loadComponent: () => import('./investor-profile/investor-profile.component').then(m => m.InvestorProfileComponent) 
  },
  { 
    path: 'change-password', 
    loadComponent: () => import('./investor-change-password/investor-change-password.component').then(m => m.InvestorChangePasswordComponent) 
  },
  { 
    path: 'notifications', 
    loadComponent: () => import('./investor-notifications/investor-notifications.component').then(m => m.InvestorNotificationsComponent) 
  },
  { 
    path: 'enrollment', 
    loadComponent: () => import('./investor-enrollment/investor-enrollment.component').then(m => m.InvestorEnrollmentComponent) 
  },
];
