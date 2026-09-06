import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-emi-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent],
  templateUrl: './emi-payments.component.html',
  styleUrls: ['./emi-payments.component.css']
})
export class EmiPaymentsComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

  loading = true;
  activeTab: 'bookings' | 'overdue' = 'bookings';
  search = '';
  bookingFilter = 'all';
  activeRowId: any = null;

  // Pagination for bookings and overdue
  bookingsPage = 1;
  bookingsPageSize = 10;
  overduePage = 1;
  overduePageSize = 10;

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

  constructor() {}

  get pagedBookings(): any[] {
    const start = (this.bookingsPage - 1) * this.bookingsPageSize;
    return this.filteredBookings.slice(start, start + this.bookingsPageSize);
  }

  get pagedOverdueEmis(): any[] {
    const start = (this.overduePage - 1) * this.overduePageSize;
    return this.filteredEmis.slice(start, start + this.overduePageSize);
  }

  onBookingsPageChange(p: number) {
    this.bookingsPage = p;
  }

  onBookingsPageSizeChange(size: number) {
    this.bookingsPageSize = size;
    this.bookingsPage = 1;
  }

  onOverduePageChange(p: number) {
    this.overduePage = p;
  }

  onOverduePageSizeChange(size: number) {
    this.overduePageSize = size;
    this.overduePage = 1;
  }

  exportData(tab: 'bookings' | 'overdue', mode: 'current' | 'all', format: 'excel' | 'pdf') {
    if (tab === 'bookings') {
      const list = mode === 'current' ? this.pagedBookings : this.filteredBookings;
      const baseIndex = mode === 'current' ? (this.bookingsPage - 1) * this.bookingsPageSize : 0;
      const columns: ExportColumn[] = [
        { header: '#', key: '_sno', width: 6 },
        { header: 'Customer Name', key: 'cust_name', width: 22 },
        { header: 'Mobile Number', key: 'mobile_no', width: 16 },
        { header: 'Plot & Site', key: 'plot_site', width: 20 },
        { header: 'Advance Paid (Rs.)', key: 'advance_display', width: 16 },
        { header: 'Payment Type', key: 'payment_type_display', width: 14 },
        { header: 'Booking Date', key: 'booking_date_display', width: 14 },
        { header: 'Status', key: 'booking_status', width: 14 }
      ];

      const formatted = list.map((b, idx) => ({
        ...b,
        _sno: baseIndex + idx + 1,
        cust_name: b.customer_name || b.full_name || 'N/A',
        mobile_no: b.mobile_no || 'N/A',
        plot_site: `Plot #${b.plot_number} (${b.site_name || 'N/A'})`,
        advance_display: Number(b.advance_amount || b.booking_amount || 0).toLocaleString(),
        payment_type_display: b.payment_type || b.payment_mode || 'EMI Plan',
        booking_date_display: b.booking_date ? new Date(b.booking_date).toLocaleDateString() : 'N/A'
      }));

      const title = mode === 'current' ? `Plot Bookings (Page ${this.bookingsPage})` : 'All Plot Bookings';
      const filename = `plot_bookings_${mode}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'excel') {
        this.exportService.exportToExcel(formatted, columns, filename, title);
      } else {
        this.exportService.exportToPdf(formatted, columns, filename, title);
      }
    } else {
      const list = mode === 'current' ? this.pagedOverdueEmis : this.filteredEmis;
      const baseIndex = mode === 'current' ? (this.overduePage - 1) * this.overduePageSize : 0;
      const columns: ExportColumn[] = [
        { header: '#', key: '_sno', width: 6 },
        { header: 'Customer Name', key: 'cust_name', width: 22 },
        { header: 'Mobile Number', key: 'mobile_no', width: 16 },
        { header: 'Plot & Site', key: 'plot_site', width: 20 },
        { header: 'EMI Amount (Rs.)', key: 'emi_display', width: 16 },
        { header: 'Due Date', key: 'due_date_display', width: 14 },
        { header: 'Overdue Days', key: 'overdue_days_display', width: 14 },
        { header: 'Late Fee Due (Rs.)', key: 'late_fee_display', width: 16 }
      ];

      const formatted = list.map((e, idx) => ({
        ...e,
        _sno: baseIndex + idx + 1,
        cust_name: e.full_name || e.customer_name || 'N/A',
        mobile_no: e.mobile_no || 'N/A',
        plot_site: `Plot #${e.plot_number} (${e.site_name || 'N/A'})`,
        emi_display: Number(e.emi_amount || e.amount || 0).toLocaleString(),
        due_date_display: e.due_date ? new Date(e.due_date).toLocaleDateString() : 'N/A',
        overdue_days_display: `${e.overdue_days || 0} Days`,
        late_fee_display: Number(e.late_fee_due || 0).toLocaleString()
      }));

      const title = mode === 'current' ? `Overdue EMIs (Page ${this.overduePage})` : 'All Overdue EMI Installments';
      const filename = `overdue_emis_${mode}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'excel') {
        this.exportService.exportToExcel(formatted, columns, filename, title);
      } else {
        this.exportService.exportToPdf(formatted, columns, filename, title);
      }
    }
  }

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
