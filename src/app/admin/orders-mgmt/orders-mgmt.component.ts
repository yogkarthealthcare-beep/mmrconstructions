import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-orders-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders-mgmt.component.html',
  styleUrls: ['./orders-mgmt.component.css']
})
export class AdminOrdersMgmtComponent implements OnInit {
  loading = true;
  orders: any[] = [];
  pagination: any = { total: 0, page: 1, limit: 10, pages: 1 };

  // Filters & Search
  search = '';
  paymentStatus = '';
  orderStatus = '';
  fromDate = '';
  toDate = '';
  sortBy = 'latest';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders(page: number = 1) {
    this.loading = true;
    const params: any = {
      page,
      limit: this.pagination.limit,
      search: this.search,
      payment_status: this.paymentStatus,
      order_status: this.orderStatus,
      from_date: this.fromDate,
      to_date: this.toDate,
      sort_by: this.sortBy,
    };

    this.api.get('/api/orders', params, true).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.orders = res.data.orders || [];
          this.pagination = res.data.pagination || { total: 0, page: 1, limit: 10, pages: 1 };
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load orders', 'error');
      }
    });
  }

  onFilterChange() {
    this.loadOrders(1);
  }

  resetFilters() {
    this.search = '';
    this.paymentStatus = '';
    this.orderStatus = '';
    this.fromDate = '';
    this.toDate = '';
    this.sortBy = 'latest';
    this.loadOrders(1);
  }

  downloadPdf(order: any) {
    const invNum = order.invoice_number || order.order_id || order.booking_id;
    this.api.getBlob(`/api/invoice/${invNum}/pdf`).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invNum}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('PDF downloaded successfully!', 'success');
      },
      error: (err: any) => {
        this.showToast(err?.error?.message || 'Failed to download PDF', 'error');
      }
    });
  }

  printOrder(order: any) {
    const invNum = order.invoice_number || order.order_id || order.booking_id;
    window.open(`/booking/${invNum}/invoice?print=true`, '_blank');
  }

  deleteOrder(order: any) {
    const invNum = order.invoice_number || order.order_id || order.booking_id;
    const ok = confirm(`Are you sure you want to delete Order / Invoice "${invNum}"?\n\nThis will permanently remove the booking and payment records and reset the associated plot status back to Available.`);
    if (!ok) return;

    this.api.adminDeleteOrder(invNum).subscribe({
      next: (res: any) => {
        this.showToast(res?.message || 'Order deleted successfully!', 'success');
        this.loadOrders(this.pagination.page);
      },
      error: (err: any) => {
        this.showToast(err?.error?.message || 'Failed to delete order', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => { this.toastMessage = ''; }, 4000);
  }

  get pagesArray(): number[] {
    const totalPages = this.pagination.pages || 1;
    const current = this.pagination.page || 1;
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
