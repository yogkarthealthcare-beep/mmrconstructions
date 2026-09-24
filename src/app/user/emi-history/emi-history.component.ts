import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RazorpayService } from '../../services/razorpay.service';

declare var Razorpay: any;

@Component({
  selector: 'app-emi-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './emi-history.component.html',
  styleUrls: ['./emi-history.component.css']
})
export class EmiHistoryComponent implements OnInit {
  loading = true;
  emis: any[] = [];
  bookings: any[] = [];
  overallSummary: any = null;
  plots: string[] = [];
  selectedPlot = 'all';
  toast = '';
  toastType = 'success';
  searchTerm = '';
  statusFilter = 'all';
  downloadingPdfId: number | null = null;
  selectedReceipt: any = null;
  walletBalance: number = 0;

  // Pay EMI Modal
  activePayEmi: any = null;
  payTab: 'online' | 'wallet' | 'offline' = 'online';
  isProcessingPayment = false;

  // Proof Form (Offline Tab)
  proofForm: any = {
    payment_mode: 'UPI',
    reference_number: '',
    amount: '',
    proof_file: null as File | null
  };

  constructor(
    private api: ApiService,
    private razorpayService: RazorpayService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
    this.fetchWalletBalance();
  }

  fetchWalletBalance() {
    this.api.getWalletBalance().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.walletBalance = Number(res.data.available_balance || 0);
        }
      },
      error: () => {}
    });
  }

  loadData() {
    this.loading = true;
    this.api.getEmis().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.emis = res.data || [];
          this.bookings = res.bookings || [];
          this.overallSummary = res.summary || null;
          this.extractPlots();
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load EMI schedule data', 'error');
      }
    });
  }

  extractPlots() {
    const set = new Set<string>();
    this.emis.forEach(e => {
      if (e.plot_number) {
        set.add(`Plot ${e.plot_number}${e.site_name ? ' (' + e.site_name + ')' : ''}`);
      }
    });
    this.plots = Array.from(set);
  }

  get totalPlotValue(): number {
    if (this.bookings.length > 0) {
      return this.bookings.reduce((sum, b) => sum + Number(b.total_plot_amount || 0), 0);
    }
    return this.emis[0]?.total_plot_amount || 0;
  }

  get totalDownPayment(): number {
    if (this.bookings.length > 0) {
      return this.bookings.reduce((sum, b) => sum + Number(b.down_payment || 0), 0);
    }
    return this.emis[0]?.down_payment || 0;
  }

  get paidCount(): number {
    return this.emis.filter(e => e.emi_status === 'Paid').length;
  }

  get pendingCount(): number {
    return this.emis.filter(e => e.emi_status === 'Pending' || e.emi_status === 'ProofSubmitted' || e.emi_status === 'Overdue').length;
  }

  get totalPaidEmis(): number {
    return this.emis.filter(e => e.emi_status === 'Paid').reduce((s, e) => s + Number(e.paid_amount || e.emi_amount || 0), 0);
  }

  get totalPaid(): number {
    return this.totalDownPayment + this.totalPaidEmis;
  }

  get totalRemaining(): number {
    return Math.max(0, this.totalPlotValue - this.totalPaid);
  }

  get nextDue(): any {
    return this.emis.find(e => e.emi_status === 'Pending' || e.emi_status === 'Overdue');
  }

  get overdueCount(): number {
    return this.emis.filter(e => e.emi_status === 'Overdue' || (e.overdue_days > 0 && e.emi_status !== 'Paid')).length;
  }

  get filteredEmis(): any[] {
    return this.emis.filter(e => {
      const q = this.searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (e.plot_number || '').toLowerCase().includes(q) ||
        (e.site_name || '').toLowerCase().includes(q) ||
        (e.installment_no || '').toString().includes(q) ||
        (e.invoice_number || '').toLowerCase().includes(q) ||
        (e.transaction_reference || '').toLowerCase().includes(q);

      const matchPlot = this.selectedPlot === 'all' ||
        `Plot ${e.plot_number}${e.site_name ? ' (' + e.site_name + ')' : ''}` === this.selectedPlot;

      const matchStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'paid' && e.emi_status === 'Paid') ||
        (this.statusFilter === 'pending' && (e.emi_status === 'Pending' || e.emi_status === 'ProofSubmitted')) ||
        (this.statusFilter === 'overdue' && (e.emi_status === 'Overdue' || (e.overdue_days > 0 && e.emi_status !== 'Paid')));

      return matchSearch && matchPlot && matchStatus;
    });
  }

  // ── Open Payment Modal ─────────────────────────────────
  openPayModal(emi: any, tab: 'online' | 'wallet' | 'offline' = 'online') {
    this.activePayEmi = emi;
    this.payTab = tab;
    this.proofForm = {
      payment_mode: 'UPI',
      reference_number: '',
      amount: emi.emi_amount || '',
      proof_file: null
    };
    this.fetchWalletBalance();
  }

  closePayModal() {
    this.activePayEmi = null;
    this.isProcessingPayment = false;
  }

  // ── Pay EMI with Razorpay / Online Gateway ──────────────
  payWithRazorpay() {
    if (!this.activePayEmi || this.isProcessingPayment) return;
    this.isProcessingPayment = true;

    this.api.payEmiOnline(this.activePayEmi.emi_id, {
      payment_mode: 'Online',
      gateway_name: 'razorpay'
    }).subscribe({
      next: (res: any) => {
        if (!res.success) {
          this.isProcessingPayment = false;
          this.showToast(res.message || 'Payment initiation failed', 'error');
          return;
        }

        const checkout = res.data.checkout_details;
        this.razorpayService.loadScript().subscribe({
          next: () => {
            const options: any = {
              key: checkout.key_id,
              amount: checkout.amount,
              currency: checkout.currency || 'INR',
              name: checkout.name || 'MMR Construction & Developers',
              description: checkout.description || `EMI #${this.activePayEmi.installment_no} Payment`,
              image: checkout.image || '/assets/images/logo.png',
              order_id: checkout.order_id,
              prefill: checkout.prefill || {},
              notes: checkout.notes || {},
              theme: { color: '#1a5c3a' },
              handler: (response: any) => {
                this.verifyOnlinePayment({
                  order_id: res.data.order_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  gateway_name: 'razorpay'
                });
              },
              modal: {
                ondismiss: () => {
                  this.isProcessingPayment = false;
                  this.showToast('Payment window was closed.', 'error');
                }
              }
            };

            try {
              const rzp = new Razorpay(options);
              rzp.open();
            } catch (err: any) {
              this.isProcessingPayment = false;
              this.showToast('Could not open payment checkout: ' + err.message, 'error');
            }
          },
          error: (scriptErr: any) => {
            this.isProcessingPayment = false;
            this.showToast('Failed to load payment gateway SDK: ' + scriptErr.message, 'error');
          }
        });
      },
      error: (err: any) => {
        this.isProcessingPayment = false;
        this.showToast(err?.error?.message || 'Payment initiation failed', 'error');
      }
    });
  }

  // ── Verify Online Gateway Payment ─────────────────────
  verifyOnlinePayment(payload: any) {
    if (!this.activePayEmi) return;
    this.api.verifyEmiPayment(this.activePayEmi.emi_id, payload).subscribe({
      next: (res: any) => {
        this.isProcessingPayment = false;
        this.showToast(res.message || 'EMI payment verified and paid successfully!', 'success');
        this.closePayModal();
        this.loadData();
      },
      error: (err: any) => {
        this.isProcessingPayment = false;
        this.showToast(err?.error?.message || 'Payment verification failed.', 'error');
      }
    });
  }

  // ── Pay EMI with MMR Wallet Balance ───────────────────
  payWithWallet() {
    if (!this.activePayEmi || this.isProcessingPayment) return;
    const payable = Number(this.activePayEmi.total_due || this.activePayEmi.emi_amount || 0);

    if (this.walletBalance < payable) {
      this.showToast(`Insufficient wallet balance. You have ₹${this.walletBalance.toLocaleString('en-IN')}, required is ₹${payable.toLocaleString('en-IN')}`, 'error');
      return;
    }

    this.isProcessingPayment = true;
    this.api.payEmiOnline(this.activePayEmi.emi_id, {
      payment_mode: 'Wallet'
    }).subscribe({
      next: (res: any) => {
        this.isProcessingPayment = false;
        this.showToast(res.message || `EMI #${this.activePayEmi.installment_no} paid successfully using MMR Wallet!`, 'success');
        this.closePayModal();
        this.loadData();
        this.fetchWalletBalance();
      },
      error: (err: any) => {
        this.isProcessingPayment = false;
        this.showToast(err?.error?.message || 'Wallet payment failed', 'error');
      }
    });
  }

  // ── Submit Offline Payment Proof ──────────────────────
  onFileChange(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.proofForm.proof_file = file;
    }
  }

  submitProof() {
    if (!this.activePayEmi || this.isProcessingPayment) return;
    if (!this.proofForm.proof_file) {
      this.showToast('Please attach a payment receipt or bank transfer screenshot.', 'error');
      return;
    }

    this.isProcessingPayment = true;
    const form = new FormData();
    form.append('payment_proof', this.proofForm.proof_file);
    form.append('payment_mode', this.proofForm.payment_mode || 'UPI');
    form.append('reference_no', this.proofForm.reference_number || '');
    if (this.proofForm.amount) {
      form.append('amount', this.proofForm.amount.toString());
    }

    this.api.uploadEmiProof(this.activePayEmi.emi_id, form).subscribe({
      next: (res: any) => {
        this.isProcessingPayment = false;
        this.showToast(res.message || 'Payment proof submitted successfully! Under Verification by MMR Accounts.', 'success');
        this.activePayEmi.emi_status = 'ProofSubmitted';
        this.closePayModal();
        this.loadData();
      },
      error: (e: any) => {
        this.isProcessingPayment = false;
        this.showToast(e?.error?.message || 'Upload failed. Please try again.', 'error');
      }
    });
  }

  // ── Invoice Actions ───────────────────────────────────
  viewInvoice(emi: any) {
    const invId = emi.invoice_number || emi.invoice_id || emi.booking_id;
    if (invId) {
      this.router.navigate(['/invoice', invId]);
    } else {
      this.viewReceiptModal(emi);
    }
  }

  downloadOfficialPdf(emi: any) {
    this.downloadingPdfId = emi.emi_id;
    const invNum = emi.invoice_number;

    if (invNum) {
      this.api.getBlob(`/api/invoice/${invNum}/pdf`).subscribe({
        next: (blob: Blob) => {
          this.downloadingPdfId = null;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice_${invNum}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.showToast('Official Invoice PDF downloaded successfully!', 'success');
        },
        error: () => {
          this.fallbackReceiptPdfDownload(emi);
        }
      });
    } else {
      this.fallbackReceiptPdfDownload(emi);
    }
  }

  private fallbackReceiptPdfDownload(emi: any) {
    this.api.downloadReceiptPdf(emi.emi_id).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdfId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR_Receipt_Plot_${emi.plot_number}_Inst_${emi.installment_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('Official PDF Receipt downloaded successfully!', 'success');
      },
      error: () => {
        this.downloadingPdfId = null;
        this.selectedReceipt = emi;
      }
    });
  }

  viewReceiptModal(emi: any) {
    this.selectedReceipt = emi;
  }

  printReceipt() {
    window.print();
  }

  showToast(msg: string, type = 'success') {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4500);
  }
}
