import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { associateEnrollmentReducer } from './associate/enrollment/state/associate-enrollment.reducer';
import { AssociateEnrollmentEffects } from './associate/enrollment/state/associate-enrollment.effects';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { AdminLoginComponent } from './pages/admin-login/admin-login.component';
import { CompanyDocumentsComponent } from './pages/company-documents/company-documents.component';
import { LegalPageComponent } from './pages/legal-page/legal-page.component';
import { SiteMapComponent } from './pages/site-map/site-map.component';
import { SiteMapNewComponent } from './pages/site-map-new/site-map-new.component';
import { CustomerEnrollmentComponent } from './user/customer-enrollment/customer-enrollment.component';
import { SignupComponent } from './pages/signup/signup.component';
import { VerifyOtpComponent } from './pages/verify-otp/verify-otp.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ImpersonateLoginComponent } from './pages/impersonate-login/impersonate-login.component';

// Admin
import { adminGuard } from './shared/guards/admin.guard';
import { enrollmentGuard, customerGuard, associateGuard, investorGuard, userGuard } from './services/auth.guard';
import { AdminLayoutComponent } from './admin/layout/layout.component';
import { AdminDashboardComponent } from './admin/dashboard/dashboard.component';
import { AdminEnrollmentsComponent } from './admin/enrollments/admin-enrollments.component';
import { ControlComponent } from './admin/control/control.component';
import { ApprovalsComponent } from './admin/approvals/approvals.component';
import { CustomersComponent } from './admin/customers/customers.component';
import { AssociatesComponent } from './admin/associates/associates.component';
import { AdminInvestorEnrollmentsListComponent } from './admin/investor-enrollments/admin-investor-enrollments-list.component';
import { AdminInvestorEnrollmentDetailComponent } from './admin/investor-enrollments/admin-investor-enrollment-detail.component';
import { BookingReportComponent } from './admin/booking-report/booking-report.component';
import { SitesMgmtComponent } from './admin/sites-mgmt/sites-mgmt.component';
import { NewSiteAreaComponent } from './admin/new-site-area/new-site-area.component';
import { PlotDetectorToolComponent } from './admin/plot-detector-tool/plot-detector-tool.component';
import { PlotDetector2Component } from './admin/plot-detector-2/plot-detector-2.component';
import { PlotMapEditorComponent } from './admin/plot-map-editor/plot-map-editor.component';
import { BookingManagementComponent } from './admin/booking-management/booking-management.component';
import { BookingWorkflowComponent } from './admin/booking-workflow/booking-workflow.component';
import { EmiPaymentsComponent } from './admin/emi-payments/emi-payments.component';
import { EnquiriesComponent } from './admin/enquiries/enquiries.component';
import { BookPlotLeadsComponent } from './admin/book-plot-leads/book-plot-leads.component';
import { CommissionsComponent } from './admin/commissions/commissions.component';
import { CommissionSettingsComponent } from './admin/commission-settings/commission-settings.component';
import { AdminWalletTransactionsComponent } from './admin/wallet-transactions/admin-wallet-transactions.component';
import { AdminWithdrawalRequestsComponent } from './admin/withdrawal-requests/admin-withdrawal-requests.component';
import { AdminOrdersMgmtComponent } from './admin/orders-mgmt/orders-mgmt.component';
import { AdminInvoiceSettingsComponent } from './admin/invoice-settings/invoice-settings.component';
import { EmiCalculatorMgmtComponent } from './admin/emi-calculator-mgmt/emi-calculator-mgmt.component';
import { AdminBuybackTermsComponent } from './admin/buyback-terms/buyback-terms.component';
import { DatabaseBackupComponent } from './admin/database-backup/database-backup.component';
import { AdminAnalyticsComponent } from './admin/analytics/analytics.component';
import { HomeSliderComponent } from './admin/home-slider/home-slider.component';
import { HomePageSettingsComponent } from './admin/home-page-settings/home-page-settings.component';
import { AdminCompanyDocumentsComponent } from './admin/company-documents/company-documents.component';
import { MlmAdminPageComponent } from './admin/mlm-pages/mlm-admin-page.component';
import { MobileAppComponent } from './admin/mobile-app/mobile-app.component';
import { AdminInvestorsComponent } from './admin/investors/investors.component';
import { AdminInvestorPortalComponent } from './admin/investor-portal/investor-portal-admin.component';
import { WhatsappAdminComponent } from './admin/whatsapp/whatsapp-admin.component';
import { PaymentGatewaySettingsComponent } from './admin/payment-gateways/payment-gateway-settings/payment-gateway-settings.component';
import { AdminSettingsComponent } from './admin/settings/settings.component';
import { ChangePasswordComponent } from './admin/change-password/change-password.component';

// User
import { UserLayoutComponent } from './user/layout/layout.component';
import { UserDashboardComponent } from './user/dashboard/dashboard.component';
import { MyPlotsComponent } from './user/my-plots/my-plots.component';
import { EmiHistoryComponent } from './user/emi-history/emi-history.component';
import { CommissionTrackerComponent } from './user/commission-tracker/commission-tracker.component';
import { PaymentHistoryComponent } from './user/payment-history/payment-history.component';
import { DocumentsComponent } from './user/documents/documents.component';
import { ReferralComponent } from './user/referral/referral.component';
import { ProfileComponent } from './user/profile/profile.component';
import { NotificationsComponent } from './user/notifications/notifications.component';
import { BuybackComponent } from './user/buyback/buyback.component';
import { MyTeamComponent } from './user/my-team/my-team.component';
import { WalletComponent } from './user/wallet/wallet.component';
import { AddFundComponent } from './user/wallet/add-fund.component';
import { WithdrawFundComponent } from './user/wallet/withdraw-fund.component';
import { WalletTransactionsComponent } from './user/wallet/wallet-transactions.component';
import { WithdrawalHistoryComponent } from './user/wallet/withdrawal-history.component';

// Investor
import { InvestorLayoutComponent } from './investor/investor-layout/investor-layout.component';
import { InvestorDashboardComponent } from './investor/investor-dashboard/investor-dashboard.component';
import { InvestorWalletComponent } from './investor/investor-wallet/investor-wallet.component';
import { InvestorDepositComponent } from './investor/investor-deposit/investor-deposit.component';
import { InvestorWithdrawalComponent } from './investor/investor-withdrawal/investor-withdrawal.component';
import { InvestorPaymentsComponent } from './investor/investor-payments/investor-payments.component';
import { InvestorProfileComponent } from './investor/investor-profile/investor-profile.component';
import { InvestorEnrollmentComponent } from './investor/investor-enrollment/investor-enrollment.component';
import { InvestorDocumentsComponent } from './investor/investor-documents/investor-documents.component';
import { InvestorSettlementComponent } from './investor/investor-settlement/investor-settlement.component';
import { InvestorChangePasswordComponent } from './investor/investor-change-password/investor-change-password.component';

import { BlogListComponent } from './pages/blog-list/blog-list.component';
import { BlogDetailComponent } from './pages/blog-detail/blog-detail.component';
import { AllInvestorsComponent } from './pages/all-investors/all-investors.component';
import { AllSitesComponent } from './pages/all-sites/all-sites.component';
import { MlmTreeComponent } from './shared/mlm-tree/mlm-tree.component';

export const routes: Routes = [
  { path: '',                     component: HomeComponent },
  { path: 'login',                component: LoginComponent },
  { path: 'register',             component: SignupComponent },
  { path: 'signup',               component: SignupComponent },
  { path: 'registration',         component: SignupComponent },
  { path: 'register-old',         component: RegisterComponent },
  { path: 'verify-otp',           component: VerifyOtpComponent },
  { path: 'forgot-password',       component: ForgotPasswordComponent },
  { path: 'auth/impersonate-login', component: ImpersonateLoginComponent },
  { path: 'impersonate-login',      component: ImpersonateLoginComponent },
  { path: 'admin-login',          component: AdminLoginComponent },
  { path: 'investors',            component: AllInvestorsComponent },
  { path: 'blog',                 component: BlogListComponent },
  { path: 'blog/:slug',           component: BlogDetailComponent },
  { path: 'company-documents',    component: CompanyDocumentsComponent },
  { path: 'privacy-policy',       component: LegalPageComponent, data: { type: 'privacy' } },
  { path: 'terms-and-conditions', component: LegalPageComponent, data: { type: 'terms' } },
  { path: 'site-map/:id',         component: SiteMapComponent },
  { path: 'site-map',             component: SiteMapComponent },
  { path: 'site-map-new/:id',     component: SiteMapNewComponent },
  { path: 'site-map-new',         component: SiteMapNewComponent },
  { path: 'all-sites',            component: AllSitesComponent },

  {
    path: 'admin', component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '',                     redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',           component: AdminDashboardComponent },
      { path: 'analytics',           component: AdminAnalyticsComponent },
      { path: 'approvals',           component: ApprovalsComponent },
      { path: 'enrollments',         component: AdminEnrollmentsComponent, title: 'Enrollment Management' },
      { path: 'customers',           component: CustomersComponent },
      { path: 'investor-enrollments', component: AdminInvestorEnrollmentsListComponent, title: 'Investor Enrollments' },
      { path: 'investor-enrollments/:id', component: AdminInvestorEnrollmentDetailComponent, title: 'Investor Enrollment Detail' },
      { path: 'associates',          component: AssociatesComponent },
      { path: 'booking-report',      component: BookingReportComponent, title: 'Booking Report' },
      { path: 'sites',               component: SitesMgmtComponent },
      { path: 'new-site-area',        component: NewSiteAreaComponent },
      { path: 'plot-detector-tool',  component: PlotDetectorToolComponent },
      { path: 'plot-detector-2',     component: PlotDetector2Component },
      { path: 'plot-map-editor',     component: PlotMapEditorComponent },
      { path: 'booking-management',  component: BookingManagementComponent },
      { path: 'booking-workflow',    component: BookingWorkflowComponent },
      { path: 'emi-payments',        component: EmiPaymentsComponent },
      { path: 'commissions',         component: CommissionsComponent },
      { path: 'commission-settings', component: CommissionSettingsComponent },
      { path: 'wallet-transactions', component: AdminWalletTransactionsComponent },
      { path: 'withdrawal-requests', component: AdminWithdrawalRequestsComponent },
      { path: 'orders-mgmt',         component: AdminOrdersMgmtComponent },
      { path: 'invoice-settings',    component: AdminInvoiceSettingsComponent },
      { path: 'emi-calculator-mgmt', component: EmiCalculatorMgmtComponent },
      { path: 'buyback-terms',       component: AdminBuybackTermsComponent },
      { path: 'enquiries',           component: EnquiriesComponent },
      { path: 'book-plot-leads',     component: BookPlotLeadsComponent },
      { path: 'investors',           component: AdminInvestorsComponent },
      { path: 'investor-portal',     component: AdminInvestorPortalComponent },
      { path: 'home-slider',         component: HomeSliderComponent },
      { path: 'home-page-settings',  component: HomePageSettingsComponent },
      { path: 'company-documents',   component: AdminCompanyDocumentsComponent },
      { path: 'mlm-pages',           component: MlmAdminPageComponent },
      { path: 'network-tree',        component: MlmTreeComponent, data: { audience: 'admin' }, title: 'Network Tree' },
      { path: 'mobile-app',          component: MobileAppComponent },
      { path: 'database-backup',     component: DatabaseBackupComponent },
      { path: 'whatsapp',            component: WhatsappAdminComponent },
      { path: 'payment-gateways',    component: PaymentGatewaySettingsComponent },
      { path: 'settings',            component: AdminSettingsComponent },
      { path: 'control',             component: ControlComponent },
      { path: 'change-password',     component: ChangePasswordComponent },
    ]
  },

  {
    path: 'user', component: UserLayoutComponent,
    canActivate: [userGuard],
    canActivateChild: [enrollmentGuard],
    children: [
      { path: '',                        redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',              component: UserDashboardComponent },
      { path: 'wallet',                 component: WalletComponent },
      { path: 'wallet/add-fund',        component: AddFundComponent },
      { path: 'wallet/withdraw',        component: WithdrawFundComponent },
      { path: 'wallet/transactions',    component: WalletTransactionsComponent },
      { path: 'wallet/withdrawal-history', component: WithdrawalHistoryComponent },
      { path: 'my-plots',               component: MyPlotsComponent },
      { path: 'emi-history',            component: EmiHistoryComponent },
      { path: 'commission',             component: CommissionTrackerComponent },
      { path: 'payments',               component: PaymentHistoryComponent },
      { path: 'documents',              component: DocumentsComponent },
      { path: 'my-team',                component: MyTeamComponent },
      { path: 'network-tree',           component: MlmTreeComponent, data: { audience: 'associate' }, title: 'My Network Tree' },
      { path: 'referral',               component: ReferralComponent },
      { path: 'profile',                component: ProfileComponent },
      { path: 'notifications',          component: NotificationsComponent },
      { path: 'buyback',                component: BuybackComponent },
    ]
  },

  {
    path: 'associate', component: UserLayoutComponent,
    canActivate: [associateGuard],
    canActivateChild: [enrollmentGuard],
    children: [
      { path: '',                        redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',              component: UserDashboardComponent },
      { path: 'wallet',                 component: WalletComponent },
      { path: 'wallet/add-fund',        component: AddFundComponent },
      { path: 'wallet/withdraw',        component: WithdrawFundComponent },
      { path: 'wallet/transactions',    component: WalletTransactionsComponent },
      { path: 'wallet/withdrawal-history', component: WithdrawalHistoryComponent },
      { path: 'my-plots',               component: MyPlotsComponent },
      { path: 'emi-history',            component: EmiHistoryComponent },
      { path: 'commission',             component: CommissionTrackerComponent },
      { path: 'payments',               component: PaymentHistoryComponent },
      { path: 'documents',              component: DocumentsComponent },
      { path: 'my-team',                component: MyTeamComponent },
      { path: 'network-tree',           component: MlmTreeComponent, data: { audience: 'associate' }, title: 'My Network Tree' },
      { path: 'referral',               component: ReferralComponent },
      { path: 'profile',                component: ProfileComponent },
      { path: 'notifications',          component: NotificationsComponent },
      { path: 'buyback',                component: BuybackComponent },
      {
        path: 'enrollment',
        loadComponent: () => import('./associate/enrollment/associate-enrollment-form.component').then(m => m.AssociateEnrollmentFormComponent),
        providers: [
          provideState({ name: 'associateEnrollment', reducer: associateEnrollmentReducer }),
          provideEffects(AssociateEnrollmentEffects)
        ]
      },
    ]
  },

  {
    path: 'customer', component: UserLayoutComponent,
    canActivate: [customerGuard],
    canActivateChild: [enrollmentGuard],
    children: [
      { path: '',                        redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',              component: UserDashboardComponent },
      { path: 'wallet',                 component: WalletComponent },
      { path: 'wallet/add-fund',        component: AddFundComponent },
      { path: 'wallet/withdraw',        component: WithdrawFundComponent },
      { path: 'wallet/transactions',    component: WalletTransactionsComponent },
      { path: 'wallet/withdrawal-history', component: WithdrawalHistoryComponent },
      { path: 'my-plots',               component: MyPlotsComponent },
      { path: 'emi-history',            component: EmiHistoryComponent },
      { path: 'commission',             component: CommissionTrackerComponent },
      { path: 'payments',               component: PaymentHistoryComponent },
      { path: 'documents',              component: DocumentsComponent },
      { path: 'my-team',                component: MyTeamComponent },
      { path: 'network-tree',           component: MlmTreeComponent, data: { audience: 'associate' }, title: 'My Network Tree' },
      { path: 'referral',               component: ReferralComponent },
      { path: 'profile',                component: ProfileComponent },
      { path: 'notifications',          component: NotificationsComponent },
      { path: 'buyback',                component: BuybackComponent },
      { path: 'enrollment',             component: CustomerEnrollmentComponent },
    ]
  },

  {
    path: 'investor', component: InvestorLayoutComponent,
    canActivate: [investorGuard],
    canActivateChild: [enrollmentGuard],
    children: [
      { path: '',               redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     component: InvestorDashboardComponent },
      { path: 'wallet',        component: InvestorWalletComponent },
      { path: 'deposit',       component: InvestorDepositComponent },
      { path: 'withdrawal',    component: InvestorWithdrawalComponent },
      { path: 'payments',      component: InvestorPaymentsComponent },
      { path: 'payment-history', component: InvestorPaymentsComponent },
      { path: 'transactions',  component: InvestorPaymentsComponent },
      { path: 'settlement',    component: InvestorSettlementComponent },
      { path: 'documents',     component: InvestorDocumentsComponent },
      { path: 'profile',       component: InvestorProfileComponent },
      { path: 'change-password', component: InvestorChangePasswordComponent },
      { path: 'enrollment',    component: InvestorEnrollmentComponent },
    ]
  },

  { path: '**', redirectTo: '' }
];
