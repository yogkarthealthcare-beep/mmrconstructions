import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-booking-report',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent],
  templateUrl: './booking-report.component.html',
  styleUrls: ['./booking-report.component.css']
})
export class BookingReportComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

  loading = true;
  search = '';
  statusFilter = 'all';
  siteFilter = 'all';
  activeRowId: any = null;

  page = 1;
  pageSize = 10;

  bookings: any[] = [];
  availableSites: string[] = [];
  toast = '';

  selectedBooking: any = null;
  newNoteText = '';
  showDetailModal = false;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }

  ngOnInit() {
    this.fetchBookingReports();
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedBookings : this.filtered;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Customer Name', key: 'name', width: 22 },
      { header: 'Mobile Number', key: 'mobile', width: 16 },
      { header: 'Email Address', key: 'email_display', width: 22 },
      { header: 'Selected Site', key: 'site_name', width: 20 },
      { header: 'Plot Preference', key: 'interest', width: 18 },
      { header: 'Booking Date', key: 'date_display', width: 14 },
      { header: 'Status', key: 'status_display', width: 12 }
    ];

    const formatted = list.map((b, idx) => ({
      ...b,
      _sno: baseIndex + idx + 1,
      email_display: b.email || 'N/A',
      date_display: b.date ? new Date(b.date).toLocaleDateString() : 'N/A',
      status_display: String(b.status || 'open').toUpperCase()
    }));

    const title = mode === 'current' ? `Booking Reports (Page ${this.page})` : 'All Plot Booking Reports';
    const filename = `booking_report_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

  fetchBookingReports() {
    this.loading = true;
    this.api.getAdminInquiries({ pageSize: 100 }).subscribe({
      next: (res: any) => {
        this.loading = false;
        const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.bookings = raw.map((item: any) => ({
          id: item.inquiry_id || item.id,
          name: item.full_name || item.name || 'Customer',
          mobile: item.mobile_no || item.mobile || '',
          email: item.email || '',
          site_id: item.site_id || null,
          site_name: item.site_name || item.property_name || 'General Plot Inquiry',
          interest: item.inquiry_type || item.interest || 'Plot Booking',
          message: item.inquiry_message || item.message || '',
          source_page: item.source_page || 'Site-Map-New Page',
          date: item.created_at || new Date().toISOString(),
          status: String(item.status || 'open').toLowerCase() === 'new' ? 'open' : String(item.status || 'open').toLowerCase(),
          notes: item.remarks || item.notes || 'Plot booking request submitted via website.'
        }));

        // Extract unique site names for filtering
        const siteSet = new Set<string>();
        this.bookings.forEach(b => {
          if (b.site_name && b.site_name !== 'General Plot Inquiry') {
            siteSet.add(b.site_name);
          }
        });
        this.availableSites = Array.from(siteSet);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get openCount(): number {
    return this.bookings.filter(b => b.status === 'open').length;
  }

  get followUpCount(): number {
    return this.bookings.filter(b => b.status === 'called' || b.status === 'follow-up').length;
  }

  get closedCount(): number {
    return this.bookings.filter(b => b.status === 'closed').length;
  }

  get filtered(): any[] {
    return this.bookings.filter(b => {
      const matchStatus = this.statusFilter === 'all' ? true : b.status === this.statusFilter;
      const matchSite = this.siteFilter === 'all' ? true : b.site_name === this.siteFilter;
      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        b.name?.toLowerCase().includes(q) ||
        b.mobile?.includes(q) ||
        b.site_name?.toLowerCase().includes(q) ||
        b.interest?.toLowerCase().includes(q) ||
        b.message?.toLowerCase().includes(q);

      return matchStatus && matchSite && matchSearch;
    });
  }

  get pagedBookings(): any[] {
    const startIndex = (this.page - 1) * this.pageSize;
    return this.filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filtered.length / this.pageSize) || 1;
  }

  changePage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
    }
  }

  onFilterChange() {
    this.page = 1;
  }

  updateStatus(b: any, newStatus: string) {
    b.status = newStatus;
    this.showToast(`Booking status updated to ${newStatus}`);
  }

  openDetailModal(b: any) {
    this.selectedBooking = b;
    this.newNoteText = '';
    this.showDetailModal = true;
  }

  addNoteToBooking() {
    if (!this.selectedBooking || !this.newNoteText.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const noteLine = `\n[${time}] ${this.newNoteText.trim()}`;
    this.selectedBooking.notes = (this.selectedBooking.notes || '') + noteLine;
    this.showToast('Follow-up note added!');
    this.newNoteText = '';
  }

  closeModals() {
    this.showDetailModal = false;
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
