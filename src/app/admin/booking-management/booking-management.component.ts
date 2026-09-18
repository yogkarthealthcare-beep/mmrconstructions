import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ApiService, BASE_URL } from '../../services/api.service';
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
  baseUrl = BASE_URL;

  // Master Section Switcher: 'bookings' (Bookings & Allocations) vs 'inquiries' (Plot Booking Leads)
  mainSection: 'bookings' | 'inquiries' = 'bookings';

  loading = true;
  detailLoading = false;
  actionLoading = false;
  bookings: any[] = [];
  selected: any = null;
  page = 1;
  pageSize = 10;
  toast = '';
  toastType: 'success' | 'error' = 'success';

  // Quick Filter Tab for Bookings
  activeQuickFilter: 'ALL' | 'PENDING' | 'CONFIRMED' | 'OFFLINE' | 'CANCELLED' = 'ALL';

  // Detail Drawer Active Tab
  activeDetailTab: 'overview' | 'proofs' | 'emi' | 'appointment' = 'overview';

  // Booking Filter Form
  filterForm = this.fb.group({
    search: [''],
    status: [''],
    paymentMethod: [''],
  });

  // Dynamic Sites List
  sites: any[] = [];

  // ==========================================
  // PLOT ALLOCATION MODAL STATE
  // ==========================================
  showAllocateModal = false;
  allocateSubmitting = false;
  linkedInquiryId: number | null = null;

  // Customer Search within Allocation Modal
  customerSearchInput$ = new Subject<string>();
  customerSearchQuery = '';
  customerSearchResults: any[] = [];
  customerSearching = false;
  selectedCustomer: any = null;

  // Selected Site & Manual Plot Text
  allocateSiteId: number | null = null;
  allocatePlotNumber = '';
  plotValidation = {
    checked: false,
    loading: false,
    exists: false,
    is_available: false,
    plot: null as any,
    message: ''
  };

  // Allocation Form
  allocateForm = this.fb.group({
    total_price: [null as number | null, [Validators.required, Validators.min(1)]],
    initial_payment_amount: [0 as number | null, [Validators.required, Validators.min(0)]],
    payment_mode: ['Cash', Validators.required],
    payment_reference: [''],
    remarks: [''],
  });

  // ==========================================
  // PLOT BOOKING INQUIRIES STATE
  // ==========================================
  inquiries: any[] = [];
  inquiryLoading = false;
  inquiryPage = 1;
  inquiryPageSize = 10;
  inquiryTotal = 0;
  inquirySearch = '';
  inquiryStatusFilter = '';
  inquirySiteFilter = '';

  // ==========================================
  // RECORD MILESTONE PAYMENT MODAL STATE
  // ==========================================
  showRecordPaymentModal = false;
  recordPaymentSubmitting = false;
  recordPaymentForm = this.fb.group({
    received_amount: [null as number | null, [Validators.required, Validators.min(1)]],
    payment_mode: ['Cash', Validators.required],
    payment_reference: [''],
    payment_date: [new Date().toISOString().slice(0, 10), Validators.required],
    remarks: [''],
  });

  // Legacy Action Modals
  previewImageUrl: string | null = null;
  showOfflineApproveModal = false;
  showPartialPaymentModal = false;
  showRescheduleModal = false;
  showRejectModal = false;

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
    this.loadSites();
    this.loadBookings();
    this.filterForm.valueChanges.subscribe(() => (this.page = 1));

    // Debounced Customer Search
    this.customerSearchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        if (!term || term.trim().length < 2) {
          this.customerSearching = false;
          return of({ data: [] });
        }
        this.customerSearching = true;
        return this.api.adminSearchUsers({ search: term.trim(), user_type: 'Customer', limit: 8 });
      })
    ).subscribe({
      next: (res: any) => {
        this.customerSearching = false;
        const list = Array.isArray(res) ? res : (res?.data || res?.users || res?.rows || []);
        this.customerSearchResults = list;
      },
      error: () => {
        this.customerSearching = false;
        this.customerSearchResults = [];
      }
    });
  }

  // --- Sites Fetch ---
  loadSites() {
    this.api.getSites().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        this.sites = raw.map((s: any) => ({
          site_id: Number(s.site_id || s.id),
          site_name: s.site_name || s.name || 'Site',
          city: s.city || 'UP'
        }));
      },
      error: () => {}
    });
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
    return this.bookings.filter(b => b.booking_status === 'Confirmed' || b.booking_status === 'Fully Paid').length;
  }

  get pendingBookingsCount(): number {
    return this.bookings.filter(b =>
      b.booking_status === 'Pending' ||
      b.booking_status === 'PaymentPending' ||
      b.booking_status === 'Allocated' ||
      b.workflow_status === 'Submitted' ||
      b.workflow_status === 'Under Review' ||
      b.workflow_status === 'Plot Allocated by Admin'
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

  setMainSection(sec: 'bookings' | 'inquiries') {
    this.mainSection = sec;
    if (sec === 'inquiries' && !this.inquiries.length) {
      this.loadInquiries();
    }
  }

  // Quick Filter Switcher
  setQuickFilter(filter: 'ALL' | 'PENDING' | 'CONFIRMED' | 'OFFLINE' | 'CANCELLED') {
    this.activeQuickFilter = filter;
    this.page = 1;
  }

  // Filtered Bookings List
  get filteredBookings(): any[] {
    const q = String(this.filterForm.value.search || '').trim().toLowerCase();
    const status = this.filterForm.value.status || '';
    const paymentMethod = this.filterForm.value.paymentMethod || '';

    return this.bookings.filter(b => {
      if (this.activeQuickFilter === 'PENDING') {
        const isPending = b.booking_status === 'Pending' ||
                          b.booking_status === 'PaymentPending' ||
                          b.booking_status === 'Allocated' ||
                          b.workflow_status === 'Submitted' ||
                          b.workflow_status === 'Under Review' ||
                          b.workflow_status === 'Plot Allocated by Admin';
        if (!isPending) return false;
      } else if (this.activeQuickFilter === 'CONFIRMED') {
        if (b.booking_status !== 'Confirmed' && b.booking_status !== 'Fully Paid') return false;
      } else if (this.activeQuickFilter === 'OFFLINE') {
        const pm = String(b.payment_method || b.payment_type || '').toLowerCase();
        if (pm !== 'offline' && pm !== 'cheque' && pm !== 'cash' && pm !== 'bank transfer') return false;
      } else if (this.activeQuickFilter === 'CANCELLED') {
        if (b.booking_status !== 'Cancelled' && b.booking_status !== 'Rejected') return false;
      }

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
      if (status && b.booking_status !== status) return false;
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

  onPageChange(p: number) { this.page = p; }
  onPageSizeChange(size: number) { this.pageSize = size; this.page = 1; }

  loadBookings() {
    this.loading = true;
    this.api.adminGetBookings({}).subscribe({
      next: (res: any) => {
        this.bookings = res?.data || [];
        this.loading = false;
        if (this.selected?.booking_id) {
          const fresh = this.bookings.find(b => b.booking_id === this.selected.booking_id);
          if (fresh) this.selected = { ...this.selected, ...fresh };
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

  // ==========================================
  // PLOT ALLOCATION MODAL LOGIC
  // ==========================================
  openAllocateModal(prefillCustomer: any = null, prefillInquiry: any = null) {
    this.linkedInquiryId = prefillInquiry ? Number(prefillInquiry.inquiry_id) : null;
    this.selectedCustomer = prefillCustomer || null;
    this.customerSearchQuery = prefillCustomer ? `${prefillCustomer.full_name} (${prefillCustomer.mobile_no || prefillCustomer.member_id})` : '';
    this.customerSearchResults = [];
    this.allocateSiteId = prefillInquiry?.site_id ? Number(prefillInquiry.site_id) : (this.sites.length ? this.sites[0].site_id : null);
    this.allocatePlotNumber = prefillInquiry?.plot_number ? String(prefillInquiry.plot_number).trim() : '';

    this.plotValidation = {
      checked: false,
      loading: false,
      exists: false,
      is_available: false,
      plot: null,
      message: ''
    };

    this.allocateForm.reset({
      total_price: null,
      initial_payment_amount: 0,
      payment_mode: 'Cash',
      payment_reference: '',
      remarks: prefillInquiry ? `Plot allocated from Inquiry #${prefillInquiry.inquiry_id}` : 'Admin manual plot allocation'
    });

    this.showAllocateModal = true;

    if (this.allocateSiteId && this.allocatePlotNumber) {
      this.validatePlot();
    }
  }

  onCustomerSearchType(text: string) {
    this.customerSearchQuery = text;
    this.customerSearchInput$.next(text);
  }

  selectCustomer(cust: any) {
    this.selectedCustomer = cust;
    this.customerSearchQuery = `${cust.full_name} · ${cust.member_id || cust.mobile_no || 'Cust #' + cust.user_id}`;
    this.customerSearchResults = [];
  }

  clearSelectedCustomer() {
    this.selectedCustomer = null;
    this.customerSearchQuery = '';
    this.customerSearchResults = [];
  }

  onSiteOrPlotChange() {
    this.plotValidation.checked = false;
    this.plotValidation.exists = false;
    this.plotValidation.is_available = false;
    this.plotValidation.plot = null;
    this.plotValidation.message = '';

    if (this.allocateSiteId && this.allocatePlotNumber.trim().length >= 1) {
      this.validatePlot();
    }
  }

  validatePlot() {
    if (!this.allocateSiteId || !this.allocatePlotNumber.trim()) return;

    this.plotValidation.loading = true;
    this.api.adminValidatePlotAvailability(this.allocateSiteId, this.allocatePlotNumber.trim()).subscribe({
      next: (res: any) => {
        this.plotValidation.loading = false;
        this.plotValidation.checked = true;
        const data = res?.data || res;
        this.plotValidation.exists = Boolean(data?.exists);
        this.plotValidation.is_available = Boolean(data?.is_available);
        this.plotValidation.plot = data?.plot || null;
        this.plotValidation.message = data?.message || '';

        if (this.plotValidation.is_available && this.plotValidation.plot) {
          const basePrice = Number(this.plotValidation.plot.base_price || 0);
          if (basePrice > 0 && !this.allocateForm.value.total_price) {
            this.allocateForm.patchValue({ total_price: basePrice });
          }
        }
      },
      error: (e: any) => {
        this.plotValidation.loading = false;
        this.plotValidation.checked = true;
        this.plotValidation.exists = false;
        this.plotValidation.is_available = false;
        this.plotValidation.message = e?.error?.message || 'Error validating plot availability.';
      }
    });
  }

  get remainingBalancePreview(): number {
    const total = Number(this.allocateForm.value.total_price || 0);
    const init = Number(this.allocateForm.value.initial_payment_amount || 0);
    return Math.max(0, total - init);
  }

  submitPlotAllocation() {
    if (!this.selectedCustomer) {
      this.showToast('Please search and select an active customer first.', 'error');
      return;
    }
    if (!this.allocateSiteId) {
      this.showToast('Please select a project site.', 'error');
      return;
    }
    if (!this.allocatePlotNumber.trim()) {
      this.showToast('Please enter a plot number.', 'error');
      return;
    }
    if (!this.plotValidation.checked || !this.plotValidation.exists || !this.plotValidation.is_available) {
      this.showToast(this.plotValidation.message || 'Plot is not available for allocation.', 'error');
      return;
    }
    if (this.allocateForm.invalid) {
      this.showToast('Please fill all required allocation and pricing fields.', 'error');
      return;
    }

    const { total_price, initial_payment_amount, payment_mode, payment_reference, remarks } = this.allocateForm.value;

    this.allocateSubmitting = true;
    this.api.adminAllocatePlot({
      user_id: this.selectedCustomer.user_id || this.selectedCustomer.id,
      site_id: this.allocateSiteId,
      plot_number: this.allocatePlotNumber.trim(),
      total_price: Number(total_price),
      initial_payment_amount: Number(initial_payment_amount || 0),
      payment_mode: payment_mode || 'Cash',
      payment_reference: payment_reference ? String(payment_reference).trim() : '',
      inquiry_id: this.linkedInquiryId,
      remarks: remarks || ''
    }).subscribe({
      next: (res: any) => {
        this.allocateSubmitting = false;
        this.showAllocateModal = false;
        this.showToast(res?.message || 'Plot allocated successfully!');
        this.loadBookings();
        if (this.mainSection === 'inquiries') {
          this.loadInquiries();
        }
      },
      error: (e: any) => {
        this.allocateSubmitting = false;
        this.showToast(e?.error?.message || 'Plot allocation failed.', 'error');
      }
    });
  }

  // ==========================================
  // INQUIRIES DESK LOGIC
  // ==========================================
  loadInquiries() {
    this.inquiryLoading = true;
    this.api.adminGetPlotInquiries({
      search: this.inquirySearch.trim(),
      status: this.inquiryStatusFilter,
      site_id: this.inquirySiteFilter,
      page: this.inquiryPage,
      limit: this.inquiryPageSize
    }).subscribe({
      next: (res: any) => {
        this.inquiryLoading = false;
        this.inquiries = res?.data?.inquiries || res?.inquiries || [];
        this.inquiryTotal = Number(res?.data?.total || res?.total || this.inquiries.length);
      },
      error: (e: any) => {
        this.inquiryLoading = false;
        this.showToast(e?.error?.message || 'Unable to load plot inquiries.', 'error');
      }
    });
  }

  onInquirySearch() {
    this.inquiryPage = 1;
    this.loadInquiries();
  }

  openAllocateFromInquiry(inq: any) {
    let prefillCust = null;
    if (inq.matched_user_id) {
      prefillCust = {
        user_id: inq.matched_user_id,
        member_id: inq.matched_member_id,
        full_name: inq.full_name,
        mobile_no: inq.mobile_no,
        email: inq.email,
        user_type: inq.matched_user_type || 'Customer'
      };
    }
    this.openAllocateModal(prefillCust, inq);
  }

  updateInquiryStatus(inq: any, status: string) {
    this.api.adminUpdatePlotInquiryStatus(inq.inquiry_id, { status }).subscribe({
      next: () => {
        this.showToast(`Inquiry marked as "${status}".`);
        inq.status = status;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Status update failed.', 'error');
      }
    });
  }

  // ==========================================
  // MILESTONE / PARTIAL PAYMENT ENTRY
  // ==========================================
  openRecordPaymentModal() {
    if (!this.selected) return;
    this.recordPaymentForm.reset({
      received_amount: null,
      payment_mode: 'Cash',
      payment_reference: '',
      payment_date: new Date().toISOString().slice(0, 10),
      remarks: 'Milestone installment payment'
    });
    this.showRecordPaymentModal = true;
  }

  submitRecordPayment() {
    if (this.recordPaymentForm.invalid || !this.selected) return;
    const { received_amount, payment_mode, payment_reference, payment_date, remarks } = this.recordPaymentForm.value;

    this.recordPaymentSubmitting = true;
    this.api.adminRecordPlotPayment(this.selected.booking_id, {
      received_amount: Number(received_amount),
      payment_mode: payment_mode || 'Cash',
      payment_reference: String(payment_reference || '').trim(),
      payment_date,
      remarks: remarks || ''
    }).subscribe({
      next: (res: any) => {
        this.recordPaymentSubmitting = false;
        this.showRecordPaymentModal = false;
        this.showToast(res?.message || 'Payment recorded under verification.');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.recordPaymentSubmitting = false;
        this.showToast(e?.error?.message || 'Recording payment failed.', 'error');
      }
    });
  }

  verifyPayment(paymentId: number) {
    if (!paymentId) return;
    this.actionLoading = true;
    this.api.adminVerifyPlotPayment(paymentId).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.showToast(res?.message || 'Payment verified and official receipt generated!');
        this.refreshAfterAction();
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Payment verification failed.', 'error');
      }
    });
  }

  // Legacy Action Handlers
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
        this.showToast(res?.message || 'Booking cancelled and plot released back to Vacant.');
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
