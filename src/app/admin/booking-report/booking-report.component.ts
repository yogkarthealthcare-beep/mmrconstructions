import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = true;
  search = '';
  categoryFilter: string = 'all'; // 'all' | 'customer' | 'associate' | 'investor' | 'general_site_visit' | 'site_visit' | 'general'
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
    this.route.queryParams.subscribe(params => {
      const type = params['type'] || 'all';
      if (['all', 'customer', 'associate', 'investor', 'general_site_visit', 'site_visit', 'general'].includes(type)) {
        this.categoryFilter = type;
        this.page = 1;
      }
    });
    this.fetchBookingReports();
  }

  setCategory(cat: string) {
    this.categoryFilter = cat;
    this.page = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: cat === 'all' ? { type: null } : { type: cat },
      queryParamsHandling: 'merge'
    });
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  getInquiryCategory(item: any): 'customer' | 'associate' | 'investor' | 'site_visit' | 'general' {
    const rawType = String(item.inquiry_type || item.interest || '').toLowerCase().trim();
    const rawMsg = String(item.inquiry_message || item.message || '').toLowerCase();
    const rawPage = String(item.source_page || '').toLowerCase();
    const combined = `${rawType} ${rawMsg} ${rawPage}`;

    // 1. Associate / Commission Program
    if (rawType.includes('associate') || combined.includes('associate') || combined.includes('commission') || combined.includes('downline') || combined.includes('network program')) {
      return 'associate';
    }
    // 2. Investor
    if (rawType.includes('investor') || rawType.includes('investment') || combined.includes('investor') || combined.includes('deposit request') || combined.includes('high return')) {
      return 'investor';
    }
    // 3. Site Visit Request
    if (rawType.includes('site visit') || rawType.includes('visit') || combined.includes('site visit') || combined.includes('cab arrangement') || combined.includes('visit request')) {
      return 'site_visit';
    }
    // 4. Plot Booking (Customer)
    if (rawType.includes('plot') || rawType.includes('booking') || rawType.includes('purchase') || combined.includes('plot booking') || combined.includes('plot purchase') || combined.includes('gaj') || combined.includes('residential plot') || combined.includes('commercial plot')) {
      return 'customer';
    }
    // 5. General Enquiry
    return 'general';
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'customer': return 'Plot Booking';
      case 'investor': return 'Investor';
      case 'associate': return 'Associate / Commission Program';
      case 'general_site_visit': return 'Site Visit & General';
      case 'site_visit': return 'Site Visit Request';
      case 'general': return 'General Enquiry';
      default: return 'General Enquiry';
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'customer': return 'badge-category-customer';
      case 'associate': return 'badge-category-associate';
      case 'investor': return 'badge-category-investor';
      case 'general_site_visit': return 'badge-category-sitevisit';
      case 'site_visit': return 'badge-category-sitevisit';
      case 'general': return 'badge-category-general';
      default: return 'bg-light text-dark';
    }
  }

  private isInvalidSiteName(name: string): boolean {
    if (!name) return true;
    const lower = name.toLowerCase().trim();
    return lower === 'general plot inquiry' ||
           lower === 'website' ||
           lower === 'site-map-new page' ||
           lower === 'home page popup' ||
           lower.startsWith('plot booking') ||
           lower.startsWith('associate') ||
           lower.startsWith('investor') ||
           lower.startsWith('site visit') ||
           lower.startsWith('general') ||
           lower.includes('commission') ||
           lower.includes('gaj');
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedBookings : this.filtered;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Interested In / Category', key: 'category_label', width: 22 },
      { header: 'Lead Name', key: 'name', width: 20 },
      { header: 'Mobile Number', key: 'mobile', width: 16 },
      { header: 'Email Address', key: 'email_display', width: 22 },
      { header: 'Selected Site / Project', key: 'site_name', width: 20 },
      { header: 'Requirement / Topic', key: 'interest', width: 20 },
      { header: 'Inquiry Date', key: 'date_display', width: 14 },
      { header: 'Status', key: 'status_display', width: 12 }
    ];

    const formatted = list.map((b, idx) => ({
      ...b,
      _sno: baseIndex + idx + 1,
      category_label: this.getCategoryLabel(b.category),
      email_display: b.email || 'N/A',
      date_display: b.date ? new Date(b.date).toLocaleDateString() : 'N/A',
      status_display: String(b.status || 'open').toUpperCase()
    }));

    const catTitle = this.pageTitle;
    const title = mode === 'current' ? `${catTitle} (Page ${this.page})` : `All ${catTitle}`;
    const filename = `inquiries_report_${this.categoryFilter}_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

  fetchBookingReports() {
    this.loading = true;
    this.api.getAdminInquiries({ pageSize: 200 }).subscribe({
      next: (res: any) => {
        this.loading = false;
        const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.bookings = raw.map((item: any) => {
          const cat = this.getInquiryCategory(item);
          let cleanSiteName = item.site_name || item.property_name || '';
          if (this.isInvalidSiteName(cleanSiteName)) {
            cleanSiteName = 'General / All Sites';
          }

          return {
            id: item.inquiry_id || item.id,
            name: item.full_name || item.name || 'Customer',
            mobile: item.mobile_no || item.mobile || '',
            email: item.email || '',
            site_id: item.site_id || null,
            site_name: cleanSiteName,
            interest: item.inquiry_type || item.interest || this.getCategoryLabel(cat),
            message: item.inquiry_message || item.message || '',
            source_page: item.source_page || 'Website',
            date: item.created_at || new Date().toISOString(),
            status: String(item.status || 'open').toLowerCase() === 'new' ? 'open' : String(item.status || 'open').toLowerCase(),
            notes: item.remarks || item.notes || 'Inquiry request submitted via website.',
            category: cat,
            category_label: this.getCategoryLabel(cat),
            category_badge_class: this.getCategoryBadgeClass(cat)
          };
        });

        this.loadProjectSites();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadProjectSites() {
    this.api.getSiteGallery('Plot').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        const siteSet = new Set<string>();
        if (Array.isArray(raw) && raw.length > 0) {
          raw.forEach((s: any) => {
            if (s.site_name && !this.isInvalidSiteName(s.site_name)) {
              siteSet.add(s.site_name.trim());
            }
          });
        }
        // Add valid project names from inquiries
        this.bookings.forEach(b => {
          if (b.site_name && b.site_name !== 'General / All Sites' && !this.isInvalidSiteName(b.site_name)) {
            siteSet.add(b.site_name.trim());
          }
        });
        this.availableSites = Array.from(siteSet);
      },
      error: () => {
        const siteSet = new Set<string>();
        this.bookings.forEach(b => {
          if (b.site_name && b.site_name !== 'General / All Sites' && !this.isInvalidSiteName(b.site_name)) {
            siteSet.add(b.site_name.trim());
          }
        });
        this.availableSites = Array.from(siteSet);
      }
    });
  }

  get allCount(): number {
    return this.bookings.length;
  }

  get customerCount(): number {
    return this.bookings.filter(b => b.category === 'customer').length;
  }

  get associateCount(): number {
    return this.bookings.filter(b => b.category === 'associate').length;
  }

  get investorCount(): number {
    return this.bookings.filter(b => b.category === 'investor').length;
  }

  get generalSiteVisitCount(): number {
    return this.bookings.filter(b => b.category === 'site_visit' || b.category === 'general').length;
  }

  get siteVisitCount(): number {
    return this.bookings.filter(b => b.category === 'site_visit').length;
  }

  get generalCount(): number {
    return this.bookings.filter(b => b.category === 'general').length;
  }

  get currentCategoryList(): any[] {
    if (this.categoryFilter === 'all') return this.bookings;
    if (this.categoryFilter === 'general_site_visit') {
      return this.bookings.filter(b => b.category === 'site_visit' || b.category === 'general');
    }
    return this.bookings.filter(b => b.category === this.categoryFilter);
  }

  get openCount(): number {
    return this.currentCategoryList.filter(b => b.status === 'open').length;
  }

  get followUpCount(): number {
    return this.currentCategoryList.filter(b => b.status === 'called' || b.status === 'follow-up').length;
  }

  get closedCount(): number {
    return this.currentCategoryList.filter(b => b.status === 'closed').length;
  }

  get pageTitle(): string {
    switch (this.categoryFilter) {
      case 'customer': return 'Plot Booking Inquiries';
      case 'investor': return 'Investor Inquiries';
      case 'associate': return 'Associate / Commission Program Inquiries';
      case 'general_site_visit': return 'Site Visit & General Enquiries';
      case 'site_visit': return 'Site Visit Requests';
      case 'general': return 'General Enquiries';
      default: return 'All Inquiries & Booking Reports';
    }
  }

  get pageSubtitle(): string {
    switch (this.categoryFilter) {
      case 'customer': return 'Plot purchase, size preference, and property booking requests from customers.';
      case 'investor': return 'Investment plans, high-yield deposit and investor portal inquiries.';
      case 'associate': return 'Prospective associate registrations and commission network inquiries.';
      case 'general_site_visit': return 'Public customer site visit appointments, transportation assistance, and general queries.';
      case 'site_visit': return 'Customer site visit appointments and transportation assistance requests.';
      case 'general': return 'General pricing, EMI details, brochures, and miscellaneous messages.';
      default: return 'Comprehensive CRM inquiry records across Plot Booking, Investor, Associate, Site Visits, and General categories.';
    }
  }

  get pageIcon(): string {
    switch (this.categoryFilter) {
      case 'customer': return 'fas fa-map-marked-alt text-emerald';
      case 'investor': return 'fas fa-hand-holding-usd text-purple';
      case 'associate': return 'fas fa-user-friends text-amber';
      case 'general_site_visit': return 'fas fa-envelope-open-text text-primary';
      case 'site_visit': return 'fas fa-car text-primary';
      case 'general': return 'fas fa-comments text-secondary';
      default: return 'fas fa-file-signature text-emerald';
    }
  }

  get filtered(): any[] {
    return this.bookings.filter(b => {
      let matchCategory = true;
      if (this.categoryFilter === 'general_site_visit') {
        matchCategory = b.category === 'site_visit' || b.category === 'general';
      } else if (this.categoryFilter !== 'all') {
        matchCategory = b.category === this.categoryFilter;
      }

      const matchStatus = this.statusFilter === 'all' ? true : b.status === this.statusFilter;
      const matchSite = this.siteFilter === 'all' ? true : b.site_name === this.siteFilter;
      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        b.name?.toLowerCase().includes(q) ||
        b.mobile?.includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.site_name?.toLowerCase().includes(q) ||
        b.interest?.toLowerCase().includes(q) ||
        b.message?.toLowerCase().includes(q) ||
        b.category_label?.toLowerCase().includes(q);

      return matchCategory && matchStatus && matchSite && matchSearch;
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
    this.showToast(`Inquiry status updated to ${newStatus}`);
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
