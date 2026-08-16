import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-invoice-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './invoice-settings.component.html',
  styleUrls: ['./invoice-settings.component.css']
})
export class AdminInvoiceSettingsComponent implements OnInit {
  loading = true;
  saving = false;

  settings: any = {
    company_name: 'MMR Constructions & Developers',
    company_logo: '',
    address: 'Head Office: Main Road, Lucknow, Uttar Pradesh - 226001',
    phone: '+91 98765 43210 / +91 91234 56789',
    email: 'info@mmrconstructions.com',
    website: 'www.mmrconstructions.com',
    gst_number: '09AAAAA0000A1Z5',
    terms_and_conditions: '1. All payments are subject to clearance.\n2. Plot allocation is subject to company guidelines and approval.\n3. Taxes and statutory charges are as per government norms.\n4. This is a system-generated invoice.',
    notes: 'Thank you for choosing MMR Constructions & Developers.',
    bank_name: 'State Bank of India',
    account_no: '123456789012',
    ifsc_code: 'SBIN0001234',
    branch: 'Main Branch, Lucknow',
    upi_qr_url: '',
    signature_url: '',
    stamp_url: '',
    invoice_prefix: 'MMR',
    invoice_starting_number: 1,
    invoice_footer: 'System Generated Invoice - MMR Constructions & Developers',
    theme_color: '#14532d'
  };

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.fetchSettings();
  }

  fetchSettings() {
    this.loading = true;
    this.api.get('/api/admin/invoice-settings').subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data && res.data.company_name) {
          this.settings = { ...this.settings, ...res.data };
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load settings', 'error');
      }
    });
  }

  saveSettings() {
    this.saving = true;
    this.api.put('/api/admin/invoice-settings', this.settings).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res.success) {
          this.settings = { ...this.settings, ...res.data };
          this.showToast('Invoice Settings updated successfully!', 'success');
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.showToast(err?.error?.message || 'Failed to save settings', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => { this.toastMessage = ''; }, 4000);
  }
}
