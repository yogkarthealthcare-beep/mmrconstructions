import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  loading = true;
  profile: any = {};
  emis: any[] = [];
  bookings: any[] = [];
  notifications: any[] = [];
  userData: any = {};
  assocStats: any = null;
  dashboardOverview: any = null;
  walletData: any = null;
  copiedLink = false;

  recentEmisList: any[] = [];

  get isAssociate() {
    return (this.profile?.user_type || this.userData?.user_type) === 'Associate';
  }

  get basePrefix(): string {
    return this.isAssociate ? '/associate' : '/user';
  }

  get isInvestor() {
    return (this.profile?.user_type || this.userData?.user_type) === 'Investor';
  }

  get referralCode() {
    return this.profile?.invitation_code || this.profile?.member_id || this.userData?.invitation_code || this.userData?.member_id || '';
  }

  get referralLink() {
    const code = this.referralCode;
    return code ? `https://mmrconstructions.in/register?ref=${code}` : 'https://mmrconstructions.in/register';
  }

  get paidEmis()    { return this.emis.filter(e => e.emi_status === 'Paid').length; }
  get pendingEmis() { return this.emis.filter(e => e.emi_status === 'Pending' || e.emi_status === 'Overdue').length; }
  get nextEmi()     { return this.emis.find(e => e.emi_status === 'Pending'); }
  get totalPaid()   { return this.emis.filter(e => e.emi_status === 'Paid').reduce((s, e) => s + +e.paid_amount, 0); }
  get recentEmis()  { return this.recentEmisList; }

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.auth.user$.subscribe(u => {
      this.userData = u || {};
    });
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    Promise.all([
      this.api.getProfile().toPromise().then((r: any) => {
        if (r?.success) this.profile = r.data || {};
      }).catch(err => console.warn('Profile fetch error:', err)),

      this.api.getWalletBalance().toPromise().then((r: any) => {
        if (r?.success) this.walletData = r.data || {};
      }).catch(err => console.warn('Wallet balance fetch error:', err)),

      this.api.getEmis().toPromise().then((r: any) => {
        if (r?.success) {
          this.emis = r.data || [];
          this.recentEmisList = this.emis.filter(e => e.emi_status === 'Paid').slice(0, 5);
        }
      }).catch(err => console.warn('EMIs fetch error:', err)),

      this.api.getBookings().toPromise().then((r: any) => {
        if (r?.success) this.bookings = r.data || [];
      }).catch(err => console.warn('Bookings fetch error:', err)),

      this.api.getNotifications({ limit: 5 }).toPromise().then((r: any) => {
        if (r?.success) this.notifications = r.data?.notifications || [];
      }).catch(err => console.warn('Notifications fetch error:', err)),

      this.api.getAssocDashboard().toPromise().then((r: any) => {
        if (r?.success) this.assocStats = r.data || {};
      }).catch(err => console.warn('AssocStats fetch error:', err)),

      this.api.getDashboardOverview().toPromise().then((r: any) => {
        if (r?.success) this.dashboardOverview = r.data || {};
      }).catch(err => console.warn('DashboardOverview fetch error:', err))
    ]).finally(() => {
      this.loading = false;
    });
  }

  copyReferralLink() {
    navigator.clipboard.writeText(this.referralLink);
    this.copiedLink = true;
    setTimeout(() => this.copiedLink = false, 2500);
  }

  shareOnWhatsapp() {
    const text = encodeURIComponent(`MMR Constructions & Developers Pvt. Ltd. में plot book करें! मेरा Referral Code: ${this.referralCode} \nरजिस्टर करने के लिए लिंक पर क्लिक करें: ${this.referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  emiPct(b: any) {
    const total = this.emis.filter(e => e.plot_number === b.plot_number).length || 60;
    const paid  = this.emis.filter(e => e.plot_number === b.plot_number && e.emi_status === 'Paid').length;
    return total ? Math.round((paid / total) * 100) : 0;
  }
}
