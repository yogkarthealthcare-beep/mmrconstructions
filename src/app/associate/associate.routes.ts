import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { associateEnrollmentReducer } from './enrollment/state/associate-enrollment.reducer';
import { AssociateEnrollmentEffects } from './enrollment/state/associate-enrollment.effects';

export const ASSOCIATE_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    loadComponent: () => import('../user/dashboard/dashboard.component').then(m => m.UserDashboardComponent) 
  },
  { 
    path: 'wallet', 
    loadComponent: () => import('../user/wallet/wallet.component').then(m => m.WalletComponent) 
  },
  { 
    path: 'wallet/add-fund', 
    loadComponent: () => import('../user/wallet/add-fund.component').then(m => m.AddFundComponent) 
  },
  { 
    path: 'wallet/withdraw', 
    loadComponent: () => import('../user/wallet/withdraw-fund.component').then(m => m.WithdrawFundComponent) 
  },
  { 
    path: 'wallet/transactions', 
    loadComponent: () => import('../user/wallet/wallet-transactions.component').then(m => m.WalletTransactionsComponent) 
  },
  { 
    path: 'wallet/withdrawal-history', 
    loadComponent: () => import('../user/wallet/withdrawal-history.component').then(m => m.WithdrawalHistoryComponent) 
  },
  { 
    path: 'my-plots', 
    loadComponent: () => import('../user/my-plots/my-plots.component').then(m => m.MyPlotsComponent) 
  },
  { 
    path: 'emi-history', 
    loadComponent: () => import('../user/emi-history/emi-history.component').then(m => m.EmiHistoryComponent) 
  },
  { 
    path: 'commission', 
    loadComponent: () => import('../user/commission-tracker/commission-tracker.component').then(m => m.CommissionTrackerComponent) 
  },
  { 
    path: 'payments', 
    loadComponent: () => import('../user/payment-history/payment-history.component').then(m => m.PaymentHistoryComponent) 
  },
  { 
    path: 'documents', 
    loadComponent: () => import('../user/documents/documents.component').then(m => m.DocumentsComponent) 
  },
  { 
    path: 'my-team', 
    loadComponent: () => import('../user/my-team/my-team.component').then(m => m.MyTeamComponent) 
  },
  { 
    path: 'network-tree', 
    loadComponent: () => import('../shared/mlm-tree/mlm-tree.component').then(m => m.MlmTreeComponent), 
    data: { audience: 'associate' }, 
    title: 'My Network Tree' 
  },
  { 
    path: 'referral', 
    loadComponent: () => import('../user/referral/referral.component').then(m => m.ReferralComponent) 
  },
  { 
    path: 'profile', 
    loadComponent: () => import('../user/profile/profile.component').then(m => m.ProfileComponent) 
  },
  { 
    path: 'notifications', 
    loadComponent: () => import('../user/notifications/notifications.component').then(m => m.NotificationsComponent) 
  },
  { 
    path: 'buyback', 
    loadComponent: () => import('../user/buyback/buyback.component').then(m => m.BuybackComponent) 
  },
  {
    path: 'team-member-enrollment',
    loadComponent: () => import('./team-member-enrollment/team-member-enrollment.component').then(m => m.TeamMemberEnrollmentComponent),
    title: 'Team Member Enrollment'
  },
  {
    path: 'enrollment',
    loadComponent: () => import('./enrollment/associate-enrollment-form.component').then(m => m.AssociateEnrollmentFormComponent),
    providers: [
      provideState({ name: 'associateEnrollment', reducer: associateEnrollmentReducer }),
      provideEffects(AssociateEnrollmentEffects)
    ]
  },
];
