import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';

type PlotDetector2Status = 'Available' | 'Booked' | 'Processing' | 'Sold' | 'Reserved' | 'Cancelled';

@Component({
  selector: 'app-plot-detector-2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plot-detector-2.component.html',
  styleUrls: ['./plot-detector-2.component.css'],
})
export class PlotDetector2Component implements OnInit, OnDestroy {
  readonly statuses: PlotDetector2Status[] = ['Available', 'Booked', 'Processing', 'Sold', 'Reserved', 'Cancelled'];

  loading = true;
  saving = false;
  plotSaving = false;
  projects: any[] = [];
  activeProject: any = null;
  plots: any[] = [];
  selectedPlot: any = null;
  toast = '';
  toastType: 'success' | 'error' = 'success';
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  form = {
    project_id: null as number | null,
    total_plots: null as number | null,
  };

  plotForm: any = {
    customer_name: '',
    mobile_number: '',
    area: '',
    booking_date: '',
    purchase_date: '',
    payment_status: '',
    status: 'Available',
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadProjects();
    this.refreshTimer = setInterval(() => {
      const projectId = this.activeProject?.site_id || this.activeProject?.project_id;
      if (projectId && !this.saving && !this.plotSaving && !this.selectedPlot) {
        this.selectProject(projectId, false);
      }
    }, 15000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  get statusCounts() {
    return this.statuses.map(status => ({
      status,
      count: this.plots.filter(plot => this.displayStatus(plot.status || plot.plot_status) === status).length,
    }));
  }

  get gridLabelMode() {
    return this.plots.length > 120 ? 'number' : 'plot';
  }

  loadProjects(selectId?: number) {
    this.loading = true;
    this.api.adminGetSites().subscribe({
      next: (res: any) => {
        this.projects = (res?.data || []).map((site: any) => this.normalizeSite(site));
        const target = selectId
          ? this.projects.find(project => Number(project.site_id || project.project_id) === Number(selectId))
          : this.projects[0];
        if (target) {
          this.selectProject(target.site_id || target.project_id, false);
        } else {
          this.activeProject = null;
          this.plots = [];
          this.loading = false;
        }
      },
      error: (e: any) => {
        this.loading = false;
        this.showToast(e?.error?.message || 'Unable to load projects/sites.', 'error');
      },
    });
  }

  selectProject(projectId: number, showLoading = true) {
    if (!projectId) {
      this.activeProject = null;
      this.plots = [];
      return;
    }
    if (showLoading) this.loading = true;
    const project = this.projects.find(item => Number(item.site_id || item.project_id) === Number(projectId));
    this.api.adminGetSitePlots(projectId).subscribe({
      next: (res: any) => {
        this.activeProject = project || null;
        this.plots = (res?.data || []).map((plot: any) => this.normalizePlot(plot));
        this.form.project_id = this.activeProject?.site_id || this.activeProject?.project_id || projectId;
        this.form.total_plots = Math.max(Number(this.activeProject?.planned_total_plots || this.activeProject?.total_plots || 0), this.plots.length) || null;
        this.selectedPlot = null;
        this.loading = false;
      },
      error: (e: any) => {
        this.loading = false;
        this.showToast(e?.error?.message || 'Unable to load project layout.', 'error');
      },
    });
  }

  createProject() {
    const projectId = Number(this.form.project_id);
    const total = Number(this.form.total_plots);
    if (!Number.isInteger(projectId) || !Number.isInteger(total) || total <= 0) {
      this.showToast('Select project and enter valid total plots.', 'error');
      return;
    }

    this.saving = true;
    const existing = new Set(this.plots.map(plot => String(plot.plot_number || plot.plot_no)));
    const missing = Array.from({ length: total }, (_, index) => String(index + 1)).filter(plotNo => !existing.has(plotNo));

    if (!missing.length) {
      this.saving = false;
      this.showToast('Plot boxes already generated.');
      this.selectProject(projectId);
      return;
    }

    forkJoin(missing.map(plotNo => this.api.adminCreatePlot({
      site_id: projectId,
      plot_number: plotNo,
      plot_area: 1,
      plot_category: '100gaj',
      base_price: 1,
      down_payment: 0,
      monthly_emi: 0,
      emi_tenure_months: 60,
      file_charge: 0,
      plot_status: 'Vacant',
    }))).subscribe({
      next: () => {
        this.saving = false;
        this.showToast(`${missing.length} plot boxes generated.`);
        this.selectProject(projectId);
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message || 'Unable to generate plot boxes.', 'error');
      },
    });
  }

  openPlot(plot: any) {
    this.selectedPlot = plot;
    this.plotForm = {
      customer_name: plot.customer_name || '',
      mobile_number: plot.customer_mobile || plot.mobile_number || '',
      area: plot.area || plot.plot_area || '',
      booking_date: plot.booking_date ? String(plot.booking_date).slice(0, 10) : '',
      purchase_date: plot.purchase_date ? String(plot.purchase_date).slice(0, 10) : '',
      payment_status: plot.payment_status || 'Not Started',
      status: plot.status || 'Available',
    };
  }

  closePlot() {
    this.selectedPlot = null;
  }

  detailValue(value: any, fallback = '-') {
    if (value === undefined || value === null || value === '') return fallback;
    return value;
  }

  savePlot() {
    if (!this.selectedPlot) return;
    this.plotSaving = true;
    this.api.adminUpdatePlot(this.selectedPlot.plot_id, {
      plot_area: this.numericArea(this.plotForm.area),
      plot_status: this.dbStatus(this.plotForm.status),
      reason: 'Plot Detector 2 status update',
    }).subscribe({
      next: () => {
        this.plotSaving = false;
        this.selectProject(this.form.project_id || this.activeProject?.site_id || this.activeProject?.project_id, false);
        this.showToast('Plot details updated.');
      },
      error: (e: any) => {
        this.plotSaving = false;
        this.showToast(e?.error?.message || 'Unable to update plot details.', 'error');
      },
    });
  }

  statusClass(status: string) {
    return `status-${this.displayStatus(status).toLowerCase()}`;
  }

  displayStatus(status: string) {
    const clean = String(status || '').toLowerCase();
    if (clean === 'vacant') return 'Available';
    if (clean === 'inprocess') return 'Processing';
    return status || 'Available';
  }

  plotTooltip(plot: any) {
    const area = plot.area || plot.plot_area || '-';
    return `Plot No: ${plot.plot_no || plot.plot_number}\nStatus: ${this.displayStatus(plot.status || plot.plot_status)}\nArea: ${area}`;
  }

  private normalizeSite(site: any) {
    return {
      ...site,
      project_id: site.site_id,
      project_name: site.site_name,
      site_map_url: site.map_image_url || site.layout_map_url,
    };
  }

  private normalizePlot(plot: any) {
    const status = this.displayStatus(plot.status || plot.plot_status);
    return {
      ...plot,
      plot_no: plot.plot_no || plot.plot_number,
      area: plot.area || plot.plot_area,
      status,
      purchase_date: plot.purchase_date || plot.confirmed_at,
    };
  }

  private dbStatus(status: string) {
    const clean = this.displayStatus(status);
    if (clean === 'Available') return 'Vacant';
    if (clean === 'Processing' || clean === 'Reserved') return 'InProcess';
    if (clean === 'Cancelled') return 'Vacant';
    return clean;
  }

  private numericArea(area: any) {
    const value = Number(String(area || '').match(/\d+(\.\d+)?/)?.[0] || '');
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast = message;
    this.toastType = type;
    window.setTimeout(() => {
      if (this.toast === message) this.toast = '';
    }, 2600);
  }
}
