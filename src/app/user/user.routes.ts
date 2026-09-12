import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.UserDashboardComponent) 
  },
  { 
    path: 'wallet', 
    loadComponent: () => import('./wallet/wallet.component').then(m => m.WalletComponent) 
  },
  { 
    path: 'wallet/add-fund', 
    loadComponent: () => import('./wallet/add-fund.component').then(m => m.AddFundComponent) 
  },
  { 
    path: 'wallet/withdraw', 
    loadComponent: () => import('./wallet/withdraw-fund.component').then(m => m.WithdrawFundComponent) 
  },
  { 
    path: 'wallet/transactions', 
    loadComponent: () => import('./wallet/wallet-transactions.component').then(m => m.WalletTransactionsComponent) 
  },
  { 
    path: 'wallet/withdrawal-history', 
    loadComponent: () => import('./wallet/withdrawal-history.component').then(m => m.WithdrawalHistoryComponent) 
  },
  { 
    path: 'my-plots', 
    loadComponent: () => import('./my-plots/my-plots.component').then(m => m.MyPlotsComponent) 
  },
  { 
    path: 'emi-history', 
    loadComponent: () => import('./emi-history/emi-history.component').then(m => m.EmiHistoryComponent) 
  },
  { 
    path: 'commission', 
    loadComponent: () => import('./commission-tracker/commission-tracker.component').then(m => m.CommissionTrackerComponent) 
  },
  { 
    path: 'payments', 
    loadComponent: () => import('./payment-history/payment-history.component').then(m => m.PaymentHistoryComponent) 
  },
  { 
    path: 'documents', 
    loadComponent: () => import('./documents/documents.component').then(m => m.DocumentsComponent) 
  },
  { 
    path: 'my-team', 
    loadComponent: () => import('./my-team/my-team.component').then(m => m.MyTeamComponent) 
  },
  { 
    path: 'network-tree', 
    loadComponent: () => import('../shared/mlm-tree/mlm-tree.component').then(m => m.MlmTreeComponent), 
    data: { audience: 'associate' }, 
    title: 'My Network Tree' 
  },
  { 
    path: 'referral', 
    loadComponent: () => import('./referral/referral.component').then(m => m.ReferralComponent) 
  },
  { 
    path: 'profile', 
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent) 
  },
  { 
    path: 'notifications', 
    loadComponent: () => import('./notifications/notifications.component').then(m => m.NotificationsComponent) 
  },
  { 
    path: 'buyback', 
    loadComponent: () => import('./buyback/buyback.component').then(m => m.BuybackComponent) 
  },
  {
    path: 'team-member-enrollment',
    loadComponent: () => import('../associate/team-member-enrollment/team-member-enrollment.component').then(m => m.TeamMemberEnrollmentComponent),
    title: 'Team Member Enrollment'
  },
  { 
    path: 'enrollment', 
    loadComponent: () => import('./customer-enrollment/customer-enrollment.component').then(m => m.CustomerEnrollmentComponent) 
  },
];
