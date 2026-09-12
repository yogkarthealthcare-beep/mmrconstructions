import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.AdminDashboardComponent) 
  },
  { 
    path: 'analytics', 
    loadComponent: () => import('./analytics/analytics.component').then(m => m.AdminAnalyticsComponent) 
  },
  { 
    path: 'approvals', 
    loadComponent: () => import('./approvals/approvals.component').then(m => m.ApprovalsComponent) 
  },
  { 
    path: 'enrollments', 
    loadComponent: () => import('./enrollments/admin-enrollments.component').then(m => m.AdminEnrollmentsComponent), 
    title: 'Enrollment Management' 
  },
  { 
    path: 'customers', 
    loadComponent: () => import('./customers/customers.component').then(m => m.CustomersComponent) 
  },
  { 
    path: 'investor-enrollments', 
    loadComponent: () => import('./investor-enrollments/admin-investor-enrollments-list.component').then(m => m.AdminInvestorEnrollmentsListComponent), 
    title: 'Investor Enrollments' 
  },
  { 
    path: 'investor-enrollments/:id', 
    loadComponent: () => import('./investor-enrollments/admin-investor-enrollment-detail.component').then(m => m.AdminInvestorEnrollmentDetailComponent), 
    title: 'Investor Enrollment Detail' 
  },
  { 
    path: 'associates', 
    loadComponent: () => import('./associates/associates.component').then(m => m.AssociatesComponent) 
  },
  { 
    path: 'booking-report', 
    loadComponent: () => import('./booking-report/booking-report.component').then(m => m.BookingReportComponent), 
    title: 'Booking Report' 
  },
  { 
    path: 'sites', 
    loadComponent: () => import('./sites-mgmt/sites-mgmt.component').then(m => m.SitesMgmtComponent) 
  },
  { 
    path: 'new-site-area', 
    loadComponent: () => import('./new-site-area/new-site-area.component').then(m => m.NewSiteAreaComponent) 
  },
  { 
    path: 'plot-detector-tool', 
    loadComponent: () => import('./plot-detector-tool/plot-detector-tool.component').then(m => m.PlotDetectorToolComponent) 
  },
  { 
    path: 'plot-detector-2', 
    loadComponent: () => import('./plot-detector-2/plot-detector-2.component').then(m => m.PlotDetector2Component) 
  },
  { 
    path: 'plot-map-editor', 
    loadComponent: () => import('./plot-map-editor/plot-map-editor.component').then(m => m.PlotMapEditorComponent) 
  },
  { 
    path: 'booking-management', 
    loadComponent: () => import('./booking-management/booking-management.component').then(m => m.BookingManagementComponent) 
  },
  { 
    path: 'booking-workflow', 
    loadComponent: () => import('./booking-workflow/booking-workflow.component').then(m => m.BookingWorkflowComponent) 
  },
  { 
    path: 'emi-payments', 
    loadComponent: () => import('./emi-payments/emi-payments.component').then(m => m.EmiPaymentsComponent) 
  },
  { 
    path: 'commissions', 
    loadComponent: () => import('./commissions/commissions.component').then(m => m.CommissionsComponent) 
  },
  { 
    path: 'commission-settings', 
    loadComponent: () => import('./commission-settings/commission-settings.component').then(m => m.CommissionSettingsComponent) 
  },
  { 
    path: 'wallet-transactions', 
    loadComponent: () => import('./wallet-transactions/admin-wallet-transactions.component').then(m => m.AdminWalletTransactionsComponent) 
  },
  { 
    path: 'withdrawal-requests', 
    loadComponent: () => import('./withdrawal-requests/admin-withdrawal-requests.component').then(m => m.AdminWithdrawalRequestsComponent) 
  },
  { 
    path: 'orders-mgmt', 
    loadComponent: () => import('./orders-mgmt/orders-mgmt.component').then(m => m.AdminOrdersMgmtComponent) 
  },
  { 
    path: 'invoice-settings', 
    loadComponent: () => import('./invoice-settings/invoice-settings.component').then(m => m.AdminInvoiceSettingsComponent) 
  },
  { 
    path: 'emi-calculator-mgmt', 
    loadComponent: () => import('./emi-calculator-mgmt/emi-calculator-mgmt.component').then(m => m.EmiCalculatorMgmtComponent) 
  },
  { 
    path: 'buyback-terms', 
    loadComponent: () => import('./buyback-terms/buyback-terms.component').then(m => m.AdminBuybackTermsComponent) 
  },
  { 
    path: 'enquiries', 
    loadComponent: () => import('./enquiries/enquiries.component').then(m => m.EnquiriesComponent) 
  },
  { 
    path: 'book-plot-leads', 
    loadComponent: () => import('./book-plot-leads/book-plot-leads.component').then(m => m.BookPlotLeadsComponent) 
  },
  { 
    path: 'investors', 
    loadComponent: () => import('./investors/investors.component').then(m => m.AdminInvestorsComponent) 
  },
  { 
    path: 'investor-portal', 
    loadComponent: () => import('./investor-portal/investor-portal-admin.component').then(m => m.AdminInvestorPortalComponent) 
  },
  { 
    path: 'home-slider', 
    loadComponent: () => import('./home-slider/home-slider.component').then(m => m.HomeSliderComponent) 
  },
  { 
    path: 'home-page-settings', 
    loadComponent: () => import('./home-page-settings/home-page-settings.component').then(m => m.HomePageSettingsComponent) 
  },
  { 
    path: 'company-documents', 
    loadComponent: () => import('./company-documents/company-documents.component').then(m => m.AdminCompanyDocumentsComponent) 
  },
  { 
    path: 'mlm-pages', 
    loadComponent: () => import('./mlm-pages/mlm-admin-page.component').then(m => m.MlmAdminPageComponent) 
  },
  { 
    path: 'network-tree', 
    loadComponent: () => import('../shared/mlm-tree/mlm-tree.component').then(m => m.MlmTreeComponent), 
    data: { audience: 'admin' }, 
    title: 'Network Tree' 
  },
  { 
    path: 'mobile-app', 
    loadComponent: () => import('./mobile-app/mobile-app.component').then(m => m.MobileAppComponent) 
  },
  { 
    path: 'database-backup', 
    loadComponent: () => import('./database-backup/database-backup.component').then(m => m.DatabaseBackupComponent) 
  },
  { 
    path: 'whatsapp', 
    loadComponent: () => import('./whatsapp/whatsapp-admin.component').then(m => m.WhatsappAdminComponent) 
  },
  { 
    path: 'payment-gateways', 
    loadComponent: () => import('./payment-gateways/payment-gateway-settings/payment-gateway-settings.component').then(m => m.PaymentGatewaySettingsComponent) 
  },
  { 
    path: 'settings', 
    loadComponent: () => import('./settings/settings.component').then(m => m.AdminSettingsComponent) 
  },
  { 
    path: 'control', 
    loadComponent: () => import('./control/control.component').then(m => m.ControlComponent) 
  },
  { 
    path: 'change-password', 
    loadComponent: () => import('./change-password/change-password.component').then(m => m.ChangePasswordComponent) 
  },
];
