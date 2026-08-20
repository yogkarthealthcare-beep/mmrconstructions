import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { SiteToggleService } from '../../services/site-toggle.service';

@Component({
  selector: 'app-new-site-area',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './new-site-area.component.html',
  styleUrls: ['./new-site-area.component.css']
})
export class NewSiteAreaComponent implements OnInit {
  sitesLoading = false;
  saving = false;
  toast = '';
  toastType: 'success' | 'error' = 'success';
  sites: any[] = [];
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;

  newSiteArea = {
    site_name: '',
    city: '',
    state: 'Uttar Pradesh',
    full_address: '',
    total_area: '',
    total_plots: 50,
    starting_price: 1200,
    nearest_place: '',
    landmark: '',
    highway_distance: '',
    airport_distance: '',
    description: '',
    is_booking_enabled: true
  };

  constructor(
    private api: ApiService,
    private siteToggle: SiteToggleService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadExistingSiteAreas();
  }

  get propertyPlotMasterEnabled(): boolean {
    return this.siteToggle.isMasterPropertyPlotEnabled();
  }

  togglePropertyPlotMaster(enabled: boolean) {
    this.siteToggle.setMasterPropertyPlotEnabled(enabled);
  }

  get activePlotModeSitesCount(): number {
    return this.sites.filter(s => s.is_booking_enabled !== false).length;
  }

  async loadExistingSiteAreas() {
    this.sitesLoading = true;
    try {
      let res: any;
      try {
        res = await firstValueFrom(this.api.adminGetSites());
      } catch (_) {
        res = await firstValueFrom(this.api.getSites());
      }
      const list = res?.data || (Array.isArray(res) ? res : []);
      this.sites = Array.isArray(list) ? list : [];
      this.sitesLoading = false;
    } catch (e: any) {
      this.sitesLoading = false;
      this.showToast(e?.error?.message || 'Failed to load existing site areas', 'error');
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!/\.(jpe?g|png|pdf|svg)$/i.test(file.name)) {
      this.showToast('Please upload a valid image or PDF layout map (JPG, PNG, SVG, PDF).', 'error');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeSelectedFile() {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
  }

  async createNewSiteArea() {
    if (!this.newSiteArea.site_name.trim() || !this.newSiteArea.city.trim()) {
      this.showToast('Site Area Name and City are required fields.', 'error');
      return;
    }

    this.saving = true;
    try {
      // Step 1: Create Site Area via API
      const res: any = await firstValueFrom(this.api.adminCreateSiteArea(this.newSiteArea));
      const createdSite = res?.data || res?.site || res || {};
      const newSiteId = Number(createdSite?.site_id || createdSite?.id);

      if (newSiteId) {
        this.siteToggle.syncSiteInteractive(newSiteId, this.newSiteArea.is_booking_enabled);
        
        // Step 2: Upload Layout Map image if selected
        if (this.selectedFile) {
          const form = new FormData();
          form.append('site_map', this.selectedFile);
          form.append('map_image', this.selectedFile);
          try {
            await firstValueFrom(this.api.adminUploadSiteMap(newSiteId, form));
          } catch (uploadErr) {
            console.warn('Site layout image upload warning:', uploadErr);
          }
        }

        this.showToast(`New Site Area "${this.newSiteArea.site_name}" created successfully!`, 'success');
        this.resetForm();
        await this.loadExistingSiteAreas();
      } else {
        this.showToast(res?.message || 'New site area was created.', 'success');
        await this.loadExistingSiteAreas();
      }
      this.saving = false;
    } catch (err: any) {
      this.saving = false;
      const msg = err?.error?.message || err?.message || 'Error creating new site area.';
      this.showToast(msg, 'error');
    }
  }

  resetForm() {
    this.newSiteArea = {
      site_name: '',
      city: '',
      state: 'Uttar Pradesh',
      full_address: '',
      total_area: '',
      total_plots: 50,
      starting_price: 1200,
      nearest_place: '',
      landmark: '',
      highway_distance: '',
      airport_distance: '',
      description: '',
      is_booking_enabled: true
    };
    this.selectedFile = null;
    this.imagePreviewUrl = null;
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => { this.toast = ''; }, 4000);
  }
}
