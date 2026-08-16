import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-book-plot-hero', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-plot-hero.component.html', styleUrls: ['./book-plot-hero.component.css'],
})
export class BookPlotHeroComponent implements OnInit, OnDestroy {
  @Input() mode: 'section' | 'modal' | 'mobile-inline' = 'section';
  backgrounds: any[] = [];
  sites: any[] = [];
  current = 0;
  model = { full_name: '', contact_number: '', site_value: '' };
  submitting = false;
  message = '';
  success = false;
  private timer: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    // These two calls only exist while Book Plot mode is rendered.
    this.api.getBookPlotBackgrounds().subscribe({ next: (r: any) => {
      this.backgrounds = Array.isArray(r?.data) ? r.data : [];
      if (this.backgrounds.length > 1) this.timer = setInterval(() => this.current = (this.current + 1) % this.backgrounds.length, 5500);
    }});
    this.api.getSites().subscribe({ next: (r: any) => this.sites = (Array.isArray(r?.data) ? r.data : []).filter((s: any) => s.is_active !== false) });
  }

  ngOnDestroy() { clearInterval(this.timer); }

  background(index: number) { return `url('${this.backgrounds[index]?.image_url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80'}')`; }

  submit(): void {
    this.message = ''; this.success = false;
    const mobile = this.model.contact_number.replace(/\D/g, '');
    if (this.model.full_name.trim().length < 2) {
      this.message = 'Please enter your full name.';
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      this.message = 'Please enter a valid 10 digit mobile number.';
      return;
    }
    if (!this.model.site_value.trim()) {
      this.message = 'Please select or enter a site/project.';
      return;
    }
    const match = this.sites.find(s => String(s.site_name).trim().toLowerCase() === this.model.site_value.trim().toLowerCase());
    this.submitting = true;
    this.api.createBookPlotLead({
      full_name: this.model.full_name.trim(), contact_number: mobile,
      site_id: match?.site_id || null, custom_site_name: match ? null : this.model.site_value.trim(),
    }).subscribe({
      next: (r: any) => {
        this.success = true; this.message = `Thank you! Inquiry number: ${r?.data?.inquiry_number}`;
        this.model = { full_name: '', contact_number: '', site_value: '' }; this.submitting = false;
      },
      error: (e: any) => { this.message = e?.error?.message || 'Unable to submit inquiry. Please try again.'; this.submitting = false; },
    });
  }
}
