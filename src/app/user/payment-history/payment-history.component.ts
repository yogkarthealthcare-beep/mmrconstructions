import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

export interface UnifiedPaymentItem {
  id: string | number;
  raw_id?: any;
  category: 'wallet' | 'commission' | 'team_plot' | 'personal_plot';
  categoryLabel: string;
  categoryBadgeClass: string;
  payment_type: string;
  installment_no?: string | number;
  booking_id?: number | string;
  booking_serial?: string;
  customer_name?: string;
  customer_member_id?: string;
  plot_number?: string;
  site_name?: string;
  amount: number;
  paid_amount: number;
  paid_date: string | null;
  payment_mode: string;
  transaction_reference: string;
  status: string; // 'Approved' | 'Success' | 'Pending' | 'Failed' | 'Processing'
  invoice_number?: string;
  invoice_id?: number;
  receipt_no?: string;
  isCredit?: boolean;
  remarks?: string;
  raw_data?: any;
}

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  loading = true;
  isAssociateUser = false;
  activeCategory: 'all' | 'wallet' | 'commission' | 'team_plot' | 'personal_plot' = 'all';

  payments: UnifiedPaymentItem[] = [];
  plots: string[] = [];
  selectedPlot = 'all';
  paymentModeFilter = 'all';
  statusFilter = 'all';
  searchTerm = '';

  selectedReceipt: UnifiedPaymentItem | null = null;
  downloadingPdfId: string | number | null = null;
  toast = '';
  toastType = 'success';

  // Stats
  totalCreditAmount = 0;
  totalDebitAmount = 0;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    const type = String(user?.user_type || user?.role || '').toLowerCase();
    this.isAssociateUser = this.auth.isAssociate() || type.includes('associate') || this.router.url.startsWith('/associate');
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const isAssoc = this.isAssociateUser || this.router.url.startsWith('/associate');

    if (isAssoc) {
      Promise.all([
        this.api.getEmis().toPromise().catch(() => null),
        this.api.getWalletTransactions({ _t: Date.now() }).toPromise().catch(() => null),
        this.api.getAssocCommissions({ limit: 100 }).toPromise().catch(() => null),
        this.api.getAssociateTeamMembers().toPromise().catch(() => null)
      ]).then(([emisRes, walletRes, commRes, teamRes]) => {
        const unifiedList: UnifiedPaymentItem[] = [];

        // 1. Personal EMIs & Down Payments
        if (emisRes && emisRes.success) {
          const rawPayments = emisRes.payments || [];
          if (rawPayments.length > 0) {
            rawPayments.forEach((p: any) => {
              unifiedList.push({
                id: p.id || `emi-${p.emi_id || Math.random()}`,
                raw_id: p.id || p.emi_id,
                category: 'personal_plot',
                categoryLabel: p.installment_no === 'DP' ? 'Personal Plot (DP)' : 'Personal Plot (EMI)',
                categoryBadgeClass: p.installment_no === 'DP' ? 'badge-purple' : 'badge-emerald',
                payment_type: p.payment_type || (p.installment_no === 'DP' ? 'Booking Advance / Down Payment' : `EMI Installment #${p.installment_no}`),
                installment_no: p.installment_no,
                booking_id: p.booking_id,
                booking_serial: p.booking_serial,
                plot_number: p.plot_number,
                site_name: p.site_name,
                amount: Number(p.amount || p.paid_amount || 0),
                paid_amount: Number(p.paid_amount || p.amount || 0),
                paid_date: p.paid_date,
                payment_mode: p.payment_mode || 'Online / Bank',
                transaction_reference: p.transaction_reference || p.invoice_number || `BK-${p.booking_id}`,
                status: p.status || 'Approved',
                invoice_number: p.invoice_number,
                invoice_id: p.invoice_id,
                receipt_no: p.receipt_no,
                isCredit: true,
                raw_data: p
              });
            });
          } else {
            // Fallback from bookings & data
            (emisRes.bookings || []).forEach((bk: any) => {
              if (Number(bk.down_payment || 0) > 0) {
                unifiedList.push({
                  id: `dp-${bk.booking_id}`,
                  raw_id: bk.booking_id,
                  category: 'personal_plot',
                  categoryLabel: 'Personal Plot (DP)',
                  categoryBadgeClass: 'badge-purple',
                  payment_type: 'Booking Advance / Down Payment',
                  installment_no: 'DP',
                  booking_id: bk.booking_id,
                  booking_serial: bk.booking_serial,
                  plot_number: bk.plot_number,
                  site_name: bk.site_name,
                  amount: Number(bk.down_payment),
                  paid_amount: Number(bk.down_payment),
                  paid_date: bk.created_at ? bk.created_at.split('T')[0] : null,
                  payment_mode: bk.payment_type || 'Cash / Bank',
                  transaction_reference: bk.booking_serial || `BK-${bk.booking_id}`,
                  status: 'Approved',
                  invoice_number: bk.invoice_number || `MMR-INV-${bk.booking_id}`,
                  invoice_id: bk.invoice_id,
                  receipt_no: `MMR/REC/${bk.booking_id}`,
                  isCredit: true,
                  raw_data: bk
                });
              }
            });

            (emisRes.data || []).filter((e: any) => e.emi_status === 'Paid').forEach((e: any) => {
              unifiedList.push({
                id: `emi-${e.emi_id}`,
                raw_id: e.emi_id,
                category: 'personal_plot',
                categoryLabel: 'Personal Plot (EMI)',
                categoryBadgeClass: 'badge-emerald',
                payment_type: `EMI Installment #${e.installment_no}`,
                installment_no: e.installment_no,
                booking_id: e.booking_id,
                booking_serial: e.booking_serial,
                plot_number: e.plot_number,
                site_name: e.site_name,
                amount: Number(e.paid_amount || e.emi_amount || 0),
                paid_amount: Number(e.paid_amount || e.emi_amount || 0),
                paid_date: e.paid_date,
                payment_mode: e.payment_mode || 'Online',
                transaction_reference: e.transaction_reference || e.invoice_number || '',
                status: 'Approved',
                invoice_number: e.invoice_number,
                invoice_id: e.invoice_id,
                receipt_no: e.receipt_no,
                isCredit: true,
                raw_data: e
              });
            });
          }
        }

        // 2. Wallet Transactions (Funds Added, Debits, Withdrawals, Payouts)
        const walletList = (walletRes && walletRes.success && Array.isArray(walletRes.data))
          ? walletRes.data
          : (Array.isArray(walletRes) ? walletRes : []);

        walletList.forEach((tx: any) => {
          const isCr = this.isTxCredit(tx);
          const amt = Math.abs(Number(tx.amount || 0));
          const txStatus = String(tx.status || 'success').toLowerCase();
          const normalizedStatus = (txStatus === 'success' || txStatus === 'approved')
            ? 'Approved'
            : (txStatus === 'pending' ? 'Pending' : (txStatus === 'failed' ? 'Failed' : 'Success'));

          unifiedList.push({
            id: `wal-${tx.id || tx.payment_order_id}`,
            raw_id: tx.id || tx.payment_order_id,
            category: 'wallet',
            categoryLabel: isCr ? 'Wallet Credit' : 'Wallet Debit',
            categoryBadgeClass: isCr ? 'badge-emerald' : 'badge-danger',
            payment_type: (tx.source || 'Wallet Activity') + (tx.remarks ? ` — ${tx.remarks}` : ''),
            installment_no: isCr ? 'CR' : 'DR',
            amount: amt,
            paid_amount: amt,
            paid_date: tx.created_at ? tx.created_at.split('T')[0] : null,
            payment_mode: tx.payment_gateway || (isCr ? 'Online Deposit' : 'Wallet Payout'),
            transaction_reference: tx.payment_order_id || tx.reference_no || `WAL-${tx.id}`,
            status: normalizedStatus,
            remarks: tx.remarks || '',
            isCredit: isCr,
            raw_data: tx
          });
        });

        // 3. Associate Commissions
        const commList = (commRes && commRes.success && commRes.data?.commissions)
          ? commRes.data.commissions
          : ((commRes && Array.isArray(commRes.data)) ? commRes.data : []);

        commList.forEach((c: any) => {
          const netAmt = Number(c.net_amount || c.gross_amount || 0);
          const cStatus = String(c.commission_status || 'Approved');
          unifiedList.push({
            id: `comm-${c.commission_id}`,
            raw_id: c.commission_id,
            category: 'commission',
            categoryLabel: 'Commission Payout',
            categoryBadgeClass: 'badge-gold',
            payment_type: `${c.commission_type || 'Sales Commission'}${c.gaj_sold ? ` (${c.gaj_sold} Gaj)` : ''}`,
            installment_no: 'COMM',
            booking_serial: c.booking_serial,
            plot_number: c.plot_number,
            site_name: c.site_name,
            amount: Number(c.gross_amount || netAmt),
            paid_amount: netAmt,
            paid_date: (c.paid_at || c.created_at) ? (c.paid_at || c.created_at).split('T')[0] : null,
            payment_mode: 'Commission Wallet / Bank',
            transaction_reference: c.payment_reference || `COMM-${c.commission_id}`,
            status: cStatus === 'Paid' ? 'Approved' : cStatus,
            remarks: `Gross: ₹${c.gross_amount || netAmt} | TDS/Ded: ₹${c.deduction_amount || 0}`,
            isCredit: true,
            raw_data: c
          });
        });

        // 4. Team Member / Customer Plot Payments
        const teamMembers = (teamRes && teamRes.success && Array.isArray(teamRes.data))
          ? teamRes.data
          : (Array.isArray(teamRes) ? teamRes : []);

        teamMembers.forEach((m: any) => {
          const paidAmt = Number(m.total_paid_amount || m.advance_amount || 0);
          if (paidAmt > 0 && m.booking_id) {
            unifiedList.push({
              id: `team-bk-${m.booking_id}`,
              raw_id: m.booking_id,
              category: 'team_plot',
              categoryLabel: 'Team Customer Sale',
              categoryBadgeClass: 'badge-blue',
              customer_name: m.full_name,
              customer_member_id: m.member_id,
              plot_number: m.plot_number,
              site_name: m.site_name,
              booking_id: m.booking_id,
              booking_serial: m.booking_serial,
              payment_type: `Plot Booking Payment (${m.full_name || 'Customer'})`,
              installment_no: 'CUST',
              amount: Number(m.total_plot_amount || m.base_price || paidAmt),
              paid_amount: paidAmt,
              paid_date: (m.booking_date || m.created_at || m.registered_at) ? (m.booking_date || m.created_at || m.registered_at).split('T')[0] : null,
              payment_mode: m.payment_type || 'Bank Transfer / Cash',
              transaction_reference: m.booking_serial || `BK-${m.booking_id}`,
              status: m.booking_status || 'Approved',
              invoice_number: m.invoice_count > 0 ? `MMR-INV-${m.booking_id}` : '',
              isCredit: true,
              raw_data: m
            });
          }
        });

        // Sort descending by date
        unifiedList.sort((a, b) => {
          const dateA = a.paid_date ? new Date(a.paid_date).getTime() : 0;
          const dateB = b.paid_date ? new Date(b.paid_date).getTime() : 0;
          return dateB - dateA;
        });

        this.payments = unifiedList;
        this.extractPlots();
        this.loading = false;
      }).catch(err => {
        console.error('Failed to load associate payments:', err);
        this.loading = false;
        this.showToast('Could not load all payment records. Showing available records.', 'error');
      });

    } else {
      // Regular Customer Flow
      Promise.all([
        this.api.getEmis().toPromise().catch(() => null),
        this.api.getWalletTransactions({ _t: Date.now() }).toPromise().catch(() => null)
      ]).then(([res, walletRes]) => {
        const unifiedList: UnifiedPaymentItem[] = [];

        if (res && res.success) {
          if (res.payments && res.payments.length > 0) {
            res.payments.forEach((p: any) => {
              unifiedList.push({
                id: p.id || `emi-${p.emi_id || Math.random()}`,
                raw_id: p.id || p.emi_id,
                category: 'personal_plot',
                categoryLabel: p.installment_no === 'DP' ? 'Down Payment' : 'EMI Installment',
                categoryBadgeClass: p.installment_no === 'DP' ? 'badge-purple' : 'badge-emerald',
                payment_type: p.payment_type || (p.installment_no === 'DP' ? 'Booking Advance / Down Payment' : `EMI Installment #${p.installment_no}`),
                installment_no: p.installment_no,
                booking_id: p.booking_id,
                booking_serial: p.booking_serial,
                plot_number: p.plot_number,
                site_name: p.site_name,
                amount: Number(p.paid_amount || p.amount || 0),
                paid_amount: Number(p.paid_amount || p.amount || 0),
                paid_date: p.paid_date,
                payment_mode: p.payment_mode || 'Cash / Bank',
                transaction_reference: p.transaction_reference || p.booking_serial || `BK-${p.booking_id}`,
                status: p.status || 'Approved',
                invoice_number: p.invoice_number,
                invoice_id: p.invoice_id,
                receipt_no: p.receipt_no,
                isCredit: true,
                raw_data: p
              });
            });
          } else {
            (res.bookings || []).forEach((bk: any) => {
              if (Number(bk.down_payment || 0) > 0) {
                unifiedList.push({
                  id: `dp-${bk.booking_id}`,
                  raw_id: bk.booking_id,
                  category: 'personal_plot',
                  categoryLabel: 'Down Payment',
                  categoryBadgeClass: 'badge-purple',
                  payment_type: 'Booking Advance / Down Payment',
                  installment_no: 'DP',
                  booking_id: bk.booking_id,
                  booking_serial: bk.booking_serial,
                  plot_number: bk.plot_number,
                  site_name: bk.site_name,
                  amount: Number(bk.down_payment),
                  paid_amount: Number(bk.down_payment),
                  paid_date: bk.created_at ? bk.created_at.split('T')[0] : null,
                  payment_mode: bk.payment_type || 'Cash / Bank',
                  transaction_reference: bk.booking_serial || `BK-${bk.booking_id}`,
                  status: 'Approved',
                  invoice_number: `MMR-INV-${bk.booking_id}`,
                  receipt_no: `MMR/REC/${bk.booking_id}`,
                  isCredit: true,
                  raw_data: bk
                });
              }
            });

            (res.data || []).filter((e: any) => e.emi_status === 'Paid').forEach((e: any) => {
              unifiedList.push({
                id: `emi-${e.emi_id}`,
                raw_id: e.emi_id,
                category: 'personal_plot',
                categoryLabel: 'EMI Installment',
                categoryBadgeClass: 'badge-emerald',
                payment_type: `EMI Installment #${e.installment_no}`,
                installment_no: e.installment_no,
                booking_id: e.booking_id,
                booking_serial: e.booking_serial,
                plot_number: e.plot_number,
                site_name: e.site_name,
                amount: Number(e.paid_amount || e.emi_amount || 0),
                paid_amount: Number(e.paid_amount || e.emi_amount || 0),
                paid_date: e.paid_date,
                payment_mode: e.payment_mode || 'Online',
                transaction_reference: e.transaction_reference || e.invoice_number || '',
                status: 'Approved',
                invoice_number: e.invoice_number,
                invoice_id: e.invoice_id,
                receipt_no: e.receipt_no,
                isCredit: true,
                raw_data: e
              });
            });
          }
        }

        // Add wallet transactions for customer if present
        const walletList = (walletRes && walletRes.success && Array.isArray(walletRes.data))
          ? walletRes.data
          : (Array.isArray(walletRes) ? walletRes : []);

        walletList.forEach((tx: any) => {
          const isCr = this.isTxCredit(tx);
          const amt = Math.abs(Number(tx.amount || 0));
          unifiedList.push({
            id: `wal-${tx.id || tx.payment_order_id}`,
            raw_id: tx.id || tx.payment_order_id,
            category: 'wallet',
            categoryLabel: isCr ? 'Wallet Deposit' : 'Wallet Payment',
            categoryBadgeClass: isCr ? 'badge-emerald' : 'badge-danger',
            payment_type: (tx.source || 'Wallet Transaction') + (tx.remarks ? ` — ${tx.remarks}` : ''),
            installment_no: isCr ? 'CR' : 'DR',
            amount: amt,
            paid_amount: amt,
            paid_date: tx.created_at ? tx.created_at.split('T')[0] : null,
            payment_mode: tx.payment_gateway || 'Online Wallet',
            transaction_reference: tx.payment_order_id || `WAL-${tx.id}`,
            status: tx.status === 'success' ? 'Approved' : (tx.status || 'Success'),
            isCredit: isCr,
            raw_data: tx
          });
        });

        unifiedList.sort((a, b) => {
          const dateA = a.paid_date ? new Date(a.paid_date).getTime() : 0;
          const dateB = b.paid_date ? new Date(b.paid_date).getTime() : 0;
          return dateB - dateA;
        });

        this.payments = unifiedList;
        this.extractPlots();
        this.loading = false;
      }).catch(err => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load payment history', 'error');
      });
    }
  }

  isTxCredit(tx: any): boolean {
    const type = String(tx?.transaction_type || tx?.type || '').toLowerCase();
    if (type === 'credit') return true;
    if (type === 'debit') return false;
    const source = String(tx?.source || '').toLowerCase();
    return source.includes('add fund') || source.includes('commission') || source.includes('referral') || source.includes('bonus') || source.includes('deposit');
  }

  extractPlots(): void {
    const set = new Set<string>();
    this.payments.forEach(p => {
      if (p.plot_number) {
        set.add(`Plot ${p.plot_number}${p.site_name ? ' (' + p.site_name + ')' : ''}`);
      }
    });
    this.plots = Array.from(set);
  }

  setCategory(cat: 'all' | 'wallet' | 'commission' | 'team_plot' | 'personal_plot'): void {
    this.activeCategory = cat;
  }

  get totalPaid(): number {
    return this.payments.reduce((s, p) => s + Number(p.paid_amount || p.amount || 0), 0);
  }

  get totalConfirmedCount(): number {
    return this.payments.filter(p => p.status === 'Approved' || p.status === 'Success' || p.status === 'success').length;
  }

  get countAll(): number { return this.payments.length; }
  get countWallet(): number { return this.payments.filter(p => p.category === 'wallet').length; }
  get countCommission(): number { return this.payments.filter(p => p.category === 'commission').length; }
  get countTeamPlot(): number { return this.payments.filter(p => p.category === 'team_plot').length; }
  get countPersonalPlot(): number { return this.payments.filter(p => p.category === 'personal_plot').length; }

  get filteredPayments(): UnifiedPaymentItem[] {
    return this.payments.filter(p => {
      const matchCat = this.activeCategory === 'all' || p.category === this.activeCategory;

      const q = this.searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (p.plot_number || '').toLowerCase().includes(q) ||
        (p.site_name || '').toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q) ||
        (p.payment_type || '').toLowerCase().includes(q) ||
        (p.installment_no || '').toString().toLowerCase().includes(q) ||
        (p.invoice_number || '').toLowerCase().includes(q) ||
        (p.transaction_reference || '').toLowerCase().includes(q);

      const matchPlot = this.selectedPlot === 'all' ||
        `Plot ${p.plot_number}${p.site_name ? ' (' + p.site_name + ')' : ''}` === this.selectedPlot;

      const matchMode = this.paymentModeFilter === 'all' ||
        (p.payment_mode || '').toLowerCase().includes(this.paymentModeFilter.toLowerCase());

      const matchStatus = this.statusFilter === 'all' ||
        (p.status || '').toLowerCase() === this.statusFilter.toLowerCase();

      return matchCat && matchSearch && matchPlot && matchMode && matchStatus;
    });
  }

  viewInvoice(payment: UnifiedPaymentItem): void {
    const invId = payment.invoice_number || payment.invoice_id || payment.booking_id;
    if (invId && (payment.category === 'personal_plot' || payment.category === 'team_plot')) {
      this.router.navigate(['/invoice', invId]);
    } else {
      this.viewReceipt(payment);
    }
  }

  downloadOfficialPdf(payment: UnifiedPaymentItem): void {
    this.downloadingPdfId = payment.id;
    const invNum = payment.invoice_number;

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
          this.showToast('Official PDF Invoice downloaded successfully!', 'success');
        },
        error: () => {
          this.fallbackReceiptPdfDownload(payment);
        }
      });
    } else {
      this.fallbackReceiptPdfDownload(payment);
    }
  }

  private fallbackReceiptPdfDownload(payment: UnifiedPaymentItem): void {
    const id = payment.raw_id || payment.booking_id || payment.id;
    this.api.downloadReceiptPdf(id).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdfId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR_Receipt_${payment.plot_number || payment.transaction_reference}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('Official PDF Receipt downloaded successfully!', 'success');
      },
      error: () => {
        this.downloadingPdfId = null;
        this.selectedReceipt = payment;
      }
    });
  }

  viewReceipt(payment: UnifiedPaymentItem): void {
    this.selectedReceipt = payment;
  }

  printReceipt(): void {
    window.print();
  }

  showToast(msg: string, type = 'success'): void {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }
}
