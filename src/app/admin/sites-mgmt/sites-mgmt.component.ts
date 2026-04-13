import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-sites-mgmt', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './sites-mgmt.component.html' })
export class SitesMgmtComponent implements OnInit {
  loading = true; activeSiteIdx = 0;
  sites: any[] = []; sitePlots: any[] = [];
  plotsLoading = false; toast = '';
  showAddSite = false;
  newSite = { site_name: '', city: '', state: 'Uttar Pradesh', full_address: '' };

  constructor(private api: ApiService) {}
  ngOnInit() { this.loadSites(); }

  loadSites() {
    this.loading = true;
    this.api.adminGetSites().subscribe({
      next: (res: any) => {
        if (res.success) { this.sites = res.data || []; if (this.sites.length) this.selectSite(0); }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  selectSite(idx: number) {
    this.activeSiteIdx = idx;
    const site = this.sites[idx];
    if (!site) return;
    this.plotsLoading = true;
    this.api.getSitePlots(site.site_id).subscribe({
      next: (res: any) => { if (res.success) this.sitePlots = res.data || []; this.plotsLoading = false; },
      error: () => { this.plotsLoading = false; }
    });
  }

  get activeSite() { return this.sites[this.activeSiteIdx] || {}; }

  addSite() {
    this.api.adminCreateSite(this.newSite).subscribe({
      next: (res: any) => {
        if (res.success) { this.showToast('Site created!'); this.showAddSite = false; this.loadSites(); this.newSite = { site_name:'', city:'', state:'Uttar Pradesh', full_address:'' }; }
      },
      error: (e: any) => this.showToast(e?.error?.message || 'Error creating site')
    });
  }

  pct(s: any) { const t = +s.total_plots || 0; return t ? Math.round(((+s.booked + +s.sold) / t) * 100) : 0; }
  showToast(msg: string) { this.toast = msg; setTimeout(() => this.toast = '', 3000); }
}
