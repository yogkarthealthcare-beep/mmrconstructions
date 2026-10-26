import { Routes } from '@angular/router';

export const TEAM_MEMBER_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'enrollment',
    loadComponent: () => import('../associate/team-member-enrollment/team-member-enrollment.component').then(m => m.TeamMemberEnrollmentComponent),
    title: 'Team Member Enrollment — MMR Construction'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.TeamMemberDashboardComponent)
  },
  {
    path: 'book-plot',
    loadComponent: () => import('../shared/book-plot/book-plot.component').then(m => m.BookPlotComponent)
  },
  {
    path: 'plot-orders',
    loadComponent: () => import('../admin/plot-orders/plot-orders.component').then(m => m.AdminPlotOrdersComponent),
    title: 'Plot Orders'
  },
  {
    path: 'sales',
    loadComponent: () => import('./sales/sales.component').then(m => m.TeamMemberSalesComponent)
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/customers.component').then(m => m.TeamMemberCustomersComponent)
  },
  {
    path: 'referral',
    loadComponent: () => import('./referral/referral.component').then(m => m.TeamMemberReferralComponent)
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
    path: 'payments',
    loadComponent: () => import('../user/payment-history/payment-history.component').then(m => m.PaymentHistoryComponent)
  },
  {
    path: 'documents',
    loadComponent: () => import('../user/documents/documents.component').then(m => m.DocumentsComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('../user/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'notifications',
    loadComponent: () => import('../user/notifications/notifications.component').then(m => m.NotificationsComponent)
  }
];
