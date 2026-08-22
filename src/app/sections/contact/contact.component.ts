import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-contact', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './contact.component.html' })
export class ContactComponent implements OnInit {
  private api = inject(ApiService);

  sites: any[] = [];
  form = {
    name: '',
    mobile: '',
    email: '',
    site_id: null as number | null,
    interest: 'Plot Booking — 100 Gaj',
    message: ''
  };
  submitting = false;
  submitted = false;
  errorMessage = '';

  ngOnInit() {
    this.api.getSites().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        this.sites = raw.map((s: any) => ({
          site_id: Number(s.site_id || s.id),
          site_name: s.site_name || s.name || 'Project Site',
          city: s.city || 'Uttar Pradesh'
        }));
      },
      error: () => {}
    });
  }

  onSubmit() {
    this.errorMessage = '';
    const name = this.form.name.trim();
    const mobile = this.form.mobile.replace(/\D/g, '');
    if (name.length < 2) {
      this.errorMessage = 'Please enter your full name.';
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      this.errorMessage = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    const selectedSite = this.sites.find(s => Number(s.site_id) === Number(this.form.site_id));
    this.submitting = true;

    this.api.submitInquiry({
      full_name: name,
      mobile_no: mobile,
      email: this.form.email || null,
      site_id: selectedSite ? selectedSite.site_id : null,
      site_name: selectedSite ? selectedSite.site_name : null,
      inquiry_message: this.form.message || null,
      inquiry_type: this.form.interest || 'General Enquiry',
      source_page: 'Home Page'
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.form = { name: '', mobile: '', email: '', site_id: null, interest: 'Plot Booking — 100 Gaj', message: '' };
      },
      error: (err: any) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Unable to submit inquiry. Please try again.';
      }
    });
  }
}

