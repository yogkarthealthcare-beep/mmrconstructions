import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AdminAnalyticsComponent implements OnInit {
  loading = true;
  error = '';
  activeTab: string = 'overview';
  Math = Math;

  // Filters
  selectedPreset: string = '30d';
  selectedSiteId: string = '';
  customStartDate: string = '';
  customEndDate: string = '';
  lastUpdated: string = '';

  // Data Sources
  sitesList: any[] = [];
  data: any = null;

  // Property Sorting
  propertySortKey: string = 'sold_plots';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadSites();
    this.loadAnalytics();
  }

  loadSites() {
    this.api.get('/api/sites').subscribe({
      next: (res: any) => {
        this.sitesList = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {}
    });
  }

  loadAnalytics() {
    this.loading = true;
    this.error = '';

    const params: any = { preset: this.selectedPreset };
    if (this.selectedSiteId) params.site_id = this.selectedSiteId;
    if (this.selectedPreset === 'custom') {
      if (this.customStartDate) params.startDate = this.customStartDate;
      if (this.customEndDate) params.endDate = this.customEndDate;
    }

    this.api.getAdminAnalytics(params).subscribe({
      next: (res: any) => {
        this.data = res?.data || null;
        this.lastUpdated = res?.data?.lastUpdated || new Date().toISOString();
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Unable to load analytics data.';
        this.loading = false;
      }
    });
  }

  onPresetChange() {
    this.loadAnalytics();
  }

  onSiteFilterChange() {
    this.loadAnalytics();
  }

  refreshData() {
    this.loadAnalytics();
  }

  exportCsv() {
    this.api.exportAdminAnalyticsBlob(this.selectedPreset).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mmr-analytics-${this.selectedPreset}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Failed to export CSV report.');
      }
    });
  }

  sortProperties(key: string) {
    this.propertySortKey = key;
    if (!this.data?.projectPerformance) return;
    this.data.projectPerformance.sort((a: any, b: any) => {
      const valA = Number(a[key] || 0);
      const valB = Number(b[key] || 0);
      return valB - valA;
    });
  }

  formatCurrency(val: any): string {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN');
  }

  formatNumber(val: any): string {
    const num = Number(val || 0);
    return num.toLocaleString('en-IN');
  }

  getPlotBookingRate(sold: number, total: number): string {
    if (!total || total === 0) return '0%';
    return ((sold / total) * 100).toFixed(1) + '%';
  }
}
