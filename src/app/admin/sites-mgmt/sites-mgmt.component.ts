import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SiteToggleService } from '../../services/site-toggle.service';

@Component({
  selector: 'app-sites-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sites-mgmt.component.html',
  styleUrls: ['./sites-mgmt.component.css']
})
export class SitesMgmtComponent implements OnInit {
  loading = true;
  activeSiteIdx = 0;
  sites: any[] = [];
  sitePlots: any[] = [];
  plotsLoading = false;
  toast = '';
  isInteractive = true;

  // Filter & Search
  plotFilter = 'all';
  plotSearch = '';

  // Modal Visibility Flags
  showAddSite = false;
  showEditSite = false;
  showAddPlot = false;

  // Form Models
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

  actionLoading = false;

  // Site Map Base Layer & Coordinates
  selectedPlot: any = null;
  imageAspectRatio: number | null = null;
  zoom = 1;
  pan = { x: 0, y: 0 };

  constructor(
    private api: ApiService,
    private siteToggle: SiteToggleService
  ) {}

  ngOnInit() {
    this.loadSites();
  }

  get siteMapUrl(): string {
    const s = this.activeSite;
    const path = s?.map_image_url || s?.layout_map_url || s?.property_image_url || '';
    return path ? this.api.url(path) : '';
  }

  loadSites() {
    this.loading = true;
    const timeout = setTimeout(() => {
      if (this.loading) this.loading = false;
    }, 4000);

    this.api.adminGetSites().subscribe({
      next: (res: any) => {
        clearTimeout(timeout);
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (list && list.length) {
          this.sites = list;
          this.selectSite(0);
          this.loading = false;
        } else {
          this.fetchPublicSites();
        }
      },
      error: () => {
        clearTimeout(timeout);
        this.fetchPublicSites();
      }
    });
  }

  fetchPublicSites() {
    const timeout = setTimeout(() => {
      this.loading = false;
    }, 3000);

    this.api.getSites().subscribe({
      next: (res: any) => {
        clearTimeout(timeout);
        this.sites = res?.data || (Array.isArray(res) ? res : []);
        if (this.sites.length) {
          this.selectSite(0);
        }
        this.loading = false;
      },
      error: () => {
        clearTimeout(timeout);
        this.loading = false;
      }
    });
  }

  selectSite(idx: number) {
    this.activeSiteIdx = idx;
    const site = this.sites[idx];
    if (!site) {
      this.plotsLoading = false;
      return;
    }

    const siteId = Number(site.site_id || site.id || 0);
    if (siteId) {
      this.siteToggle.setActiveSiteId(siteId);
    }
    const storedToggle = site.is_booking_enabled !== undefined ? Boolean(site.is_booking_enabled) : (siteId ? this.siteToggle.isSiteInteractive(siteId) : true);
    this.isInteractive = storedToggle;

    this.selectedPlot = null;
    this.resetView();
    this.plotsLoading = true;

    if (siteId) {
      const plotTimeout = setTimeout(() => {
        if (this.plotsLoading) this.plotsLoading = false;
      }, 3500);

      this.api.getSiteMap(siteId).subscribe({
        next: (res: any) => {
          clearTimeout(plotTimeout);
          const data = res?.data || res;
          if (data?.site) {
            this.sites[idx] = { ...site, ...data.site, site_id: siteId };
            if (data.site.is_booking_enabled !== undefined) {
              this.isInteractive = Boolean(data.site.is_booking_enabled);
            }
          }
          const plots = data?.plots || (Array.isArray(data) ? data : []);
          if (plots && plots.length) {
            this.sitePlots = this.processPlots(plots);
            this.plotsLoading = false;
          } else {
            this.fetchAdminSitePlots(siteId);
          }
        },
        error: () => {
          clearTimeout(plotTimeout);
          this.fetchAdminSitePlots(siteId);
        }
      });
    } else {
      this.plotsLoading = false;
    }
  }

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

  fetchAdminSitePlots(siteId: number) {
    if (!siteId) return;
    this.api.adminGetSitePlots(siteId).subscribe({
      next: (res: any) => {
        const plots = res?.data || (Array.isArray(res) ? res : []);
        this.sitePlots = this.processPlots(plots);
        this.plotsLoading = false;
      },
      error: () => {
        this.fetchFallbackSitePlots(siteId);
      }
    });
  }

  fetchFallbackSitePlots(siteId: number) {
    if (!siteId) return;
    this.api.getSitePlots(siteId).subscribe({
      next: (res: any) => {
        const plots = res?.data || (Array.isArray(res) ? res : []);
        this.sitePlots = this.processPlots(plots);
        this.plotsLoading = false;
      },
      error: () => {
        this.plotsLoading = false;
      }
    });
  }

  processPlots(plots: any[]): any[] {
    if (!Array.isArray(plots)) return [];
    return plots.map(p => {
      const points = this.pointsForPlot(p);
      const polyStr = points.map(pt => `${pt.x},${pt.y}`).join(' ');
      const labelPt = points.length ? points.reduce((acc, pt) => ({ x: acc.x + pt.x / points.length, y: acc.y + pt.y / points.length }), { x: 0, y: 0 }) : { x: 0, y: 0 };
      return {
        ...p,
        _polygonPoints: polyStr,
        _labelPoint: labelPt,
        _color: this.plotColor(p.plot_status)
      };
    });
  }

  onSiteImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && img.naturalWidth && img.naturalHeight) {
      this.imageAspectRatio = img.naturalWidth / img.naturalHeight;
    }
  }

  uploadSiteImage(event: Event) {
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
    this.api.adminUploadSiteMap(siteId, form).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        const url = res?.data?.map_image_url || res?.data?.url || res?.map_image_url;
        if (url) {
          this.activeSite.map_image_url = url;
        }
        this.showToast('Site layout image uploaded successfully!');
        this.selectSite(this.activeSiteIdx);
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Failed to upload site image');
      }
    });
  }

  removeSiteImage() {
    if (!this.activeSite) return;
    this.activeSite.map_image_url = '';
    this.activeSite.layout_map_url = '';
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

  pointsForPlot(plot: any): { x: number; y: number }[] {
    const raw = plot?.polygon_coordinates || plot?.polygon?.coordinates || plot?.coordinates || [];
    if (Array.isArray(raw) && raw.length) {
      return raw.map((p: any) => Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p.x), y: Number(p.y) })
        .filter((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y));
    }
    const xs = String(plot?.coordinates_x || '').split(',').map(v => Number(v.trim()));
    const ys = String(plot?.coordinates_y || '').split(',').map(v => Number(v.trim()));
    if (xs.length >= 3 && xs.length === ys.length && xs.every(Number.isFinite) && ys.every(Number.isFinite)) {
      return xs.map((x, i) => ({ x, y: ys[i] }));
    }
    return [];
  }

  polygonPoints(plot: any): string {
    return plot?._polygonPoints || this.pointsForPlot(plot).map(p => `${p.x},${p.y}`).join(' ');
  }

  labelPoint(plot: any): { x: number; y: number } {
    return plot?._labelPoint || { x: 0, y: 0 };
  }

  plotColor(status: string): string {
    const clean = String(status || '').replace(/\s|_/g, '').toLowerCase();
    if (clean === 'vacant' || clean === 'available') return '#16a34a';
    if (clean === 'inprocess' || clean === 'paymentpending' || clean === 'processing') return '#eab308';
    if (clean === 'booked' || clean === 'hold') return '#ef4444';
    if (clean === 'sold') return '#6b7280';
    return '#16a34a';
  }

  get activeSite() {
    return this.sites[this.activeSiteIdx] || {};
  }

  get filteredPlots(): any[] {
    return this.sitePlots.filter(p => {
      const matchFilter =
        this.plotFilter === 'all' ? true :
        this.plotFilter === 'vacant' ? (p.plot_status === 'Available' || p.plot_status === 'Vacant') :
        p.plot_status?.toLowerCase() === this.plotFilter.toLowerCase();

      const q = this.plotSearch.trim().toLowerCase();
      const matchSearch = !q ||
        p.plot_number?.toString().toLowerCase().includes(q) ||
        p.sqft?.toString().includes(q) ||
        p.facing_direction?.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }

  // --- ACTIONS & MODALS ---

  addSite() {
    if (!this.newSite.site_name || !this.newSite.city) {
      this.showToast('Site name and city are required');
      return;
    }
    this.actionLoading = true;
    this.api.adminCreateSite(this.newSite).subscribe({
      next: (res: any) => {
        if (res.success || res.site_id || res.id) {
          this.showToast('Site created successfully!');
          this.showAddSite = false;
          this.loadSites();
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
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Error creating site');
        this.actionLoading = false;
      }
    });
  }

  openEditSiteModal() {
    const s = this.activeSite;
    this.editSiteForm = {
      site_name: s.site_name || '',
      city: s.city || '',
      state: s.state || 'Uttar Pradesh',
      full_address: s.full_address || s.address || '',
      description: s.description || '',
      nearest_place: s.nearest_place || '',
      landmark: s.landmark || '',
      highway_distance: s.highway_distance || '',
      airport_distance: s.airport_distance || '',
      is_booking_enabled: s.is_booking_enabled !== undefined ? Boolean(s.is_booking_enabled) : this.isInteractive
    };
    this.showEditSite = true;
  }

  updateSite() {
    const siteId = Number(this.activeSite?.site_id || this.activeSite?.id || 0);
    if (!siteId) return;
    this.actionLoading = true;
    this.api.adminUpdateSite(siteId, this.editSiteForm).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showToast('Site details updated!');
          this.showEditSite = false;
          this.isInteractive = Boolean(this.editSiteForm.is_booking_enabled);
          this.activeSite.is_booking_enabled = this.editSiteForm.is_booking_enabled;
          this.siteToggle.setSiteInteractive(siteId, this.editSiteForm.is_booking_enabled);
          this.loadSites();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to update site');
        this.actionLoading = false;
      }
    });
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

  saveNewPlot() {
    const siteId = Number(this.activeSite?.site_id || this.activeSite?.id || 0);
    if (!this.newPlot.plot_number || !siteId) {
      this.showToast('Plot number is required');
      return;
    }
    this.actionLoading = true;
    this.api.adminCreateSitePlot(siteId, this.newPlot).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showToast(`Plot #${this.newPlot.plot_number} created successfully!`);
          this.showAddPlot = false;
          this.selectSite(this.activeSiteIdx);
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Error creating plot');
        this.actionLoading = false;
      }
    });
  }

  changePlotStatus(plot: any, newStatus: string) {
    this.api.adminUpdatePlotStatus(plot.plot_id, newStatus, 'Status changed by Admin').subscribe({
      next: (res: any) => {
        if (res.success) {
          plot.plot_status = newStatus;
          plot._color = this.plotColor(newStatus);
          this.showToast(`Plot #${plot.plot_number} status updated to ${newStatus}`);
        }
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to update plot status');
      }
    });
  }

  closeModals() {
    this.showAddSite = false;
    this.showEditSite = false;
    this.showAddPlot = false;
  }

  pct(s: any): number {
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
