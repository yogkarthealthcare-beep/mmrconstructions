import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  loading = true;
  emis: any[] = [];
  plots: string[] = [];
  selectedPlot = 'all';
  paymentModeFilter = 'all';
  searchTerm = '';
  selectedReceipt: any = null;
  downloadingPdfId: number | null = null;
  toast = '';
  toastType = 'success';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.api.getEmis().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.emis = (res.data || []).filter((e: any) => e.emi_status === 'Paid');
          this.extractPlots();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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

  get totalPaid(): number {
    return this.emis.reduce((s, e) => s + Number(e.paid_amount || e.emi_amount || 0), 0);
  }

  get filteredEmis(): any[] {
    return this.emis.filter(e => {
      const q = this.searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (e.plot_number || '').toLowerCase().includes(q) ||
        (e.site_name || '').toLowerCase().includes(q) ||
        (e.installment_no || '').toString().includes(q) ||
        (e.transaction_reference || '').toLowerCase().includes(q);

      const matchPlot = this.selectedPlot === 'all' ||
        `Plot ${e.plot_number}${e.site_name ? ' (' + e.site_name + ')' : ''}` === this.selectedPlot;

      const matchMode = this.paymentModeFilter === 'all' ||
        (e.payment_mode || '').toLowerCase() === this.paymentModeFilter.toLowerCase();

      return matchSearch && matchPlot && matchMode;
    });
  }

  downloadOfficialPdf(receipt: any) {
    this.downloadingPdfId = receipt.emi_id;
    this.api.downloadReceiptPdf(receipt.emi_id).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdfId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR_Official_Receipt_Plot_${receipt.plot_number}_Inst_${receipt.installment_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('Official PDF Receipt downloaded successfully!', 'success');
      },
      error: () => {
        this.downloadingPdfId = null;
        this.selectedReceipt = receipt;
      }
    });
  }

  viewReceipt(receipt: any) {
    this.selectedReceipt = receipt;
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
