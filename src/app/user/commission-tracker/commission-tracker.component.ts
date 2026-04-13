import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-commission-tracker', standalone: true, imports: [CommonModule], templateUrl: './commission-tracker.component.html' })
export class CommissionTrackerComponent implements OnInit {
  loading = true;
  dashData: any = {}; network: any[] = []; commissions: any[] = [];
  activeTab = 'commissions';

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getAssocDashboard().subscribe({
      next: (res: any) => { if (res.success) this.dashData = res.data || {}; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.api.getAssocCommissions().subscribe({
      next: (res: any) => { if (res.success) this.commissions = res.data?.commissions || []; }
    });
    this.api.getAssocNetwork().subscribe({
      next: (res: any) => { if (res.success) this.network = res.data || []; }
    });
  }
  get tracker()  { return this.dashData.tracker || {}; }
  get pct()      { const g = +this.tracker.total_gaj_sold || 0; return Math.min(100, Math.round((g/2000)*100)); }
}
