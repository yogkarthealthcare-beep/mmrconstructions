import { Component, OnInit } from '@angular/core';
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

  // Filters Model
  search = '';
  paymentType = '';
  paymentMode = '';
  dateFrom = '';
  dateTo = '';
  plottingPlace = '';
  status = '';
  
  // Pagination
  page = 1;
  limit = 25;
  total = 0;
  totalPages = 1;

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

  loadReceipts(): void {
    this.loading = true;
    const params: any = {
      page: this.page,
      limit: this.limit,
    };

    if (this.search.trim()) params.search = this.search.trim();
    if (this.paymentType) params.payment_type = this.paymentType;
    if (this.paymentMode) params.payment_mode = this.paymentMode;
    if (this.dateFrom) params.date_from = this.dateFrom;
    if (this.dateTo) params.date_to = this.dateTo;
    if (this.plottingPlace) params.plotting_place = this.plottingPlace;
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
            this.totalPages = res.pagination.totalPages;
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
    this.paymentType = '';
    this.paymentMode = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.plottingPlace = '';
    this.status = '';
    this.page = 1;
    this.loadReceipts();
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages && newPage !== this.page) {
      this.page = newPage;
      this.loadReceipts();
    }
  }

  onLimitChange(): void {
    this.page = 1;
    this.loadReceipts();
  }

  // View Modal
  viewReceipt(receipt: Receipt): void {
    this.api.adminGetReceiptById(receipt.id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.selectedReceipt = res.data.receipt;
          this.selectedAmountInWords = res.data.amountInWords || '';
          this.showViewModal = true;
        }
      },
      error: (err: any) => {
        this.showToast(err?.error?.message || 'Error opening receipt view', 'danger');
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
    }, 500);
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

  showToast(msg: string, type: 'success' | 'danger' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4500);
  }
}
