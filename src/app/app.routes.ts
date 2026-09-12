import { Routes } from '@angular/router';
import { adminGuard } from './shared/guards/admin.guard';
import { enrollmentGuard, customerGuard, associateGuard, investorGuard, userGuard } from './services/auth.guard';

export const routes: Routes = [
  // Public Pages (Lazy Loaded)
  { 
    path: '', 
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'MMR Constructions & Developers — Premium Plots | Kanpur · Unnao · Lucknow'
  },
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Login — MMR Constructions'
  },
  { 
    path: 'register', 
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent),
    title: 'Register — MMR Constructions'
  },
  { 
    path: 'signup', 
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent),
    title: 'Sign Up — MMR Constructions'
  },
  { 
    path: 'registration', 
    loadComponent: () => import('./pages/signup/signup.component').then(m => m.SignupComponent),
    title: 'Registration — MMR Constructions'
  },
  { 
    path: 'register-old', 
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) 
  },
  { 
    path: 'verify-otp', 
    loadComponent: () => import('./pages/verify-otp/verify-otp.component').then(m => m.VerifyOtpComponent),
    title: 'Verify OTP — MMR Constructions'
  },
  { 
    path: 'forgot-password', 
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Forgot Password — MMR Constructions'
  },
  { 
    path: 'auth/impersonate-login', 
    loadComponent: () => import('./pages/impersonate-login/impersonate-login.component').then(m => m.ImpersonateLoginComponent) 
  },
  { 
    path: 'impersonate-login', 
    loadComponent: () => import('./pages/impersonate-login/impersonate-login.component').then(m => m.ImpersonateLoginComponent) 
  },
  { 
    path: 'admin-login', 
    loadComponent: () => import('./pages/admin-login/admin-login.component').then(m => m.AdminLoginComponent),
    title: 'Admin Portal Login — MMR Constructions'
  },
  { 
    path: 'investor-login', 
    loadComponent: () => import('./investor/investor-login/investor-login.component').then(m => m.InvestorLoginComponent),
    title: 'Investor Login — MMR Constructions'
  },
  { 
    path: 'investor/login', 
    loadComponent: () => import('./investor/investor-login/investor-login.component').then(m => m.InvestorLoginComponent),
    title: 'Investor Login — MMR Constructions'
  },
  { 
    path: 'investor/signup', 
    loadComponent: () => import('./investor/investor-signup/investor-signup.component').then(m => m.InvestorSignupComponent),
    title: 'Investor Registration — MMR Constructions'
  },
  { 
    path: 'investor/register', 
    loadComponent: () => import('./investor/investor-signup/investor-signup.component').then(m => m.InvestorSignupComponent),
    title: 'Investor Registration — MMR Constructions'
  },
  { 
    path: 'investor/forgot-password', 
    loadComponent: () => import('./investor/investor-forgot-password/investor-forgot-password.component').then(m => m.InvestorForgotPasswordComponent) 
  },
  { 
    path: 'investors', 
    loadComponent: () => import('./pages/all-investors/all-investors.component').then(m => m.AllInvestorsComponent),
    title: 'Investor Opportunities & Guaranteed Returns — MMR Constructions'
  },
  { 
    path: 'blog', 
    loadComponent: () => import('./pages/blog-list/blog-list.component').then(m => m.BlogListComponent),
    title: 'Real Estate Blogs & Property Insights — MMR Constructions'
  },
  { 
    path: 'blog/:slug', 
    loadComponent: () => import('./pages/blog-detail/blog-detail.component').then(m => m.BlogDetailComponent) 
  },
  { 
    path: 'company-documents', 
    loadComponent: () => import('./pages/company-documents/company-documents.component').then(m => m.CompanyDocumentsComponent),
    title: 'Company Legal Documents & Certificates — MMR Constructions'
  },
  { 
    path: 'privacy-policy', 
    loadComponent: () => import('./pages/legal-page/legal-page.component').then(m => m.LegalPageComponent), 
    data: { type: 'privacy' },
    title: 'Privacy Policy — MMR Constructions'
  },
  { 
    path: 'terms-and-conditions', 
    loadComponent: () => import('./pages/legal-page/legal-page.component').then(m => m.LegalPageComponent), 
    data: { type: 'terms' },
    title: 'Terms and Conditions — MMR Constructions'
  },
  { 
    path: 'site-map/:id', 
    loadComponent: () => import('./pages/site-map/site-map.component').then(m => m.SiteMapComponent),
    title: 'Interactive Site Map Viewer — MMR Constructions'
  },
  { 
    path: 'site-map', 
    loadComponent: () => import('./pages/site-map/site-map.component').then(m => m.SiteMapComponent),
    title: 'Interactive Site Map Viewer — MMR Constructions'
  },
  { 
    path: 'site-map-new/:id', 
    loadComponent: () => import('./pages/site-map-new/site-map-new.component').then(m => m.SiteMapNewComponent) 
  },
  { 
    path: 'site-map-new', 
    loadComponent: () => import('./pages/site-map-new/site-map-new.component').then(m => m.SiteMapNewComponent) 
  },
  { 
    path: 'all-sites', 
    loadComponent: () => import('./pages/all-sites/all-sites.component').then(m => m.AllSitesComponent),
    title: 'All Property Sites & Plots — MMR Constructions'
  },

  // Feature Tree: Admin (Lazy Loaded Layout & Routes)
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },

  // Feature Tree: User (Lazy Loaded Layout & Routes)
  {
    path: 'user',
    loadComponent: () => import('./user/layout/layout.component').then(m => m.UserLayoutComponent),
    canActivate: [userGuard],
    canActivateChild: [enrollmentGuard],
    loadChildren: () => import('./user/user.routes').then(m => m.USER_ROUTES)
  },

  // Feature Tree: Associate (Lazy Loaded Layout & Routes)
  {
    path: 'associate',
    loadComponent: () => import('./user/layout/layout.component').then(m => m.UserLayoutComponent),
    canActivate: [associateGuard],
    canActivateChild: [enrollmentGuard],
    loadChildren: () => import('./associate/associate.routes').then(m => m.ASSOCIATE_ROUTES)
  },

  // Feature Tree: Customer (Lazy Loaded Layout & Routes)
  {
    path: 'customer',
    loadComponent: () => import('./user/layout/layout.component').then(m => m.UserLayoutComponent),
    canActivate: [customerGuard],
    canActivateChild: [enrollmentGuard],
    loadChildren: () => import('./user/user.routes').then(m => m.USER_ROUTES)
  },

  // Feature Tree: Investor (Lazy Loaded Layout & Routes)
  {
    path: 'investor',
    loadComponent: () => import('./investor/investor-layout/investor-layout.component').then(m => m.InvestorLayoutComponent),
    canActivate: [investorGuard],
    canActivateChild: [enrollmentGuard],
    loadChildren: () => import('./investor/investor.routes').then(m => m.INVESTOR_ROUTES)
  },

  // Error & Fallback Routes
  { 
    path: '404', 
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Page Not Found — MMR Constructions'
  },
  { 
    path: 'not-found', 
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Page Not Found — MMR Constructions'
  },
  { 
    path: 'error', 
    loadComponent: () => import('./pages/error/error.component').then(m => m.ErrorComponent),
    title: 'Error — MMR Constructions'
  },
  { 
    path: 'something-went-wrong', 
    loadComponent: () => import('./pages/error/error.component').then(m => m.ErrorComponent),
    title: 'Error — MMR Constructions'
  },
  { 
    path: '**', 
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Page Not Found — MMR Constructions'
  }
];
