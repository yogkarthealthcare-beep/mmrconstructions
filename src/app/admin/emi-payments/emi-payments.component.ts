import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-emi-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emi-payments.component.html',
  styleUrls: ['./emi-payments.component.css']
})
export class EmiPaymentsComponent implements OnInit {
  loading = true;
  activeTab: 'bookings' | 'overdue' = 'bookings';
  search = '';
  bookingFilter = 'all';
  activeRowId: any = null;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }

  bookings: any[] = [];
  overdueEmis: any[] = [];
  toast = '';
  confirmLoading = false;

  // Selected Booking for Detailed Modal
  selectedBooking: any = null;
  detailLoading = false;
  showDetailModal = false;
  showCancelModal = false;

  cancelReason = '';
  cancelBookingObj: any = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadBookings();
    this.loadOverdue();
  }

  loadBookings() {
    this.loading = true;
    this.api.adminGetBookings().subscribe({
      next: (res: any) => {
        if (res.success) {
          const list = res.data.bookings || res.data || [];
          this.bookings = list;
        } else {
          this.bookings = [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadOverdue() {
    this.api.adminGetOverdueEmi().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.overdueEmis = res.data || [];
        }
      },
      error: () => {}
    });
  }

  get pendingBookingsCount(): number {
    return this.bookings.filter(b => b.booking_status === 'PaymentPending' || b.booking_status === 'Pending').length;
  }

  get confirmedBookingsCount(): number {
    return this.bookings.filter(b => b.booking_status === 'Confirmed').length;
  }

  get filteredBookings(): any[] {
    return this.bookings.filter(b => {
      const matchFilter =
        this.bookingFilter === 'all' ? true :
        b.booking_status?.toLowerCase() === this.bookingFilter.toLowerCase();

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.full_name?.toLowerCase().includes(q) ||
        b.mobile_no?.includes(q) ||
        b.plot_number?.toString().toLowerCase().includes(q) ||
        b.site_name?.toLowerCase().includes(q) ||
        b.booking_id?.toString().includes(q);

      return matchFilter && matchSearch;
    });
  }

  get filteredEmis(): any[] {
    return this.overdueEmis.filter(e => {
      const q = this.search.trim().toLowerCase();
      return !q ||
        e.full_name?.toLowerCase().includes(q) ||
        e.customer_name?.toLowerCase().includes(q) ||
        e.mobile_no?.includes(q) ||
        e.plot_number?.toString().includes(q) ||
        e.site_name?.toLowerCase().includes(q);
    });
  }

  confirmBooking(b: any) {
    if (this.confirmLoading) return;
    this.confirmLoading = true;
    this.api.adminConfirmBooking(b.booking_id).subscribe({
      next: (res: any) => {
        if (res.success) {
          b.booking_status = 'Confirmed';
          this.showToast(`Booking #${b.booking_id} confirmed! EMI schedule generated.`);
        }
        this.confirmLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Error confirming booking');
        this.confirmLoading = false;
      }
    });
  }

  openCancelModal(b: any) {
    this.cancelBookingObj = b;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  processCancelBooking() {
    if (!this.cancelBookingObj) return;
    this.confirmLoading = true;
    this.api.adminCancelBooking(this.cancelBookingObj.booking_id, this.cancelReason || 'Cancelled by Admin').subscribe({
      next: (res: any) => {
        if (res.success) {
          this.cancelBookingObj.booking_status = 'Cancelled';
          this.showToast(`Booking #${this.cancelBookingObj.booking_id} cancelled.`);
          this.closeModals();
        }
        this.confirmLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to cancel booking');
        this.confirmLoading = false;
      }
    });
  }

  confirmEmi(e: any) {
    const amt = parseFloat(e.emi_amount || e.amount || 0);
    this.api.adminConfirmEmi(e.emi_id, amt).subscribe({
      next: (res: any) => {
        if (res.success) {
          e.emi_status = 'Paid';
          this.showToast(`EMI installment #${e.installment_no || e.emi_id} payment of ₹${amt} confirmed!`);
          this.loadOverdue();
        }
      },
      error: (err: any) => {
        this.showToast(err?.error?.message || 'Failed to confirm EMI payment');
      }
    });
  }

  openBookingDetail(b: any) {
    this.selectedBooking = b;
    this.showDetailModal = true;
    this.detailLoading = true;

    this.api.adminGetBookingDetail(b.booking_id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.selectedBooking = { ...this.selectedBooking, ...res.data };
        }
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }

  closeModals() {
    this.showDetailModal = false;
    this.showCancelModal = false;
  }

  getInitials(name: string): string {
    if (!name) return 'B';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
