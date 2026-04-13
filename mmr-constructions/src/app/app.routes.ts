import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';

// Admin
import { AdminLayoutComponent } from './admin/layout/layout.component';
import { AdminDashboardComponent } from './admin/dashboard/dashboard.component';
import { ApprovalsComponent } from './admin/approvals/approvals.component';
import { CustomersComponent } from './admin/customers/customers.component';
import { AssociatesComponent } from './admin/associates/associates.component';
import { SitesMgmtComponent } from './admin/sites-mgmt/sites-mgmt.component';
import { EmiPaymentsComponent } from './admin/emi-payments/emi-payments.component';
import { EnquiriesComponent } from './admin/enquiries/enquiries.component';
import { CommissionsComponent } from './admin/commissions/commissions.component';

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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',   component: AdminDashboardComponent },
      { path: 'approvals',   component: ApprovalsComponent },
      { path: 'customers',   component: CustomersComponent },
      { path: 'associates',  component: AssociatesComponent },
      { path: 'sites',       component: SitesMgmtComponent },
      { path: 'emi-payments',component: EmiPaymentsComponent },
      { path: 'enquiries',   component: EnquiriesComponent },
      { path: 'commissions', component: CommissionsComponent },
    ]
  },

  {
    path: 'user',
    component: UserLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',  component: UserDashboardComponent },
      { path: 'my-plots',   component: MyPlotsComponent },
      { path: 'emi-history',component: EmiHistoryComponent },
      { path: 'commission', component: CommissionTrackerComponent },
      { path: 'payments',   component: PaymentHistoryComponent },
      { path: 'documents',  component: DocumentsComponent },
      { path: 'referral',   component: ReferralComponent },
      { path: 'profile',    component: ProfileComponent },
    ]
  },

  { path: '**', redirectTo: '' }
];
