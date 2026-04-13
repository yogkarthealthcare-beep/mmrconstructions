import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-emi-payments', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './emi-payments.component.html' })
export class EmiPaymentsComponent implements OnInit {
  loading = true; activeTab = 'bookings'; search = '';
  bookings: any[] = []; overdueEmis: any[] = [];
  toast = ''; confirmLoading = false;

  constructor(private api: ApiService) {}
  ngOnInit() { this.loadBookings(); this.loadOverdue(); }

  loadBookings() {
    this.api.adminGetBookings({ status: 'PaymentPending' }).subscribe({
      next: (res: any) => { if (res.success) this.bookings = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  loadOverdue() {
    this.api.adminGetOverdueEmi().subscribe({
      next: (res: any) => { if (res.success) this.overdueEmis = res.data || []; },
      error: () => {}
    });
  }
  confirmBooking(b: any) {
    this.confirmLoading = true;
    this.api.adminConfirmBooking(b.booking_id).subscribe({
      next: (res: any) => {
        if (res.success) { b.booking_status = 'Confirmed'; this.showToast('Booking confirmed! EMIs generated.'); }
        this.confirmLoading = false;
      },
      error: (e: any) => { this.showToast(e?.error?.message || 'Error'); this.confirmLoading = false; }
    });
  }
  confirmEmi(e: any) {
    const amt = parseFloat(e.emi_amount);
    this.api.adminConfirmEmi(e.emi_id, amt).subscribe({
      next: (res: any) => { if (res.success) { e.emi_status = 'Paid'; this.showToast('EMI confirmed!'); } }
    });
  }
  get filteredBookings() { return this.bookings.filter(b => !this.search || b.customer_name?.toLowerCase().includes(this.search.toLowerCase()) || b.mobile_no?.includes(this.search)); }
  get filteredEmis()     { return this.overdueEmis.filter(e => !this.search || e.full_name?.toLowerCase().includes(this.search.toLowerCase())); }
  showToast(msg: string) { this.toast = msg; setTimeout(() => this.toast = '', 3500); }
}
