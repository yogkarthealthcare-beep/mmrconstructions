import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-booking-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-management.component.html',
  styleUrls: ['./booking-management.component.css'],
})
export class BookingManagementComponent implements OnInit {
  loading = true;
  detailLoading = false;
  actionLoading = false;
  bookings: any[] = [];
  selected: any = null;
  page = 1;
  pageSize = 12;
  toast = '';
  toastType: 'success' | 'error' = 'success';

  filterForm = this.fb.group({
    search: [''],
    status: [''],
  });

  reasonForm = this.fb.group({
    reason: [''],
  });

  readonly plotStatuses = ['Vacant', 'InProcess', 'Booked', 'Sold'];

  constructor(private api: ApiService, private fb: FormBuilder) {}

  ngOnInit() {
    this.loadBookings();
    this.filterForm.valueChanges.subscribe(() => this.page = 1);
  }

  get filteredBookings() {
    const q = String(this.filterForm.value.search || '').trim().toLowerCase();
    const status = this.filterForm.value.status || '';
    return this.bookings.filter(b => {
      const haystack = [b.booking_serial, b.customer_name, b.full_name, b.mobile_no, b.plot_number, b.site_name]
        .map(v => String(v || '').toLowerCase()).join(' ');
      return (!q || haystack.includes(q)) && (!status || b.booking_status === status);
    });
  }

  get pagedBookings() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredBookings.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredBookings.length / this.pageSize));
  }

  loadBookings() {
    this.loading = true;
    this.api.adminGetBookings({}).subscribe({
      next: (res: any) => {
        this.bookings = res?.data || [];
        this.loading = false;
      },
      error: (e: any) => {
        this.loading = false;
        this.showToast(e?.error?.message || 'Unable to load bookings', 'error');
      },
    });
  }

  selectBooking(booking: any) {
    this.selected = booking;
    this.detailLoading = true;
    this.reasonForm.reset({ reason: '' });
    this.api.adminGetBooking(booking.booking_id).subscribe({
      next: (res: any) => {
        this.selected = res?.data || booking;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      },
    });
  }

  approve() {
    if (!this.selected) return;
    this.actionLoading = true;
    const request$ = this.selected.payment_method === 'Offline'
      ? this.api.adminApproveOfflineBooking(this.selected.booking_id, {
          reference_no: prompt('Cheque / payment reference number') || '',
          remarks: this.reasonForm.value.reason || '',
        })
      : this.api.adminConfirmBooking(this.selected.booking_id);
    request$.subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showToast(res?.message || 'Booking approved');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Approve failed', 'error');
      },
    });
  }

  reject() {
    if (!this.selected) return;
    const reason = String(this.reasonForm.value.reason || '').trim();
    if (!reason) {
      this.showToast('Reason is required for reject/cancel.', 'error');
      return;
    }
    this.actionLoading = true;
    const request$ = this.selected.payment_method === 'Offline'
      ? this.api.adminRejectOfflineBooking(this.selected.booking_id, { reason })
      : this.api.adminCancelBooking(this.selected.booking_id, reason);
    request$.subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showToast(res?.message || 'Booking cancelled');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Cancel failed', 'error');
      },
    });
  }

  rescheduleAppointment() {
    if (!this.selected?.appointment) return;
    const date = prompt('New appointment date (YYYY-MM-DD)', this.selected.appointment.appointment_date?.slice(0, 10) || '');
    const start = prompt('New start time (HH:MM)', this.selected.appointment.start_time || '');
    const end = prompt('New end time (HH:MM)', this.selected.appointment.end_time || '');
    if (!date || !start || !end) return;
    this.api.adminRescheduleAppointment(this.selected.booking_id, { date, start_time: start, end_time: end }).subscribe({
      next: () => { this.showToast('Appointment rescheduled'); this.refreshAfterAction(); },
      error: (e: any) => this.showToast(e?.error?.message || 'Reschedule failed', 'error'),
    });
  }

  approvePartialPayment() {
    if (!this.selected) return;
    const amount = Number(prompt('Received partial payment amount'));
    if (!Number.isFinite(amount) || amount <= 0) {
      this.showToast('Enter a valid received amount.', 'error');
      return;
    }
    const payment_reference = prompt('Payment reference number') || '';
    if (!payment_reference.trim()) {
      this.showToast('Payment reference is required.', 'error');
      return;
    }
    this.actionLoading = true;
    this.api.adminApprovePartialPaymentCommission(this.selected.booking_id, {
      received_amount: amount,
      payment_reference: payment_reference.trim(),
    }).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showToast(res?.message || 'Partial payment commission generated.');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Partial payment approval failed.', 'error');
      },
    });
  }

  markPlot(status: string) {
    if (!this.selected?.plot_id) return;
    this.actionLoading = true;
    this.api.adminUpdatePlotStatus(this.selected.plot_id, status, 'Booking management action').subscribe({
      next: () => {
        this.actionLoading = false;
        this.showToast(`Plot marked ${status}`);
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Plot status update failed', 'error');
      },
    });
  }

  nextPage() { this.page = Math.min(this.totalPages, this.page + 1); }
  prevPage() { this.page = Math.max(1, this.page - 1); }

  proofsFor(booking: any) {
    const proofs = booking?.payment_proofs || booking?.proofs || [];
    return Array.isArray(proofs) ? proofs : [];
  }

  private refreshAfterAction() {
    const id = this.selected?.booking_id;
    this.loadBookings();
    if (id) this.selectBooking({ booking_id: id });
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast = message;
    this.toastType = type;
    setTimeout(() => this.toast = '', 3200);
  }
}
