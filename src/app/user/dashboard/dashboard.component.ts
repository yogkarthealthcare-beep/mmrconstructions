import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';

export interface PropertyDossier {
  booking_id: number;
  booking_serial: string;
  plot_id: number;
  plot_number: string;
  site_id: number;
  site_name: string;
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
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, VerifiedBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  loading = true;
  profile: any = {};
  userData: any = {};
  bookings: any[] = [];
  emis: any[] = [];
  buybackApplications: any[] = [];
  notifications: any[] = [];
  sites: any[] = [];

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

  // Partial Payment Modal State
  paymentModalOpen = false;
  selectedPropertyForPayment: PropertyDossier | null = null;
  paymentForm = {
    amount: 0,
    payment_mode: 'Bank Transfer' as 'Bank Transfer' | 'Cash' | 'Cheque' | 'TD/DD' | 'Online',
    reference_no: '',
    bank_name: '',
    cheque_no: '',
    remarks: '',
    proof_file: null as File | null
  };
  paymentSubmitting = false;
  paymentSuccessMsg = '';
  paymentErrorMsg = '';

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
      const plotEmis = this.emis.filter(e => String(e.plot_number || '').trim() === plotNo);

      const totalPrice = Number(b.total_amount || 0);
      const advancePaid = (b.booking_status === 'Confirmed' || b.booking_status === 'Active') ? Number(b.advance_amount || 0) : 0;
      const emisPaid = plotEmis
        .filter(e => e.emi_status === 'Paid')
        .reduce((sum, e) => sum + Number(e.paid_amount || e.emi_amount || 0), 0);

      const confirmedPaid = advancePaid + emisPaid;
      const unpaidBalance = Math.max(0, totalPrice - confirmedPaid);
      const paymentProgress = totalPrice > 0 ? Math.min(100, Math.round((confirmedPaid / totalPrice) * 100)) : 0;

      const nextEmi = plotEmis.find(e => e.emi_status === 'Pending' || e.emi_status === 'Overdue' || e.emi_status === 'ProofSubmitted');

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
        all_emis: plotEmis
      };
    });
  }

  // ── Top Summary 4 KPI Boxes ─────────────────────────────────────────
  get purchasedPlotsCount(): number {
    return this.propertyDossiers.length;
  }

  get soldPlotsCount(): number {
    const approvedBuybacks = this.buybackApplications.filter(a => a.status === 'Approved' || a.status === 'Completed').length;
    const soldBookings = this.bookings.filter(b => b.booking_status === 'Sold').length;
    return approvedBuybacks + soldBookings;
  }

  get totalConfirmedPaid(): number {
    return this.propertyDossiers.reduce((sum, p) => sum + p.confirmed_paid, 0);
  }

  get totalUnpaidAmount(): number {
    return this.propertyDossiers.reduce((sum, p) => sum + p.unpaid_balance, 0);
  }

  // ── Filtered Property Dossiers ──────────────────────────────────────
  get filteredProperties(): PropertyDossier[] {
    return this.propertyDossiers.filter(p => {
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

  // ── Upcoming EMIs List across all plots ─────────────────────────────
  get upcomingEmisList(): any[] {
    return this.emis
      .filter(e => e.emi_status === 'Pending' || e.emi_status === 'Overdue' || e.emi_status === 'ProofSubmitted')
      .slice(0, 6);
  }

  // ── Recent Paid / Verified Payments ─────────────────────────────────
  get recentPaymentsList(): any[] {
    return this.emis
      .filter(e => e.emi_status === 'Paid' || e.emi_status === 'ProofSubmitted')
      .slice(0, 5);
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

  // ── Property-Wise Partial Payment Modal Handlers ────────────────────
  openPartialPaymentModal(prop: PropertyDossier) {
    this.selectedPropertyForPayment = prop;
    this.paymentForm = {
      amount: prop.next_emi?.emi_amount ? Number(prop.next_emi.emi_amount) : Math.min(50000, prop.unpaid_balance),
      payment_mode: 'Bank Transfer',
      reference_no: '',
      bank_name: '',
      cheque_no: '',
      remarks: '',
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

  onProofFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.paymentForm.proof_file = file || null;
  }

  submitPartialPayment() {
    if (!this.selectedPropertyForPayment) return;
    this.paymentErrorMsg = '';
    this.paymentSuccessMsg = '';

    if (!this.paymentForm.amount || this.paymentForm.amount <= 0) {
      this.paymentErrorMsg = 'Please enter a valid payment amount.';
      return;
    }

    if (this.paymentForm.payment_mode === 'Cheque' && !this.paymentForm.cheque_no.trim()) {
      this.paymentErrorMsg = 'Cheque number is required for Cheque payments.';
      return;
    }

    if (!this.paymentForm.proof_file && this.paymentForm.payment_mode !== 'Online') {
      this.paymentErrorMsg = 'Please attach deposit slip / transaction screenshot as payment proof.';
      return;
    }

    this.paymentSubmitting = true;
    const formData = new FormData();
    if (this.paymentForm.proof_file) {
      formData.append('payment_proof', this.paymentForm.proof_file);
    }
    formData.append('payment_mode', this.paymentForm.payment_mode);
    formData.append('reference_no', this.paymentForm.reference_no || this.paymentForm.cheque_no || 'OFFLINE');
    formData.append('amount', String(this.paymentForm.amount));
    formData.append('remarks', this.paymentForm.remarks || '');

    // Submit either to next EMI or booking proof endpoint
    const emiToPay = this.selectedPropertyForPayment.next_emi;
    const call$ = emiToPay?.emi_id
      ? this.api.uploadEmiProof(emiToPay.emi_id, formData)
      : this.api.uploadBookingProof(this.selectedPropertyForPayment.booking_id, formData);

    call$.subscribe({
      next: (res: any) => {
        this.paymentSubmitting = false;
        this.paymentSuccessMsg = res.message || 'Payment proof submitted successfully! Marked as Under Verification for Admin approval.';
        setTimeout(() => {
          this.closePaymentModal();
          this.loadAllData();
        }, 3000);
      },
      error: (err: any) => {
        this.paymentSubmitting = false;
        this.paymentErrorMsg = err?.error?.message || 'Failed to submit payment proof. Please try again.';
      }
    });
  }
}
