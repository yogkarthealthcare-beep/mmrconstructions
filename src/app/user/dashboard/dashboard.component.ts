import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, BASE_URL } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';

export interface PropertyDossier {
  booking_id: number;
  booking_serial: string;
  plot_id: number;
  plot_number: string;
  site_id: number;
  site_name: string;
  site_location?: string;
  block_name: string;
  area_gaj: number;
  area_sqft: number;
  booking_date: string;
  rate_per_gaj: number;
  total_price: number;
  confirmed_paid: number;
  unpaid_balance: number;
  payment_progress: number;
  booking_status: string;
  payment_status: string;
  next_emi?: any;
  all_emis: any[];
  pending_amount?: number;
  overdue_amount?: number;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, VerifiedBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  baseUrl = BASE_URL;
  loading = true;
  profile: any = {};
  userData: any = {};
  bookings: any[] = [];
  emis: any[] = [];
  buybackApplications: any[] = [];
  notifications: any[] = [];
  sites: any[] = [];

  // Active Portfolio Tab: 'active' (Purchased/Booked) or 'sold' (Sold/Buyback)
  portfolioTab: 'active' | 'sold' = 'active';

  // Computed Properties List
  propertyDossiers: PropertyDossier[] = [];

  // Filter & Search Controls
  searchTerm = '';
  selectedSiteFilter = 'all';
  selectedStatusFilter = 'all';

  // Inquiry Modal State
  inquiryModalOpen = false;
  inquirySubmitting = false;
  inquirySubmitted = false;
  inquiryError = '';
  inquiryForm = {
    full_name: '',
    mobile_no: '',
    email: '',
    site_id: null as number | null,
    inquiry_type: 'Plot Purchase — 100 Gaj',
    inquiry_message: ''
  };

  // Comprehensive Plot Dossier Modal State (8 Tabs)
  dossierModalOpen = false;
  dossierLoading = false;
  dossierActiveTab: 'summary' | 'history' | 'emis' | 'receipts' | 'vouchers' | 'pending' | 'excess' | 'disputes' = 'summary';
  selectedPlotForDossier: PropertyDossier | null = null;
  dossierData: any = null;

  // Unified Payment Modal State
  paymentModalOpen = false;
  selectedPropertyForPayment: PropertyDossier | null = null;
  paymentForm: any = {
    payment_purpose: 'EmiPayment',
    emi_id: null,
    amount: 0,
    payment_mode: 'UPI',
    utr_number: '',
    bank_name: '',
    cheque_number: '',
    cheque_date: '',
    customer_notes: '',
    proof_file: null as File | null
  };
  paymentSubmitting = false;
  paymentSuccessMsg = '';
  paymentErrorMsg = '';

  // Report Missing Payment Modal State
  missingPaymentModalOpen = false;
  missingPaymentSubmitting = false;
  missingPaymentSuccess = '';
  missingPaymentError = '';
  missingPaymentForm: any = {
    booking_id: null,
    claimed_amount: '',
    claimed_payment_date: new Date().toISOString().split('T')[0],
    claimed_payment_mode: 'Cash',
    claimed_utr_number: '',
    claimed_cheque_number: '',
    claimed_receipt_no: '',
    claimed_collector_name: '',
    remarks: '',
    proof_file: null as File | null
  };

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userData = this.auth.getUser() || {};
    this.auth.user$.subscribe(u => {
      if (u) this.userData = u;
    });

    this.initInquiryDefaults();
    this.loadAllData();
  }

  get basePrefix(): string {
    return this.router.url.startsWith('/associate') ? '/associate' : '/customer';
  }

  initInquiryDefaults() {
    this.inquiryForm.full_name = this.userData?.full_name || '';
    this.inquiryForm.mobile_no = this.userData?.mobile_no || '';
    this.inquiryForm.email = this.userData?.email || '';
  }

  loadAllData() {
    this.loading = true;

    Promise.all([
      this.api.getProfile().toPromise().then((r: any) => {
        if (r?.success) this.profile = r.data || {};
      }).catch(err => console.warn('Profile fetch warning:', err)),

      this.api.getBookings().toPromise().then((r: any) => {
        if (r?.success) this.bookings = r.data || [];
      }).catch(err => console.warn('Bookings fetch warning:', err)),

      this.api.getEmis().toPromise().then((r: any) => {
        if (r?.success) this.emis = r.data || [];
      }).catch(err => console.warn('EMIs fetch warning:', err)),

      this.api.getBuybackStatus().toPromise().then((r: any) => {
        if (r?.success) this.buybackApplications = r.data || [];
      }).catch(err => console.warn('Buyback fetch warning:', err)),

      this.api.getNotifications({ limit: 5 }).toPromise().then((r: any) => {
        if (r?.success) this.notifications = r.data?.notifications || [];
      }).catch(err => console.warn('Notifications fetch warning:', err)),

      this.api.getSites().toPromise().then((r: any) => {
        const raw = Array.isArray(r) ? r : (r?.data || []);
        this.sites = raw.map((s: any) => ({
          site_id: Number(s.site_id || s.id),
          site_name: s.site_name || s.name || 'Project Site'
        }));
      }).catch(err => console.warn('Sites fetch warning:', err))
    ]).finally(() => {
      this.buildPropertyDossiers();
      this.loading = false;
    });
  }

  buildPropertyDossiers() {
    this.propertyDossiers = this.bookings.map(b => {
      const plotNo = String(b.plot_number || '').trim();
      const plotEmis = this.emis.filter(e => 
        e.booking_id === b.booking_id || 
        String(e.plot_number || '').trim() === plotNo
      );

      const totalPrice = Number(b.total_amount || b.base_price || 0);
      const advancePaid = (b.booking_status === 'Confirmed' || b.booking_status === 'Active') ? Number(b.advance_amount || 0) : 0;
      const emisPaid = plotEmis
        .filter(e => e.emi_status === 'Paid')
        .reduce((sum, e) => sum + Number(e.paid_amount || e.emi_amount || 0), 0);

      const confirmedPaid = advancePaid + emisPaid;
      const unpaidBalance = Math.max(0, totalPrice - confirmedPaid);
      const paymentProgress = totalPrice > 0 ? Math.min(100, Math.round((confirmedPaid / totalPrice) * 100)) : 0;

      const nextEmi = plotEmis.find(e => e.emi_status === 'Pending' || e.emi_status === 'Overdue' || e.emi_status === 'ProofSubmitted' || e.emi_status === 'PartiallyPaid');

      const overdueEmis = plotEmis.filter(e => e.emi_status === 'Overdue' || (e.emi_status === 'Pending' && new Date(e.due_date) < new Date()));
      const overdueAmount = overdueEmis.reduce((sum, e) => sum + (Number(e.emi_amount) - Number(e.partially_paid_amount || 0) + Number(e.late_fee_amount || 0)), 0);

      let paymentStatus = 'Pending';
      if (unpaidBalance === 0 && totalPrice > 0) {
        paymentStatus = 'Fully Paid';
      } else if (confirmedPaid > 0) {
        paymentStatus = 'Partially Paid';
      }

      return {
        booking_id: Number(b.booking_id || b.id),
        booking_serial: b.booking_serial || `MMR-PLT-${b.plot_id || b.id}`,
        plot_id: Number(b.plot_id || b.id),
        plot_number: b.plot_number || 'Plot',
        site_id: Number(b.site_id || 0),
        site_name: b.site_name || 'MMR Project Site',
        site_location: b.site_location || b.location || 'Uttar Pradesh, India',
        block_name: b.block_name || 'Block A',
        area_gaj: Number(b.plot_area || b.area_gaj || 0),
        area_sqft: Number(b.sqft_area || (Number(b.plot_area || 0) * 9)),
        booking_date: b.booking_date || b.created_at || '—',
        rate_per_gaj: Number(b.plot_rate || 0),
        total_price: totalPrice,
        confirmed_paid: confirmedPaid,
        unpaid_balance: unpaidBalance,
        payment_progress: paymentProgress,
        booking_status: b.booking_status || 'Confirmed',
        payment_status: paymentStatus,
        next_emi: nextEmi || null,
        all_emis: plotEmis,
        overdue_amount: overdueAmount
      };
    });
  }

  // ── Top Summary KPI Numbers ─────────────────────────────────────────
  get purchasedPlotsCount(): number {
    return this.propertyDossiers.filter(p => p.booking_status !== 'Sold' && p.booking_status !== 'Cancelled').length;
  }

  get soldPlotsCount(): number {
    const approvedBuybacks = this.buybackApplications.filter(a => a.status === 'Approved' || a.status === 'Completed').length;
    const soldBookings = this.bookings.filter(b => b.booking_status === 'Sold').length;
    return approvedBuybacks + soldBookings;
  }

  get totalConfirmedPaid(): number {
    return this.propertyDossiers
      .filter(p => p.booking_status !== 'Sold' && p.booking_status !== 'Cancelled')
      .reduce((sum, p) => sum + p.confirmed_paid, 0);
  }

  get totalUnpaidAmount(): number {
    return this.propertyDossiers
      .filter(p => p.booking_status !== 'Sold' && p.booking_status !== 'Cancelled')
      .reduce((sum, p) => sum + p.unpaid_balance, 0);
  }

  // ── Filtered Property Dossiers by Portfolio Tab ──────────────────────
  get activePurchasedProperties(): PropertyDossier[] {
    return this.filterList(this.propertyDossiers.filter(p => p.booking_status !== 'Sold' && p.booking_status !== 'Cancelled'));
  }

  get soldTransferredProperties(): PropertyDossier[] {
    return this.filterList(this.propertyDossiers.filter(p => p.booking_status === 'Sold' || p.booking_status === 'Cancelled'));
  }

  private filterList(list: PropertyDossier[]): PropertyDossier[] {
    return list.filter(p => {
      const q = this.searchTerm.trim().toLowerCase();
      const matchSearch = !q ||
        p.plot_number.toLowerCase().includes(q) ||
        p.site_name.toLowerCase().includes(q) ||
        p.booking_serial.toLowerCase().includes(q) ||
        p.block_name.toLowerCase().includes(q);

      const matchSite = this.selectedSiteFilter === 'all' || p.site_name === this.selectedSiteFilter;
      const matchStatus = this.selectedStatusFilter === 'all' ||
        (this.selectedStatusFilter === 'fully_paid' && p.payment_status === 'Fully Paid') ||
        (this.selectedStatusFilter === 'partially_paid' && p.payment_status === 'Partially Paid') ||
        (this.selectedStatusFilter === 'pending' && p.payment_status === 'Pending');

      return matchSearch && matchSite && matchStatus;
    });
  }

  // ── 8-Tab Comprehensive Plot Dossier Modal ──────────────────────────
  openDossierModal(prop: PropertyDossier, tab: 'summary' | 'history' | 'emis' | 'receipts' | 'vouchers' | 'pending' | 'excess' | 'disputes' = 'summary') {
    this.selectedPlotForDossier = prop;
    this.dossierActiveTab = tab;
    this.dossierModalOpen = true;
    this.dossierLoading = true;

    this.api.getPlotPaymentDossier(prop.plot_id).subscribe({
      next: (res: any) => {
        this.dossierLoading = false;
        if (res.success) {
          this.dossierData = res.data;
        }
      },
      error: (err: any) => {
        this.dossierLoading = false;
        console.error('Failed to load plot dossier:', err);
      }
    });
  }

  closeDossierModal() {
    this.dossierModalOpen = false;
    this.selectedPlotForDossier = null;
    this.dossierData = null;
  }

  // ── Unified Payment Modal ───────────────────────────────────────────
  openPaymentModal(prop: PropertyDossier, emi?: any) {
    this.selectedPropertyForPayment = prop;
    const defaultAmount = emi ? (Number(emi.emi_amount) - Number(emi.partially_paid_amount || 0)) : (prop.next_emi ? (Number(prop.next_emi.emi_amount) - Number(prop.next_emi.partially_paid_amount || 0)) : Math.min(25000, prop.unpaid_balance));

    this.paymentForm = {
      payment_purpose: emi ? 'EmiPayment' : 'EmiPayment',
      emi_id: emi ? emi.emi_id : (prop.next_emi ? prop.next_emi.emi_id : null),
      amount: defaultAmount,
      payment_mode: 'UPI',
      utr_number: '',
      bank_name: '',
      cheque_number: '',
      cheque_date: new Date().toISOString().split('T')[0],
      customer_notes: '',
      proof_file: null
    };
    this.paymentSuccessMsg = '';
    this.paymentErrorMsg = '';
    this.paymentModalOpen = true;
  }

  closePaymentModal() {
    this.paymentModalOpen = false;
    this.selectedPropertyForPayment = null;
  }

  onPaymentProofFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.paymentForm.proof_file = file || null;
  }

  submitUnifiedPayment() {
    if (!this.selectedPropertyForPayment) return;
    this.paymentErrorMsg = '';
    this.paymentSuccessMsg = '';

    const amount = Number(this.paymentForm.amount);
    if (!amount || amount <= 0) {
      this.paymentErrorMsg = 'Please enter a valid payment amount.';
      return;
    }

    if (this.paymentForm.payment_mode === 'Cheque') {
      if (!this.paymentForm.cheque_number?.trim() || !this.paymentForm.bank_name?.trim()) {
        this.paymentErrorMsg = 'Cheque number and Bank Name are required for cheque payments.';
        return;
      }
    }

    this.paymentSubmitting = true;

    // If proof file is present, upload via FormData or submit payload
    const payload = {
      booking_id: this.selectedPropertyForPayment.booking_id,
      payment_mode: this.paymentForm.payment_mode,
      payment_purpose: this.paymentForm.payment_purpose,
      amount: amount,
      emi_id: this.paymentForm.emi_id,
      utr_number: this.paymentForm.utr_number,
      cheque_number: this.paymentForm.cheque_number,
      bank_name: this.paymentForm.bank_name,
      cheque_date: this.paymentForm.cheque_date,
      customer_notes: this.paymentForm.customer_notes,
      proof_document_url: null
    };

    this.api.initiateUnifiedPayment(payload).subscribe({
      next: (res: any) => {
        this.paymentSubmitting = false;
        this.paymentSuccessMsg = res.message || 'Payment submitted successfully! Marked for Accounts verification.';
        setTimeout(() => {
          this.closePaymentModal();
          this.loadAllData();
        }, 2500);
      },
      error: (err: any) => {
        this.paymentSubmitting = false;
        this.paymentErrorMsg = err?.error?.message || 'Failed to submit payment. Please try again.';
      }
    });
  }

  // ── Missing Payment Dispute Reporting ───────────────────────────────
  openMissingPaymentModal(prop?: PropertyDossier) {
    this.missingPaymentForm = {
      booking_id: prop ? prop.booking_id : (this.propertyDossiers[0]?.booking_id || null),
      claimed_amount: '',
      claimed_payment_date: new Date().toISOString().split('T')[0],
      claimed_payment_mode: 'Cash',
      claimed_utr_number: '',
      claimed_cheque_number: '',
      claimed_receipt_no: '',
      claimed_collector_name: '',
      remarks: '',
      proof_file: null
    };
    this.missingPaymentSuccess = '';
    this.missingPaymentError = '';
    this.missingPaymentModalOpen = true;
  }

  closeMissingPaymentModal() {
    this.missingPaymentModalOpen = false;
  }

  submitMissingPaymentReport() {
    this.missingPaymentError = '';
    this.missingPaymentSuccess = '';

    const amount = Number(this.missingPaymentForm.claimed_amount);
    if (!amount || amount <= 0) {
      this.missingPaymentError = 'Please enter a valid claimed payment amount.';
      return;
    }
    if (!this.missingPaymentForm.booking_id) {
      this.missingPaymentError = 'Please select the affected plot booking.';
      return;
    }

    this.missingPaymentSubmitting = true;
    this.api.reportMissingPayment(this.missingPaymentForm).subscribe({
      next: (res: any) => {
        this.missingPaymentSubmitting = false;
        this.missingPaymentSuccess = res.message || 'Missing payment claim recorded. Our Accounts desk will investigate.';
        setTimeout(() => {
          this.closeMissingPaymentModal();
        }, 3000);
      },
      error: (err: any) => {
        this.missingPaymentSubmitting = false;
        this.missingPaymentError = err?.error?.message || 'Failed to submit missing payment report.';
      }
    });
  }

  // ── PDF Download Helpers ────────────────────────────────────────────
  downloadReceipt(receiptId: number | string) {
    window.open(`${this.baseUrl}/api/receipts/${receiptId}/pdf`, '_blank');
  }

  downloadVoucher(emiId: number | string) {
    window.open(`${this.baseUrl}/api/emi/${emiId}/voucher`, '_blank');
  }

  // ── Property Inquiry Modal Handlers ─────────────────────────────────
  openInquiryModal(presetSiteName?: string) {
    this.inquiryModalOpen = true;
    this.inquirySubmitted = false;
    this.inquiryError = '';
    this.initInquiryDefaults();
    if (presetSiteName) {
      const found = this.sites.find(s => s.site_name.toLowerCase() === presetSiteName.toLowerCase());
      if (found) this.inquiryForm.site_id = found.site_id;
    }
  }

  closeInquiryModal() {
    this.inquiryModalOpen = false;
  }

  submitPropertyInquiry() {
    this.inquiryError = '';
    if (!this.inquiryForm.full_name.trim()) {
      this.inquiryError = 'Please enter your full name.';
      return;
    }
    const mobile = this.inquiryForm.mobile_no.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      this.inquiryError = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    this.inquirySubmitting = true;
    const selectedSite = this.sites.find(s => Number(s.site_id) === Number(this.inquiryForm.site_id));

    this.api.submitInquiry({
      full_name: this.inquiryForm.full_name.trim(),
      mobile_no: mobile,
      email: this.inquiryForm.email || null,
      site_id: selectedSite ? selectedSite.site_id : null,
      site_name: selectedSite ? selectedSite.site_name : null,
      inquiry_message: this.inquiryForm.inquiry_message || 'Customer inquiry submitted from Customer Portal',
      inquiry_type: this.inquiryForm.inquiry_type || 'New Plot Purchase',
      source_page: 'Customer Portal Dashboard'
    }).subscribe({
      next: () => {
        this.inquirySubmitting = false;
        this.inquirySubmitted = true;
      },
      error: (err: any) => {
        this.inquirySubmitting = false;
        this.inquiryError = err?.error?.message || 'Failed to submit inquiry. Please try again.';
      }
    });
  }
}
