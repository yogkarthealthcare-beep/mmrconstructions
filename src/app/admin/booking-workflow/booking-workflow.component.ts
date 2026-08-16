import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-booking-workflow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-workflow.component.html',
  styleUrls: ['./booking-workflow.component.css'],
})
export class BookingWorkflowComponent implements OnInit {
  activeTab: 'settings' | 'kyc' | 'alerts' = 'settings';
  loading = true;
  saving = false;
  toast = '';
  settings: any = {};
  kycRows: any[] = [];
  alerts: any = {};
  statusFilter = '';

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    let completed = 0;
    const done = () => { if (++completed === 3) this.loading = false; };
    this.api.adminGetBookingWorkflowSettings().subscribe({ next: r => { this.settings = r.data || {}; done(); }, error: done });
    this.api.adminGetKyc().subscribe({ next: r => { this.kycRows = r.data || []; done(); }, error: done });
    this.api.adminGetWorkflowAlerts().subscribe({ next: r => { this.alerts = r.data || {}; done(); }, error: done });
  }

  get requiredPayment() {
    return Number(this.settings.minimum_booking_amount || 0) + Number(this.settings.first_emi_amount || 0);
  }

  saveSettings() {
    this.saving = true;
    this.api.adminUpdateBookingWorkflowSettings(this.settings).subscribe({
      next: (res: any) => { this.saving = false; this.showToast(res.message || 'Settings saved.'); this.settings = res.data || this.settings; },
      error: (e: any) => { this.saving = false; this.showToast(e?.error?.message || 'Unable to save settings.'); },
    });
  }

  setKyc(row: any, status: string) {
    const remarks = prompt(status === 'Approved' ? 'Approval remarks (optional)' : 'Enter remarks for the customer') || '';
    this.api.adminUpdateKyc(row.user_id, {
      status,
      remarks,
      request_reupload: status === 'Rejected',
    }).subscribe({
      next: () => { this.showToast(`KYC marked ${status}.`); this.loadAll(); },
      error: (e: any) => this.showToast(e?.error?.message || 'KYC update failed.'),
    });
  }

  get filteredKyc() {
    return this.statusFilter ? this.kycRows.filter(row => row.status === this.statusFilter) : this.kycRows;
  }

  showToast(message: string) {
    this.toast = message;
    setTimeout(() => this.toast = '', 3000);
  }
}
