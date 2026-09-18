import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-my-plots',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './my-plots.component.html',
  styleUrls: ['./my-plots.component.css']
})
export class MyPlotsComponent implements OnInit {
  loading = true;
  bookings: any[] = [];
  emis: any[] = [];
  buybackApplications: any[] = [];
  buybackModal: any = null;
  toast = '';
  toastType = 'success';
  searchTerm = '';
  statusFilter = 'all';
  paymentFilter = 'all';
  sortBy = 'newest';

  // Inquiry Modal
  showInquiryModal = false;
  inquirySubmitting = false;
  inquiryForm: any = {
    project_name: '',
    customer_name: '',
    phone: '',
    email: '',
    preferred_plot_size: '',
    preferred_location: '',
    budget_range: '',
    message: ''
  };

  // Payment Proof Modal
  paymentModalBooking: any = null;
  paymentProofSubmitting = false;
  paymentProofData: any = {
    payment_mode: 'UPI',
    reference_number: '',
    amount: '',
    proof_file: null as File | null
  };

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    this.loading = true;
    this.api.getBookings().subscribe({
      next: (bRes: any) => {
        const rawBookings = bRes.success ? (bRes.data || []) : [];
        
        this.api.getEmis().subscribe({
          next: (eRes: any) => {
            this.emis = eRes.success ? (eRes.data || []) : [];
            
            this.api.getBuybackStatus().subscribe({
              next: (bbRes: any) => {
                this.buybackApplications = bbRes.success ? (bbRes.data || []) : [];
                this.processBookings(rawBookings);
                this.loading = false;
              },
              error: () => {
                this.processBookings(rawBookings);
                this.loading = false;
              }
            });
          },
          error: () => {
            this.processBookings(rawBookings);
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  processBookings(rawBookings: any[]) {
    this.bookings = rawBookings.map((b: any) => {
      const totalPrice = Number(b.total_amount || b.base_price || b.total_price || 0);
      const advancePaid = Number(b.advance_amount || b.paid_amount || b.total_paid || 0);
      
      const plotEmis = this.emis.filter((e: any) => 
        e.booking_id === b.booking_id || 
        (e.plot_number === b.plot_number && e.site_name === b.site_name)
      );
      
      const confirmedPaidEmis = plotEmis.filter((e: any) => e.emi_status === 'Paid');
      const emiPaidSum = confirmedPaidEmis.reduce((s: number, e: any) => s + Number(e.paid_amount || e.emi_amount || 0), 0);
      
      const confirmedPaid = Math.max(advancePaid + emiPaidSum, Number(b.total_paid || 0), advancePaid);
      const unpaidAmount = Math.max(0, totalPrice - confirmedPaid);
      const progressPercent = totalPrice > 0 ? Math.min(100, Math.round((confirmedPaid / totalPrice) * 100)) : (confirmedPaid > 0 ? 100 : 0);
      
      const pendingEmis = plotEmis.filter((e: any) => e.emi_status === 'Pending' || e.emi_status === 'Overdue' || e.emi_status === 'ProofSubmitted');
      const nextEmi = pendingEmis.length > 0 ? pendingEmis[0] : null;
      
      const isBuybackApproved = this.buybackApplications.some((a: any) => a.booking_id === b.booking_id && (a.buyback_status === 'Approved' || a.buyback_status === 'Completed'));
      const isBuybackPending = this.buybackApplications.some((a: any) => a.booking_id === b.booking_id && a.buyback_status === 'Pending');

      let computedStatus = b.booking_status || 'Allocated';
      if (isBuybackApproved || b.booking_status === 'Sold') {
        computedStatus = 'Sold';
      } else if (isBuybackPending) {
        computedStatus = 'Buyback In Review';
      }

      let financialStatus = 'Partial Paid';
      if (unpaidAmount === 0 && totalPrice > 0) {
        financialStatus = 'Fully Paid';
      } else if (confirmedPaid === 0) {
        financialStatus = 'Unpaid';
      } else if (nextEmi && nextEmi.overdue_days > 0) {
        financialStatus = 'Overdue';
      }

      return {
        ...b,
        plot_number: b.plot_number || 'Plot',
        site_name: b.site_name || 'MMR Green Valley',
        location: b.location || b.city || 'Lucknow / Unnao Highway, UP',
        totalPrice,
        advancePaid,
        confirmedPaid,
        unpaidAmount,
        progressPercent,
        plotEmis,
        totalInstallments: plotEmis.length,
        paidInstallmentsCount: confirmedPaidEmis.length,
        nextEmi,
        computedStatus,
        financialStatus,
        isBuybackApproved,
        isBuybackPending
      };
    });
  }

  get basePrefix(): string {
    if (this.router.url.startsWith('/associate')) return '/associate';
    if (this.router.url.startsWith('/customer')) return '/customer';
    return '/user';
  }

  get totalPurchasedCount(): number {
    return this.bookings.filter(b => b.computedStatus !== 'Sold').length;
  }

  get totalSoldCount(): number {
    return this.bookings.filter(b => b.computedStatus === 'Sold').length;
  }

  get totalAreaGaj(): number {
    return this.bookings.reduce((sum, b) => sum + Number(b.plot_area || 0), 0);
  }

  get totalPaidSum(): number {
    return this.bookings.reduce((sum, b) => sum + Number(b.confirmedPaid || 0), 0);
  }

  get totalUnpaidSum(): number {
    return this.bookings.reduce((sum, b) => sum + Number(b.unpaidAmount || 0), 0);
  }

  get filteredBookings(): any[] {
    let result = this.bookings.filter(b => {
      const q = this.searchTerm.trim().toLowerCase();
      const matchSearch = !q ||
        (b.plot_number || '').toLowerCase().includes(q) ||
        (b.site_name || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q) ||
        (b.city || '').toLowerCase().includes(q) ||
        (b.booking_serial || '').toLowerCase().includes(q) ||
        (b.booking_id || '').toString().includes(q);

      const matchStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && (b.computedStatus === 'Confirmed' || b.computedStatus === 'Active' || b.computedStatus === 'Allocated')) ||
        (this.statusFilter === 'pending' && (b.computedStatus === 'PaymentPending' || b.computedStatus === 'InProcess' || b.computedStatus === 'Pending')) ||
        (this.statusFilter === 'sold' && b.computedStatus === 'Sold') ||
        (this.statusFilter === 'buyback' && b.isBuybackPending);

      const matchPayment = this.paymentFilter === 'all' ||
        (this.paymentFilter === 'fully_paid' && b.financialStatus === 'Fully Paid') ||
        (this.paymentFilter === 'partial' && b.financialStatus === 'Partial Paid') ||
        (this.paymentFilter === 'unpaid' && b.financialStatus === 'Unpaid') ||
        (this.paymentFilter === 'overdue' && b.financialStatus === 'Overdue');

      return matchSearch && matchStatus && matchPayment;
    });

    if (this.sortBy === 'newest') {
      result = result.sort((a, b) => new Date(b.booking_date || b.created_at || 0).getTime() - new Date(a.booking_date || a.created_at || 0).getTime());
    } else if (this.sortBy === 'oldest') {
      result = result.sort((a, b) => new Date(a.booking_date || a.created_at || 0).getTime() - new Date(b.booking_date || b.created_at || 0).getTime());
    } else if (this.sortBy === 'price_desc') {
      result = result.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
    } else if (this.sortBy === 'price_asc') {
      result = result.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
    }

    return result;
  }

  // Inquiry Modal Controls
  openInquiryModal(defaultSite?: string) {
    this.inquiryForm = {
      project_name: defaultSite || '',
      customer_name: '',
      phone: '',
      email: '',
      preferred_plot_size: '100 Gaj',
      preferred_location: '',
      budget_range: '',
      message: ''
    };
    this.showInquiryModal = true;
  }

  submitInquiry() {
    if (!this.inquiryForm.customer_name || !this.inquiryForm.phone) {
      this.showToast('Please provide your name and contact phone number.', 'error');
      return;
    }

    this.inquirySubmitting = true;
    const payload = {
      ...this.inquiryForm,
      source_page: 'Customer Portal - My Plots'
    };

    this.api.submitInquiry(payload).subscribe({
      next: (res: any) => {
        this.inquirySubmitting = false;
        this.showInquiryModal = false;
        this.showToast(res.message || 'Property inquiry submitted successfully! Our sales team will connect shortly.', 'success');
      },
      error: (e: any) => {
        this.inquirySubmitting = false;
        this.showToast(e?.error?.message || 'Failed to submit inquiry. Please try again.', 'error');
      }
    });
  }

  // Payment Proof Modal Controls
  openPaymentModal(booking: any) {
    this.paymentModalBooking = booking;
    const defaultAmount = booking.nextEmi ? booking.nextEmi.emi_amount : (booking.unpaidAmount > 0 ? booking.unpaidAmount : '');
    this.paymentProofData = {
      payment_mode: 'UPI',
      reference_number: '',
      amount: defaultAmount,
      proof_file: null
    };
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.paymentProofData.proof_file = file;
    }
  }

  submitPaymentProof() {
    if (!this.paymentModalBooking) return;
    if (!this.paymentProofData.amount || Number(this.paymentProofData.amount) <= 0) {
      this.showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    if (!this.paymentProofData.proof_file) {
      this.showToast('Please attach your payment receipt or screenshot.', 'error');
      return;
    }

    this.paymentProofSubmitting = true;
    const form = new FormData();
    form.append('payment_proof', this.paymentProofData.proof_file);
    form.append('payment_mode', this.paymentProofData.payment_mode || 'UPI');
    form.append('transaction_reference', this.paymentProofData.reference_number || '');
    form.append('amount', this.paymentProofData.amount.toString());

    const targetEmiId = this.paymentModalBooking.nextEmi ? this.paymentModalBooking.nextEmi.emi_id : this.paymentModalBooking.booking_id;

    this.api.uploadEmiProof(targetEmiId, form).subscribe({
      next: (res: any) => {
        this.paymentProofSubmitting = false;
        this.paymentModalBooking = null;
        this.showToast(res.message || 'Payment proof submitted successfully! Status marked as Under Verification.', 'success');
        this.loadAllData();
      },
      error: (e: any) => {
        this.paymentProofSubmitting = false;
        this.showToast(e?.error?.message || 'Failed to upload payment proof. Please try again.', 'error');
      }
    });
  }

  // Buyback Controls
  applyBuyback(b: any) {
    this.api.applyBuyback(b.booking_id).subscribe({
      next: (res: any) => {
        this.showToast(res.message || 'Buyback application submitted successfully!', 'success');
        this.buybackModal = null;
        this.loadAllData();
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to submit buyback application', 'error');
      }
    });
  }

  showToast(msg: string, type = 'success') {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }
}
