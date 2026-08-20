import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, BASE_URL } from '../../services/api.service';
import { SiteToggleService } from '../../services/site-toggle.service';

@Component({
  selector: 'app-sites-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sites-mgmt.component.html',
  styleUrls: ['./sites-mgmt.component.css']
})
export class SitesMgmtComponent implements OnInit {
  // --- API LOADER & ERROR STATES ---
  sitesLoading = false;
  sitesError: string | null = null;

  siteMapLoading = false;
  siteMapError: string | null = null;

  plotsLoading = false;
  plotsError: string | null = null;

  actionLoading = false;
  toast = '';

  // --- COMPONENT DATA STATE ---
  sites: any[] = [];
  activeSiteIdx = 0;
  activeSite: any = {};
  siteMapUrl = '';

  sitePlots: any[] = [];
  filteredPlots: any[] = [];

  isInteractive = true;
  selectedPlot: any = null;

  // --- FILTER & SEARCH ---
  plotFilter = 'all';
  plotSearch = '';

  // --- VIEWPORT ZOOM & PAN ---
  zoom = 1;
  pan = { x: 0, y: 0 };

  // --- MODAL FLAGS & MODELS ---
  showAddSite = false;
  showEditSite = false;
  showAddPlot = false;

  newSite = {
    site_name: '',
    city: '',
    state: 'Uttar Pradesh',
    full_address: '',
    description: '',
    nearest_place: '',
    landmark: '',
    highway_distance: '',
    airport_distance: '',
    is_booking_enabled: true
  };

  editSiteForm = {
    site_name: '',
    city: '',
    state: '',
    full_address: '',
    description: '',
    nearest_place: '',
    landmark: '',
    highway_distance: '',
    airport_distance: '',
    is_booking_enabled: true
  };

  newPlot = {
    plot_number: '',
    sqft: 1000,
    rate_per_sqft: 1200,
    facing_direction: 'East',
    plot_status: 'Available',
    khasra_number: ''
  };

  constructor(
    private api: ApiService,
    private siteToggle: SiteToggleService
  ) {}

  ngOnInit() {
    this.loadSites();
  }

  get propertyPlotMasterEnabled(): boolean {
    return this.siteToggle.isMasterPropertyPlotEnabled();
  }

  togglePropertyPlotMaster(enabled: boolean) {
    this.siteToggle.setMasterPropertyPlotEnabled(enabled);
  }

  // --- ASYNC API LOADERS ---

  async loadSites() {
    this.sitesLoading = true;
    this.sitesError = null;

    let hasAdminToken = false;
    try {
      const token = localStorage.getItem('mmr_admin_token');
      hasAdminToken = Boolean(token && token !== 'null' && token !== 'undefined');
    } catch (_) {}

    try {
      let res: any;
      if (hasAdminToken) {
        try {
          res = await firstValueFrom(this.api.adminGetSites());
        } catch (adminErr: any) {
          console.warn('GET /api/admin/sites failed/rejected:', adminErr);
          const status = adminErr?.status;
          const msg = adminErr?.error?.message || adminErr?.message || 'Unauthorized / Token Rejected';
          
          if (status === 401 || status === 403) {
            const alertText = `⚠️ Admin Session Token Rejected (HTTP ${status})\nReason: ${msg}\n\nYour Admin Session Token is invalid or expired. Showing fallback public site data. Please log in again as Admin.`;
            this.showToast('Admin Token Rejected: Session Expired');
            alert(alertText);
            this.sitesError = `Admin Token Rejected (HTTP ${status}): ${msg}. Showing public fallback.`;
          } else {
            this.sitesError = `Admin Sites API Error (HTTP ${status || 500}): ${msg}. Showing public fallback.`;
          }
          res = await firstValueFrom(this.api.getSites());
        }
      } else {
        this.sitesError = 'No Admin Token Found. Loaded public sites...';
        res = await firstValueFrom(this.api.getSites());
      }

      const list = res?.data || (Array.isArray(res) ? res : []);
      this.sites = Array.isArray(list) ? list : [];
      this.sitesLoading = false;

      if (this.sites.length > 0) {
        await this.selectSite(0);
      } else {
        this.activeSite = {};
        this.siteMapUrl = '';
        this.sitePlots = [];
        this.filteredPlots = [];
      }
    } catch (err: any) {
      console.error('Failed to load sites:', err);
      const msg = err?.error?.message || err?.message || 'Server connection failed';
      this.sitesError = `Sites API Error: ${msg}`;
      this.sitesLoading = false;
      alert(`⚠️ Connection Error\n${msg}`);
    }
  }

  async selectSite(idx: number) {
    try {
      this.activeSiteIdx = idx;
      this.activeSite = this.sites[idx] || {};
      const siteId = Number(this.activeSite?.site_id || this.activeSite?.id || 0);

      // Update Site Map Image URL
      const mapPath = this.activeSite?.map_image_url || this.activeSite?.layout_map_url || this.activeSite?.property_image_url || '';
      this.siteMapUrl = mapPath ? (typeof this.api?.url === 'function' ? this.api.url(mapPath) : mapPath) : '';

      const storedToggle = this.activeSite.is_booking_enabled !== undefined
        ? Boolean(this.activeSite.is_booking_enabled)
        : (siteId ? this.siteToggle.isSiteInteractive(siteId) : true);
      this.isInteractive = storedToggle;

      if (siteId) {
        this.siteToggle.setActiveSiteId(siteId);
        this.siteToggle.syncSiteInteractive(siteId, storedToggle);
      }

      this.selectedPlot = null;
      this.resetView();

      if (!siteId) {
        this.siteMapLoading = false;
        this.plotsLoading = false;
        this.sitePlots = [];
        this.filteredPlots = [];
        return;
      }

      this.siteMapLoading = true;
      this.siteMapError = null;
      this.plotsLoading = true;
      this.plotsError = null;

      // The admin sites response already contains the map fields. Avoid the
      // public map endpoint here because it repeats the plot and booking joins.
      this.siteMapLoading = false;
      await this.fetchPlotsAsync(siteId);
    } catch (err: any) {
      console.error('Error selecting site:', err);
      this.siteMapLoading = false;
      this.plotsLoading = false;
    }
  }

  async fetchPlotsAsync(siteId: number) {
    if (!siteId) return;
    this.plotsLoading = true;
    this.plotsError = null;

    try {
      let res: any;
      try {
        res = await firstValueFrom(this.api.adminGetSitePlots(siteId));
      } catch (adminPlotErr: any) {
        console.warn('adminGetSitePlots API failed/rejected:', adminPlotErr);
        const status = adminPlotErr?.status;
        const msg = adminPlotErr?.error?.message || adminPlotErr?.message || 'Admin plots request failed';
        if (status === 401 || status === 403) {
          this.plotsError = `Admin Token Rejected for Plots (${status}: ${msg}). Loaded fallback...`;
        } else {
          this.plotsError = `Admin Plots API Warning (${status || 500}). Loaded public plots...`;
        }
        res = await firstValueFrom(this.api.getSitePlots(siteId));
      }

      const plots = res?.data || (Array.isArray(res) ? res : []);
      this.sitePlots = this.processPlots(plots);
      this.applyPlotFilter();
      this.plotsLoading = false;
    } catch (err: any) {
      console.error('Failed to fetch plots:', err);
      this.plotsError = `Plots API Error: ${err?.error?.message || err?.message || 'Unable to fetch plot records'}`;
      this.plotsLoading = false;
    }
  }

  // --- FILTER & SEARCH LOGIC ---

  onFilterChange(filter: string) {
    this.plotFilter = filter;
    this.applyPlotFilter();
  }

  onSearchChange() {
    this.applyPlotFilter();
  }

  applyPlotFilter() {
    try {
      if (!Array.isArray(this.sitePlots)) {
        this.filteredPlots = [];
        return;
      }
      const q = String(this.plotSearch || '').trim().toLowerCase();
      this.filteredPlots = this.sitePlots.filter(p => {
        if (!p) return false;
        const matchFilter =
          this.plotFilter === 'all' ? true :
          this.plotFilter === 'vacant' ? (p.plot_status === 'Available' || p.plot_status === 'Vacant') :
          String(p.plot_status || '').toLowerCase() === String(this.plotFilter || '').toLowerCase();

        const matchSearch = !q ||
          String(p.plot_number || '').toLowerCase().includes(q) ||
          String(p.sqft || '').includes(q) ||
          String(p.facing_direction || '').toLowerCase().includes(q);

        return matchFilter && matchSearch;
      });
    } catch (e) {
      console.error('Error applying plot filter:', e);
      this.filteredPlots = [];
    }
  }

  // --- PLOT DATA PRE-PROCESSING ---

  processPlots(plots: any[]): any[] {
    if (!Array.isArray(plots)) return [];
    return plots.map(p => {
      try {
        const points = this.pointsForPlot(p);
        const polyStr = points.map(pt => `${pt.x},${pt.y}`).join(' ');
        const labelPt = points.length
          ? points.reduce((acc, pt) => ({ x: acc.x + pt.x / points.length, y: acc.y + pt.y / points.length }), { x: 0, y: 0 })
          : { x: 0, y: 0 };
        return {
          ...p,
          _polygonPoints: polyStr,
          _labelPoint: labelPt,
          _color: this.plotColor(p?.plot_status)
        };
      } catch (e) {
        return {
          ...p,
          _polygonPoints: '',
          _labelPoint: { x: 0, y: 0 },
          _color: '#16a34a'
        };
      }
    });
  }

  pointsForPlot(plot: any): { x: number; y: number }[] {
    try {
      if (!plot) return [];
      const raw = plot?.polygon_coordinates || plot?.polygon?.coordinates || plot?.coordinates;
      if (typeof raw === 'string' && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            return parsed.map((p: any) => Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p.x), y: Number(p.y) })
              .filter((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y));
          }
        } catch (_) {}
      }
      if (Array.isArray(raw) && raw.length) {
        return raw.map((p: any) => Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p.x), y: Number(p.y) })
          .filter((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y));
      }
      const xs = String(plot?.coordinates_x || '').split(',').map(v => Number(v.trim()));
      const ys = String(plot?.coordinates_y || '').split(',').map(v => Number(v.trim()));
      if (xs.length >= 3 && xs.length === ys.length && xs.every(Number.isFinite) && ys.every(Number.isFinite)) {
        return xs.map((x, i) => ({ x, y: ys[i] }));
      }
    } catch (_) {}
    return [];
  }

  plotColor(status: string): string {
    const clean = String(status || '').replace(/\s|_/g, '').toLowerCase();
    if (clean === 'vacant' || clean === 'available') return '#16a34a';
    if (clean === 'inprocess' || clean === 'paymentpending' || clean === 'processing') return '#eab308';
    if (clean === 'booked' || clean === 'hold') return '#ef4444';
    if (clean === 'sold') return '#6b7280';
    return '#16a34a';
  }

  // --- ACTIONS & MODALS ---

  toggleInteractiveMode(enabled: boolean) {
    const siteId = Number(this.activeSite?.site_id || this.activeSite?.id || 0);
    if (!siteId) return;
    this.isInteractive = enabled;
    this.activeSite.is_booking_enabled = enabled;
    this.siteToggle.setSiteInteractive(siteId, enabled);

    this.api.adminUpdateSite(siteId, { is_booking_enabled: enabled }).subscribe({
      next: () => {
        const siteName = this.activeSite.site_name || 'Site';
        this.showToast(enabled ? `Enable Plot Booking turned ON for ${siteName}` : `Enable Plot Booking turned OFF for ${siteName}`);
      },
      error: () => {
        const siteName = this.activeSite.site_name || 'Site';
        this.showToast(enabled ? `Enable Plot Booking turned ON for ${siteName}` : `Enable Plot Booking turned OFF for ${siteName}`);
      }
    });
  }

  async addSite() {
    if (!this.newSite.site_name || !this.newSite.city) {
      this.showToast('Site name and city are required');
      return;
    }
    this.actionLoading = true;
    try {
      const res: any = await firstValueFrom(this.api.adminCreateSite(this.newSite));
      if (res?.success || res?.site_id || res?.id) {
        this.showToast('Site created successfully!');
        this.showAddSite = false;
        await this.loadSites();
        this.newSite = {
          site_name: '',
          city: '',
          state: 'Uttar Pradesh',
          full_address: '',
          description: '',
          nearest_place: '',
          landmark: '',
          highway_distance: '',
          airport_distance: '',
          is_booking_enabled: true
        };
      }
      this.actionLoading = false;
    } catch (e: any) {
      const msg = e?.error?.message || 'Error creating site';
      this.showToast(msg);
      if (e?.status === 401 || e?.status === 403) {
        alert(`⚠️ Admin Action Unauthorized (HTTP ${e?.status})\nReason: ${msg}\n\nPlease re-login as Admin.`);
      }
      this.actionLoading = false;
    }
  }

  openEditSiteModal() {
    const s = this.activeSite;
    this.editSiteForm = {
      site_name: s?.site_name || '',
      city: s?.city || '',
      state: s?.state || 'Uttar Pradesh',
      full_address: s?.full_address || s?.address || '',
      description: s?.description || '',
      nearest_place: s?.nearest_place || '',
      landmark: s?.landmark || '',
      highway_distance: s?.highway_distance || '',
      airport_distance: s?.airport_distance || '',
      is_booking_enabled: s?.is_booking_enabled !== undefined ? Boolean(s.is_booking_enabled) : this.isInteractive
    };
    this.showEditSite = true;
  }

  async updateSite() {
    const siteId = Number(this.activeSite?.site_id || this.activeSite?.id || 0);
    if (!siteId) return;
    this.actionLoading = true;
    try {
      const res: any = await firstValueFrom(this.api.adminUpdateSite(siteId, this.editSiteForm));
      if (res?.success) {
        this.showToast('Site details updated!');
        this.showEditSite = false;
        this.isInteractive = Boolean(this.editSiteForm.is_booking_enabled);
        this.activeSite.is_booking_enabled = this.editSiteForm.is_booking_enabled;
        this.siteToggle.setSiteInteractive(siteId, this.editSiteForm.is_booking_enabled);
        await this.loadSites();
      }
      this.actionLoading = false;
    } catch (e: any) {
      const msg = e?.error?.message || 'Failed to update site';
      this.showToast(msg);
      if (e?.status === 401 || e?.status === 403) {
        alert(`⚠️ Admin Action Unauthorized (HTTP ${e?.status})\nReason: ${msg}\n\nPlease re-login as Admin.`);
      }
      this.actionLoading = false;
    }
  }

  openAddPlotModal() {
    this.newPlot = {
      plot_number: '',
      sqft: 1000,
      rate_per_sqft: 1200,
      facing_direction: 'East',
      plot_status: 'Available',
      khasra_number: ''
    };
    this.showAddPlot = true;
  }

  async saveNewPlot() {
    const siteId = Number(this.activeSite?.site_id || this.activeSite?.id || 0);
    if (!this.newPlot.plot_number || !siteId) {
      this.showToast('Plot number is required');
      return;
    }
    this.actionLoading = true;
    try {
      const res: any = await firstValueFrom(this.api.adminCreateSitePlot(siteId, this.newPlot));
      if (res?.success) {
        this.showToast(`Plot #${this.newPlot.plot_number} created successfully!`);
        this.showAddPlot = false;
        await this.selectSite(this.activeSiteIdx);
      }
      this.actionLoading = false;
    } catch (e: any) {
      const msg = e?.error?.message || 'Error creating plot';
      this.showToast(msg);
      if (e?.status === 401 || e?.status === 403) {
        alert(`⚠️ Admin Action Unauthorized (HTTP ${e?.status})\nReason: ${msg}\n\nPlease re-login as Admin.`);
      }
      this.actionLoading = false;
    }
  }

  async changePlotStatus(plot: any, newStatus: string) {
    if (!plot?.plot_id) return;
    try {
      const res: any = await firstValueFrom(this.api.adminUpdatePlotStatus(plot.plot_id, newStatus, 'Status changed by Admin'));
      if (res?.success) {
        plot.plot_status = newStatus;
        plot._color = this.plotColor(newStatus);
        this.showToast(`Plot #${plot.plot_number} status updated to ${newStatus}`);
      }
    } catch (e: any) {
      const msg = e?.error?.message || 'Failed to update plot status';
      this.showToast(msg);
      if (e?.status === 401 || e?.status === 403) {
        alert(`⚠️ Admin Action Unauthorized (HTTP ${e?.status})\nReason: ${msg}\n\nPlease re-login as Admin.`);
      }
    }
  }

  async uploadSiteImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    const siteId = Number(this.activeSite?.site_id || this.activeSite?.id || 0);
    if (!file || !siteId) return;
    if (!/\.(jpe?g|png|pdf|svg)$/i.test(file.name)) {
      this.showToast('Only JPG, JPEG, PNG, PDF, and SVG layout files are allowed.');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    const form = new FormData();
    form.append('site_map', file);
    form.append('map_image', file);
    this.actionLoading = true;
    try {
      const res: any = await firstValueFrom(this.api.adminUploadSiteMap(siteId, form));
      this.actionLoading = false;
      const url = res?.data?.map_image_url || res?.data?.url || res?.map_image_url;
      if (url) {
        this.activeSite.map_image_url = url;
        this.siteMapUrl = typeof this.api?.url === 'function' ? this.api.url(url) : url;
      }
      this.showToast('Site layout image uploaded successfully!');
      await this.selectSite(this.activeSiteIdx);
    } catch (e: any) {
      this.actionLoading = false;
      this.showToast(e?.error?.message || 'Failed to upload site image');
    }
  }

  removeSiteImage() {
    if (!this.activeSite) return;
    this.activeSite.map_image_url = '';
    this.activeSite.layout_map_url = '';
    this.siteMapUrl = '';
    this.showToast('Site image removed.');
  }

  zoomIn() {
    this.zoom = Math.min(4, Number((this.zoom + 0.25).toFixed(2)));
  }

  zoomOut() {
    this.zoom = Math.max(1, Number((this.zoom - 0.25).toFixed(2)));
    if (this.zoom === 1) this.pan = { x: 0, y: 0 };
  }

  resetView() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  selectPlot(plot: any) {
    this.selectedPlot = plot;
  }

  closeModals() {
    this.showAddSite = false;
    this.showEditSite = false;
    this.showAddPlot = false;
  }

  pct(s: any): number {
    if (!s) return 0;
    const t = Number(s.total_plots || 0);
    if (!t) return 0;
    const occupied = Number(s.booked || 0) + Number(s.sold || 0);
    return Math.round((occupied / t) * 100);
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
