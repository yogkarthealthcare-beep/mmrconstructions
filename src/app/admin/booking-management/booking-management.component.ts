import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-booking-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminPaginationComponent,
    AdminTableContainerComponent
  ],
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
  pageSize = 10;
  toast = '';
  toastType: 'success' | 'error' = 'success';

  // Quick Filter Tab
  activeQuickFilter: 'ALL' | 'PENDING' | 'CONFIRMED' | 'OFFLINE' | 'CANCELLED' = 'ALL';

  // Detail Drawer Active Tab
  activeDetailTab: 'overview' | 'proofs' | 'emi' | 'appointment' = 'overview';

  // Filter Form
  filterForm = this.fb.group({
    search: [''],
    status: [''],
    paymentMethod: [''],
  });

  // Modal Dialog States
  previewImageUrl: string | null = null;
  showOfflineApproveModal = false;
  showPartialPaymentModal = false;
  showRescheduleModal = false;
  showRejectModal = false;

  // Modal Forms
  offlineApproveForm = this.fb.group({
    reference_no: ['', Validators.required],
    remarks: [''],
  });

  partialPaymentForm = this.fb.group({
    received_amount: [null as number | null, [Validators.required, Validators.min(1)]],
    payment_reference: ['', Validators.required],
  });

  rescheduleForm = this.fb.group({
    date: ['', Validators.required],
    start_time: ['', Validators.required],
    end_time: ['', Validators.required],
  });

  rejectForm = this.fb.group({
    reason: ['', Validators.required],
  });

  readonly plotStatuses = ['Vacant', 'InProcess', 'Booked', 'Sold'];

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private exportService: AdminExportService
  ) {}

  ngOnInit() {
    this.loadBookings();
    this.filterForm.valueChanges.subscribe(() => (this.page = 1));
  }

  // --- KPI Computed Metrics ---
  get totalBookingsCount(): number {
    return this.bookings.length;
  }

  get totalBookingVolume(): number {
    return this.bookings.reduce((sum, b) => sum + Number(b.base_price || b.plot_base_price || 0), 0);
  }

  get totalAdvanceVolume(): number {
    return this.bookings.reduce((sum, b) => sum + Number(b.advance_amount || b.booking_amount || 0), 0);
  }

  get confirmedBookingsCount(): number {
    return this.bookings.filter(b => b.booking_status === 'Confirmed').length;
  }

  get pendingBookingsCount(): number {
    return this.bookings.filter(b =>
      b.booking_status === 'Pending' ||
      b.booking_status === 'PaymentPending' ||
      b.workflow_status === 'Submitted' ||
      b.workflow_status === 'Under Review'
    ).length;
  }

  get offlineBookingsCount(): number {
    return this.bookings.filter(b => {
      const pm = String(b.payment_method || b.payment_type || '').toLowerCase();
      return pm === 'offline' || pm === 'cheque' || pm === 'cash' || pm === 'bank transfer';
    }).length;
  }

  get cancelledBookingsCount(): number {
    return this.bookings.filter(b => b.booking_status === 'Cancelled' || b.booking_status === 'Rejected').length;
  }

  // Quick Filter Switcher
  setQuickFilter(filter: 'ALL' | 'PENDING' | 'CONFIRMED' | 'OFFLINE' | 'CANCELLED') {
    this.activeQuickFilter = filter;
    this.page = 1;
  }

  // Filtered List
  get filteredBookings(): any[] {
    const q = String(this.filterForm.value.search || '').trim().toLowerCase();
    const status = this.filterForm.value.status || '';
    const paymentMethod = this.filterForm.value.paymentMethod || '';

    return this.bookings.filter(b => {
      // 1. Quick Tab Filtering
      if (this.activeQuickFilter === 'PENDING') {
        const isPending = b.booking_status === 'Pending' ||
                          b.booking_status === 'PaymentPending' ||
                          b.workflow_status === 'Submitted' ||
                          b.workflow_status === 'Under Review';
        if (!isPending) return false;
      } else if (this.activeQuickFilter === 'CONFIRMED') {
        if (b.booking_status !== 'Confirmed') return false;
      } else if (this.activeQuickFilter === 'OFFLINE') {
        const pm = String(b.payment_method || b.payment_type || '').toLowerCase();
        if (pm !== 'offline' && pm !== 'cheque' && pm !== 'cash' && pm !== 'bank transfer') return false;
      } else if (this.activeQuickFilter === 'CANCELLED') {
        if (b.booking_status !== 'Cancelled' && b.booking_status !== 'Rejected') return false;
      }

      // 2. Search Text
      const haystack = [
        b.booking_serial,
        `#${b.booking_id}`,
        b.customer_name,
        b.full_name,
        b.mobile_no,
        b.email,
        b.plot_number,
        `plot ${b.plot_number}`,
        b.site_name,
        b.payment_method,
        b.payment_type,
        b.booking_status
      ].map(v => String(v || '').toLowerCase()).join(' ');

      if (q && !haystack.includes(q)) return false;

      // 3. Dropdown Status
      if (status && b.booking_status !== status) return false;

      // 4. Dropdown Payment Method
      if (paymentMethod) {
        const pm = String(b.payment_method || b.payment_type || '').toLowerCase();
        if (!pm.includes(paymentMethod.toLowerCase())) return false;
      }

      return true;
    });
  }

  get pagedBookings(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredBookings.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBookings.length / this.pageSize));
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  loadBookings() {
    this.loading = true;
    this.api.adminGetBookings({}).subscribe({
      next: (res: any) => {
        this.bookings = res?.data || [];
        this.loading = false;
        // Keep selected updated if already selected
        if (this.selected?.booking_id) {
          const fresh = this.bookings.find(b => b.booking_id === this.selected.booking_id);
          if (fresh) {
            this.selected = { ...this.selected, ...fresh };
          }
        }
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
    this.activeDetailTab = 'overview';
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

  closeDetail() {
    this.selected = null;
  }

  // --- Modal Triggers & Actions ---
  openOfflineApproveModal() {
    this.offlineApproveForm.reset({
      reference_no: '',
      remarks: 'Offline payment verified and approved by admin.'
    });
    this.showOfflineApproveModal = true;
  }

  submitOfflineApprove() {
    if (this.offlineApproveForm.invalid || !this.selected) return;
    this.actionLoading = true;
    const { reference_no, remarks } = this.offlineApproveForm.value;

    this.api.adminApproveOfflineBooking(this.selected.booking_id, {
      reference_no: reference_no || '',
      remarks: remarks || ''
    }).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showOfflineApproveModal = false;
        this.showToast(res?.message || 'Offline booking verified and approved successfully!');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Approval failed.', 'error');
      }
    });
  }

  approveDirectly() {
    if (!this.selected) return;
    if (this.selected.payment_method === 'Offline' || this.selected.payment_type === 'Offline') {
      this.openOfflineApproveModal();
      return;
    }

    this.actionLoading = true;
    this.api.adminConfirmBooking(this.selected.booking_id).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showToast(res?.message || 'Booking confirmed and plot allotted successfully!');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Booking confirmation failed.', 'error');
      }
    });
  }

  openPartialPaymentModal() {
    this.partialPaymentForm.reset({
      received_amount: null,
      payment_reference: ''
    });
    this.showPartialPaymentModal = true;
  }

  submitPartialPayment() {
    if (this.partialPaymentForm.invalid || !this.selected) return;
    const { received_amount, payment_reference } = this.partialPaymentForm.value;
    if (!received_amount || received_amount <= 0) {
      this.showToast('Please enter a valid received amount.', 'error');
      return;
    }

    this.actionLoading = true;
    this.api.adminApprovePartialPaymentCommission(this.selected.booking_id, {
      received_amount: Number(received_amount),
      payment_reference: String(payment_reference || '').trim()
    }).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showPartialPaymentModal = false;
        this.showToast(res?.message || 'Partial payment approved and commission processed.');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Partial payment approval failed.', 'error');
      }
    });
  }

  openRescheduleModal() {
    const appt = this.selected?.appointment || {};
    this.rescheduleForm.reset({
      date: appt.appointment_date ? appt.appointment_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      start_time: appt.start_time || '10:00',
      end_time: appt.end_time || '11:00'
    });
    this.showRescheduleModal = true;
  }

  submitReschedule() {
    if (this.rescheduleForm.invalid || !this.selected) return;
    const { date, start_time, end_time } = this.rescheduleForm.value;

    this.actionLoading = true;
    this.api.adminRescheduleAppointment(this.selected.booking_id, {
      date,
      start_time,
      end_time
    }).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showRescheduleModal = false;
        this.showToast(res?.message || 'Site visit appointment rescheduled.');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Reschedule failed.', 'error');
      }
    });
  }

  openRejectModal() {
    this.rejectForm.reset({ reason: '' });
    this.showRejectModal = true;
  }

  submitReject() {
    if (this.rejectForm.invalid || !this.selected) return;
    const reason = String(this.rejectForm.value.reason || '').trim();
    if (!reason) {
      this.showToast('Please provide a reason for cancellation / rejection.', 'error');
      return;
    }

    this.actionLoading = true;
    const isOffline = this.selected.payment_method === 'Offline' || this.selected.payment_type === 'Offline';
    const req$ = isOffline
      ? this.api.adminRejectOfflineBooking(this.selected.booking_id, { reason })
      : this.api.adminCancelBooking(this.selected.booking_id, reason);

    req$.subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showRejectModal = false;
        this.showToast(res?.message || 'Booking cancelled and plot released.');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Cancellation failed.', 'error');
      }
    });
  }

  markPlot(status: string) {
    const plotId = this.selected?.plot?.id || this.selected?.plot_id;
    if (!plotId) {
      this.showToast('Plot identifier not found.', 'error');
      return;
    }

    this.actionLoading = true;
    this.api.adminUpdatePlotStatus(plotId, status, 'Booking management action').subscribe({
      next: () => {
        this.actionLoading = false;
        this.showToast(`Plot status successfully changed to "${status}".`);
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Plot status update failed', 'error');
      },
    });
  }

  // --- Proof & Image Viewer ---
  openImagePreview(url: string) {
    if (!url) return;
    this.previewImageUrl = url;
  }

  closeImagePreview() {
    this.previewImageUrl = null;
  }

  proofsFor(booking: any): any[] {
    const proofs = booking?.payment_proofs || booking?.proofs || [];
    if (Array.isArray(proofs)) return proofs;
    if (booking?.proof_url) return [{ file_path: booking.proof_url, file_type: 'Receipt' }];
    return [];
  }

  getCustomerInitials(name: string): string {
    if (!name) return 'CU';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedBookings : this.filteredBookings;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Booking Ref', key: 'booking_ref', width: 16 },
      { header: 'Customer Name', key: 'customer_display', width: 22 },
      { header: 'Mobile Number', key: 'mobile_display', width: 16 },
      { header: 'Plot & Site', key: 'plot_site_display', width: 24 },
      { header: 'Booking Amount (₹)', key: 'amount_display', width: 18 },
      { header: 'Payment Method', key: 'payment_method_display', width: 16 },
      { header: 'Payment Status', key: 'payment_status', width: 14 },
      { header: 'Booking Status', key: 'booking_status', width: 14 },
      { header: 'Booking Date', key: 'date_display', width: 14 }
    ];

    const formatted = list.map((b, idx) => ({
      ...b,
      _sno: baseIndex + idx + 1,
      booking_ref: b.booking_serial || (`#${b.booking_id}`),
      customer_display: b.customer_name || b.full_name || (b.customer?.full_name) || 'N/A',
      mobile_display: b.mobile_no || (b.customer?.mobile_no) || 'N/A',
      plot_site_display: `Plot ${b.plot_number || b.plot?.plot_number || 'N/A'} (${b.site_name || b.site?.site_name || 'N/A'})`,
      amount_display: Number(b.advance_amount || b.booking_amount || 0).toLocaleString('en-IN'),
      payment_method_display: b.payment_method || b.payment_type || 'N/A',
      payment_status: b.payment_status || (b.booking_status === 'Confirmed' ? 'Paid' : 'Pending'),
      booking_status: b.booking_status || 'N/A',
      date_display: b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-IN') : 'N/A'
    }));

    const title = mode === 'current' ? `Bookings Report (Page ${this.page})` : 'All Plot Bookings Report';
    const filename = `bookings_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

  private refreshAfterAction() {
    const id = this.selected?.booking_id;
    this.loadBookings();
    if (id) this.selectBooking({ booking_id: id });
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast = message;
    this.toastType = type;
    setTimeout(() => (this.toast = ''), 3500);
  }
}
