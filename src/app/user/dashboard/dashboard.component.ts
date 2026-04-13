import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class UserDashboardComponent implements OnInit {
  loading = true;
  profile: any = {};
  emis: any[] = [];
  bookings: any[] = [];
  notifications: any[] = [];
  userData: any = {};

  get paidEmis()    { return this.emis.filter(e => e.emi_status === 'Paid').length; }
  get pendingEmis() { return this.emis.filter(e => e.emi_status === 'Pending' || e.emi_status === 'Overdue').length; }
  get nextEmi()     { return this.emis.find(e => e.emi_status === 'Pending'); }
  get totalPaid()   { return this.emis.filter(e => e.emi_status === 'Paid').reduce((s, e) => s + +e.paid_amount, 0); }

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.auth.user$.subscribe(u => this.userData = u);
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    Promise.all([
      this.api.getProfile().toPromise().then((r: any) => { if (r?.success) this.profile = r.data; }),
      this.api.getEmis().toPromise().then((r: any)    => { if (r?.success) this.emis = r.data || []; }),
      this.api.getBookings().toPromise().then((r: any) => { if (r?.success) this.bookings = r.data || []; }),
      this.api.getNotifications({ limit: 5 }).toPromise().then((r: any) => { if (r?.success) this.notifications = r.data?.notifications || []; }),
    ]).finally(() => this.loading = false);
  }

  get recentEmis() { return this.emis.filter(e => e.emi_status === 'Paid').slice(0, 5); }
  emiPct(b: any) {
    const total = this.emis.filter(e => e.plot_number === b.plot_number).length || 60;
    const paid  = this.emis.filter(e => e.plot_number === b.plot_number && e.emi_status === 'Paid').length;
    return total ? Math.round((paid / total) * 100) : 0;
  }
}
