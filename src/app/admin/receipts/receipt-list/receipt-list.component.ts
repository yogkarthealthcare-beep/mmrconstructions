import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Receipt, ReceiptApiResponse, ReceiptSummary } from '../receipt.types';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './receipt-list.component.html',
  styleUrls: ['./receipt-list.component.css']
})
export class ReceiptListComponent implements OnInit {
  protected readonly Math = Math;
  loading = false;
  receipts: Receipt[] = [];

  // Summary Metrics
  summary: ReceiptSummary = {
    totalReceipts: 0,
    todayReceipts: 0,
    todayCollection: 0,
    totalCollection: 0,
    activeReceipts: 0,
    cancelledReceipts: 0,
  };

  // Tab State
  activeTab = 'all';

  // Collapsible Filters Panel
  filtersOpen = true;

  // Filters Model
  search = '';
  customerName = '';
  invoiceNo = '';
  dateFrom = '';
  dateTo = '';
  minAmount: number | null = null;
  maxAmount: number | null = null;
  paymentType = '';
  paymentMode = '';
  status = '';
  
  // Sorting
  sortField = 'receipt_date';
  sortAsc = false;

  // Pagination
  page = 1;
  limit = 25;
  total = 0;
  totalPages = 1;

  // Row Action Dropdown Menu
  activeRowMenuId: number | string | null = null;

  // View Modal
  selectedReceipt: any = null;
  selectedAmountInWords = '';
  showViewModal = false;

  // Cancel Confirmation Modal
  receiptToCancel: Receipt | null = null;
  cancelReason = '';
  cancelling = false;

  // Toast Alert
  toastMessage = '';
  toastType: 'success' | 'danger' = 'success';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadReceipts();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.activeRowMenuId = null;
  }

  toggleRowMenu(event: MouseEvent, id: number | string): void {
    event.stopPropagation();
    this.activeRowMenuId = this.activeRowMenuId === id ? null : id;
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
    this.page = 1;
    if (tab === 'all') {
      this.status = '';
      this.paymentType = '';
    } else if (tab === 'Active') {
      this.status = 'Active';
      this.paymentType = '';
    } else if (tab === 'Cancelled') {
      this.status = 'Cancelled';
      this.paymentType = '';
    } else if (tab === 'Cash') {
      this.status = '';
      this.paymentType = 'Cash';
    } else if (tab === 'Cheque') {
      this.status = '';
      this.paymentType = 'Cheque';
    } else if (tab === 'UPI') {
      this.status = '';
      this.paymentType = 'Online / UPI';
    }
    this.loadReceipts();
  }

  loadReceipts(): void {
    this.loading = true;
    const params: any = {
      page: this.page,
      limit: this.limit,
    };

    if (this.search.trim()) params.search = this.search.trim();
    if (this.customerName.trim()) params.customer_name = this.customerName.trim();
    if (this.invoiceNo.trim()) params.invoice_no = this.invoiceNo.trim();
    if (this.dateFrom) params.date_from = this.dateFrom;
    if (this.dateTo) params.date_to = this.dateTo;
    if (this.minAmount !== null && !isNaN(this.minAmount) && this.minAmount >= 0) {
      params.min_amount = this.minAmount;
    }
    if (this.maxAmount !== null && !isNaN(this.maxAmount) && this.maxAmount >= 0) {
      params.max_amount = this.maxAmount;
    }
    if (this.paymentType) params.payment_type = this.paymentType;
    if (this.paymentMode) params.payment_mode = this.paymentMode;
    if (this.status) params.status = this.status;

    this.api.adminGetReceipts(params).subscribe({
      next: (res: ReceiptApiResponse) => {
        this.loading = false;
        if (res.success) {
          this.receipts = res.data || [];
          if (res.pagination) {
            this.page = res.pagination.page;
            this.limit = res.pagination.limit;
            this.total = res.pagination.total;
            this.totalPages = res.pagination.totalPages || 1;
          }
          if (res.summary) {
            this.summary = res.summary;
          }
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load receipts', 'danger');
      }
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadReceipts();
  }

  resetFilters(): void {
    this.search = '';
    this.customerName = '';
    this.invoiceNo = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.minAmount = null;
    this.maxAmount = null;
    this.paymentType = '';
    this.paymentMode = '';
    this.status = '';
    this.activeTab = 'all';
    this.page = 1;
    this.loadReceipts();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages && newPage !== this.page) {
      this.page = newPage;
      this.loadReceipts();
    }
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.search.trim() ||
      this.customerName.trim() ||
      this.invoiceNo.trim() ||
      this.dateFrom ||
      this.dateTo ||
      this.minAmount !== null ||
      this.maxAmount !== null ||
      this.paymentType ||
      this.paymentMode ||
      this.status ||
      this.activeTab !== 'all'
    );
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.page - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  formatIndianLakh(val: number): string {
    const num = Number(val) || 0;
    if (num >= 10000000) {
      return (num / 10000000).toFixed(2) + ' Cr';
    }
    if (num >= 100000) {
      return (num / 100000).toFixed(2) + ' L';
    }
    return num.toLocaleString('en-IN');
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }

    this.receipts.sort((a: any, b: any) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'amount' || field === 'paid_amount') {
        valA = Number(a.paid_amount || 0);
        valB = Number(b.paid_amount || 0);
      } else if (field === 'receipt_date') {
        valA = new Date(a.receipt_date).getTime();
        valB = new Date(b.receipt_date).getTime();
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  // Number to Words converter helper
  numberToWordsHelper(num: number | string): string {
    const n = Math.floor(Number(num) || 0);
    if (n === 0) return 'Zero Rupees Only';

    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertTwoDigits = (v: number): string => {
      if (v < 20) return a[v];
      return b[Math.floor(v / 10)] + (v % 10 !== 0 ? ' ' + a[v % 10] : '');
    };

    const convertThreeDigits = (v: number): string => {
      let str = '';
      if (v >= 100) {
        str += a[Math.floor(v / 100)] + ' Hundred ';
        v %= 100;
      }
      if (v > 0) {
        str += convertTwoDigits(v);
      }
      return str.trim();
    };

    let words = '';
    const crore = Math.floor(n / 10000000);
    let rem = n % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;
    const hundred = rem;

    if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
    if (lakh > 0) words += convertThreeDigits(lakh) + ' Lakh ';
    if (thousand > 0) words += convertThreeDigits(thousand) + ' Thousand ';
    if (hundred > 0) words += convertThreeDigits(hundred) + ' ';

    return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
  }

  // View Modal
  viewReceipt(receipt: Receipt): void {
    // Immediate optimistic preview with existing table data
    this.selectedReceipt = receipt;
    this.selectedAmountInWords = this.numberToWordsHelper(receipt.paid_amount);
    this.showViewModal = true;

    this.api.adminGetReceiptById(receipt.id).subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.receipt) {
          this.selectedReceipt = res.data.receipt;
          if (res.data.amountInWords) {
            this.selectedAmountInWords = res.data.amountInWords;
          }
        }
      },
      error: () => {
        // Silently maintain existing receipt view data without breaking UI
      }
    });
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedReceipt = null;
  }

  // PDF Download
  downloadPdf(receipt: Receipt): void {
    this.api.adminGetReceiptPdfBlob(receipt.id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Receipt-${receipt.receipt_no.replace(/[\/\\]/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast(`Receipt #${receipt.receipt_no} PDF downloaded`, 'success');
      },
      error: (err: any) => {
        this.showToast('Failed to download PDF receipt', 'danger');
      }
    });
  }

  // Direct Print
  printReceipt(receipt: Receipt): void {
    this.viewReceipt(receipt);
    setTimeout(() => {
      window.print();
    }, 400);
  }

  // Cancel / Void
  openCancelModal(receipt: Receipt): void {
    this.receiptToCancel = receipt;
    this.cancelReason = '';
  }

  closeCancelModal(): void {
    this.receiptToCancel = null;
    this.cancelReason = '';
  }

  confirmCancelReceipt(): void {
    if (!this.receiptToCancel) return;
    this.cancelling = true;

    this.api.adminDeleteReceipt(this.receiptToCancel.id, this.cancelReason).subscribe({
      next: (res: any) => {
        this.cancelling = false;
        this.closeCancelModal();
        this.showToast(res.message || 'Receipt marked as cancelled', 'success');
        this.loadReceipts();
      },
      error: (err: any) => {
        this.cancelling = false;
        this.showToast(err?.error?.message || 'Failed to cancel receipt', 'danger');
      }
    });
  }

  // Verify receipt helper
  verifyReceipt(receipt: Receipt): void {
    this.showToast(`Receipt #${receipt.receipt_no} is authentic & verified with financial ledger.`, 'success');
  }

  showToast(msg: string, type: 'success' | 'danger' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4500);
  }
}
