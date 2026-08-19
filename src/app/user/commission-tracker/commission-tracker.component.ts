import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-commission-tracker',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './commission-tracker.component.html',
  styleUrls: ['./commission-tracker.component.css']
})
export class CommissionTrackerComponent implements OnInit {
  loading = true;
  dashData: any = {};
  network: any[] = [];
  commissions: any[] = [];
  activeTab: 'commissions' | 'network' = 'commissions';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    this.loading = true;
    Promise.all([
      this.api.getAssocDashboard().toPromise().then((res: any) => {
        if (res?.success) this.dashData = res.data || {};
      }).catch(() => {}),
      this.api.getAssocCommissions().toPromise().then((res: any) => {
        if (res?.success) this.commissions = res.data?.commissions || res.data || [];
      }).catch(() => {}),
      this.api.getAssocNetwork().toPromise().then((res: any) => {
        if (res?.success) this.network = res.data || [];
      }).catch(() => {})
    ]).finally(() => {
      this.loading = false;
    });
  }

  get tracker() { return this.dashData.tracker || {}; }
  get totalGajSold() { return Number(this.tracker.total_gaj_sold || 0); }
  get pct() { return Math.min(100, Math.round((this.totalGajSold / 2000) * 100)); }
  get gajRemaining() { return Math.max(0, 2000 - this.totalGajSold); }
  get totalEarned() { return Number(this.tracker.total_commission_earned || 0); }
  get pendingCommission() { return Number(this.dashData.pending_commission || 0); }
  get monthlyNet() { return Number(this.dashData.current_monthly_net || 0); }
}
