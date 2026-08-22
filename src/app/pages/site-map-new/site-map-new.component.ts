import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SiteToggleService } from '../../services/site-toggle.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-site-map-new',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './site-map-new.component.html',
  styleUrls: ['./site-map-new.component.css']
})
export class SiteMapNewComponent implements OnInit {
  @ViewChild('siteImageStage') siteImageStage?: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private siteToggle = inject(SiteToggleService);

  loading = true;
  documentsLoading = true;
  error = '';
  documentsError = '';

  site: any = null;
  sitesList: any[] = [];
  plots: any[] = [];
  siteDocuments: any[] = [];

  zoom = 1;
  imageAspectRatio: number | null = null;

  // Inquiry Form Model
  inquiryForm = {
    name: '',
    mobile: '',
    email: '',
    interest: 'Plot Booking — 100 Gaj',
    message: ''
  };
  inquirySubmitting = false;
  inquirySubmitted = false;
  inquiryErrorMessage = '';

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id') || params.get('siteId') || 1);
      this.loadSitesList(id);
    });
  }

  loadSitesList(selectedSiteId: number) {
    this.api.getSites().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        this.sitesList = raw.map((s: any) => ({
          site_id: Number(s.site_id || s.id),
          site_name: s.site_name || s.name || 'Project Site',
          city: s.city || 'Uttar Pradesh'
        }));

        const targetId = selectedSiteId || (this.sitesList[0]?.site_id || 1);
        this.loadSiteDetails(targetId);
      },
      error: () => {
        if (selectedSiteId) this.loadSiteDetails(selectedSiteId);
        else {
          this.error = 'Unable to load project sites list.';
          this.loading = false;
        }
      }
    });
  }

  loadSiteDetails(id: number) {
    this.loading = true;
    this.error = '';
    this.siteToggle.setActiveSiteId(id);

    this.api.getSiteMap(id).subscribe({
      next: (res: any) => {
        this.loading = false;
        const data = res?.data || res || {};
        this.site = data.site || null;
        this.plots = Array.isArray(data.plots) ? data.plots : [];
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to load site information.';
      }
    });

    this.loadSiteDocuments(id);
  }

  loadSiteDocuments(id: number) {
    this.documentsLoading = true;
    this.documentsError = '';
    this.api.getSiteDocuments(id).subscribe({
      next: (res: any) => {
        this.documentsLoading = false;
        this.siteDocuments = res?.data || [];
      },
      error: (e: any) => {
        this.documentsLoading = false;
        this.siteDocuments = [];
        this.documentsError = e?.error?.message || 'Unable to load site documents.';
      }
    });
  }

  get siteMapUrl(): string {
    const url = this.site?.layout_map_url || this.site?.map_image_url || this.site?.property_image_url || '';
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : (typeof this.api?.url === 'function' ? this.api.url(url) : url);
  }

  get availableCount(): number {
    return this.plots.filter(p => String(p.plot_status).toLowerCase() === 'vacant' || String(p.plot_status).toLowerCase() === 'available').length;
  }

  get bookedCount(): number {
    return this.plots.filter(p => String(p.plot_status).toLowerCase() === 'booked' || String(p.plot_status).toLowerCase() === 'sold').length;
  }

  get imageTransform(): string {
    return `scale(${this.zoom})`;
  }

  zoomIn() { this.zoom = Math.min(3, +(this.zoom + 0.25).toFixed(2)); }
  zoomOut() { this.zoom = Math.max(0.6, +(this.zoom - 0.25).toFixed(2)); }
  resetView() { this.zoom = 1; }

  onSiteImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img?.naturalWidth && img?.naturalHeight) {
      this.imageAspectRatio = img.naturalWidth / img.naturalHeight;
    }
  }

  documentIcon(doc: any): string {
    const type = String(doc.document_type || '').toLowerCase();
    if (type.includes('pdf')) return 'fas fa-file-pdf text-danger';
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return 'fas fa-file-image text-emerald';
    return 'fas fa-file-contract text-gold';
  }

  documentUrl(doc: any): string {
    const url = doc.document_file_url || doc.file_url || '';
    if (!url) return '#';
    return /^https?:\/\//i.test(url) ? url : this.api.url(url);
  }

  submitInquiry() {
    this.inquiryErrorMessage = '';
    const name = this.inquiryForm.name.trim();
    const mobile = this.inquiryForm.mobile.replace(/\D/g, '');

    if (name.length < 2) {
      this.inquiryErrorMessage = 'Please enter your full name.';
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      this.inquiryErrorMessage = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    this.inquirySubmitting = true;
    this.api.submitInquiry({
      full_name: name,
      mobile_no: mobile,
      email: this.inquiryForm.email || null,
      site_id: this.site?.site_id || this.site?.id || null,
      site_name: this.site?.site_name || 'Project Site',
      inquiry_message: this.inquiryForm.message || null,
      inquiry_type: this.inquiryForm.interest || 'Plot Booking Inquiry',
      source_page: 'Site-Map-New Page'
    }).subscribe({
      next: () => {
        this.inquirySubmitting = false;
        this.inquirySubmitted = true;
        this.inquiryForm = { name: '', mobile: '', email: '', interest: 'Plot Booking — 100 Gaj', message: '' };
      },
      error: (err: any) => {
        this.inquirySubmitting = false;
        this.inquiryErrorMessage = err?.error?.message || 'Unable to submit inquiry. Please try again.';
      }
    });
  }

  scrollToInquiryForm() {
    const el = document.getElementById('newSiteInquiryFormCard');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
