import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  loading = true;
  payments: any[] = [];
  plots: string[] = [];
  selectedPlot = 'all';
  paymentModeFilter = 'all';
  searchTerm = '';
  selectedReceipt: any = null;
  downloadingPdfId: string | number | null = null;
  toast = '';
  toastType = 'success';

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.api.getEmis().subscribe({
      next: (res: any) => {
        if (res.success) {
          if (res.payments && res.payments.length > 0) {
            this.payments = res.payments;
          } else {
            // Fallback: construct payments from bookings (down payments) and emis (paid)
            const list: any[] = [];
            (res.bookings || []).forEach((bk: any) => {
              if (Number(bk.down_payment || 0) > 0) {
                list.push({
                  id: `dp-${bk.booking_id}`,
                  payment_type: 'Booking Advance / Down Payment',
                  installment_no: 'DP',
                  booking_id: bk.booking_id,
                  booking_serial: bk.booking_serial,
                  plot_number: bk.plot_number,
                  site_name: bk.site_name,
                  paid_amount: Number(bk.down_payment),
                  paid_date: bk.created_at || new Date().toISOString().split('T')[0],
                  payment_mode: bk.payment_method || 'Cash / Bank',
                  transaction_reference: bk.booking_serial || `BK-${bk.booking_id}`,
                  status: 'Approved',
                  invoice_number: `MMR-INV-${bk.booking_id}`
                });
              }
            });
            (res.data || []).filter((e: any) => e.emi_status === 'Paid').forEach((e: any) => {
              list.push({
                id: `emi-${e.emi_id}`,
                emi_id: e.emi_id,
                payment_type: `EMI Installment #${e.installment_no}`,
                installment_no: e.installment_no,
                booking_id: e.booking_id,
                booking_serial: e.booking_serial,
                plot_number: e.plot_number,
                site_name: e.site_name,
                paid_amount: Number(e.paid_amount || e.emi_amount),
                paid_date: e.paid_date,
                payment_mode: e.payment_mode || 'Online',
                transaction_reference: e.transaction_reference || e.invoice_number,
                status: 'Approved',
                invoice_number: e.invoice_number,
                invoice_id: e.invoice_id,
                receipt_no: e.receipt_no
              });
            });
            this.payments = list;
          }
          this.extractPlots();
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load payment history', 'error');
      }
    });
  }

  extractPlots() {
    const set = new Set<string>();
    this.payments.forEach(p => {
      if (p.plot_number) {
        set.add(`Plot ${p.plot_number}${p.site_name ? ' (' + p.site_name + ')' : ''}`);
      }
    });
    this.plots = Array.from(set);
  }

  get totalPaid(): number {
    return this.payments.reduce((s, p) => s + Number(p.paid_amount || p.amount || 0), 0);
  }

  get filteredPayments(): any[] {
    return this.payments.filter(p => {
      const q = this.searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (p.plot_number || '').toLowerCase().includes(q) ||
        (p.site_name || '').toLowerCase().includes(q) ||
        (p.payment_type || '').toLowerCase().includes(q) ||
        (p.installment_no || '').toString().toLowerCase().includes(q) ||
        (p.invoice_number || '').toLowerCase().includes(q) ||
        (p.transaction_reference || '').toLowerCase().includes(q);

      const matchPlot = this.selectedPlot === 'all' ||
        `Plot ${p.plot_number}${p.site_name ? ' (' + p.site_name + ')' : ''}` === this.selectedPlot;

      const matchMode = this.paymentModeFilter === 'all' ||
        (p.payment_mode || '').toLowerCase().includes(this.paymentModeFilter.toLowerCase());

      return matchSearch && matchPlot && matchMode;
    });
  }

  viewInvoice(payment: any) {
    const invId = payment.invoice_number || payment.invoice_id || payment.booking_id;
    if (invId) {
      this.router.navigate(['/invoice', invId]);
    } else {
      this.viewReceipt(payment);
    }
  }

  downloadOfficialPdf(payment: any) {
    this.downloadingPdfId = payment.id || payment.emi_id;
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

  private fallbackReceiptPdfDownload(payment: any) {
    const id = payment.emi_id || payment.booking_id;
    this.api.downloadReceiptPdf(id).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdfId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR_Receipt_Plot_${payment.plot_number}.pdf`;
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

  viewReceipt(payment: any) {
    this.selectedReceipt = payment;
  }

  printReceipt() {
    window.print();
  }

  showToast(msg: string, type = 'success') {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }
}
