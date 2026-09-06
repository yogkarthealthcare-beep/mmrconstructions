import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-admin-orders-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminPaginationComponent, AdminTableContainerComponent],
  templateUrl: './orders-mgmt.component.html',
  styleUrls: ['./orders-mgmt.component.css']
})
export class AdminOrdersMgmtComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

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

  onPageChange(p: number) {
    this.loadOrders(p);
  }

  onPageSizeChange(size: number) {
    this.pagination.limit = size;
    this.loadOrders(1);
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

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const fetchAndExport = (dataList: any[], baseIndex: number) => {
      const columns: ExportColumn[] = [
        { header: '#', key: '_sno', width: 6 },
        { header: 'Order ID', key: 'order_id_display', width: 14 },
        { header: 'Invoice #', key: 'invoice_number', width: 16 },
        { header: 'Booking Date', key: 'date_display', width: 14 },
        { header: 'Customer Name', key: 'customer_name', width: 20 },
        { header: 'Mobile', key: 'mobile_no', width: 14 },
        { header: 'Project / Site', key: 'site_name', width: 18 },
        { header: 'Plot #', key: 'plot_number', width: 10 },
        { header: 'Grand Total (Rs.)', key: 'grand_total_display', width: 16 },
        { header: 'Paid (Rs.)', key: 'paid_amount_display', width: 14 },
        { header: 'Balance (Rs.)', key: 'balance_amount_display', width: 14 },
        { header: 'Pay Status', key: 'payment_status', width: 12 },
        { header: 'Order Status', key: 'order_status', width: 12 }
      ];

      const formatted = dataList.map((o, idx) => ({
        ...o,
        _sno: baseIndex + idx + 1,
        order_id_display: o.order_id || ('BK-' + o.booking_id),
        date_display: o.invoice_date ? new Date(o.invoice_date).toLocaleDateString() : 'N/A',
        customer_name: o.invoice_data?.customer_name || '-',
        mobile_no: o.invoice_data?.mobile_no || '-',
        site_name: o.invoice_data?.site_name || '-',
        plot_number: o.invoice_data?.plot_number || '-',
        grand_total_display: Number(o.grand_total || 0).toLocaleString(),
        paid_amount_display: Number(o.paid_amount || 0).toLocaleString(),
        balance_amount_display: Number(o.balance_amount || 0).toLocaleString()
      }));

      const title = mode === 'current' ? `Orders Directory (Page ${this.pagination.page})` : 'All Orders & Invoices Directory';
      const filename = `orders_invoices_${mode}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'excel') {
        this.exportService.exportToExcel(formatted, columns, filename, title);
      } else {
        this.exportService.exportToPdf(formatted, columns, filename, title);
      }
    };

    if (mode === 'current') {
      const baseIdx = (this.pagination.page - 1) * this.pagination.limit;
      fetchAndExport(this.orders, baseIdx);
    } else {
      const params: any = {
        page: 1,
        limit: 1000,
        search: this.search,
        payment_status: this.paymentStatus,
        order_status: this.orderStatus,
        from_date: this.fromDate,
        to_date: this.toDate,
        sort_by: this.sortBy,
      };

      this.api.get('/api/orders', params, true).subscribe({
        next: (res: any) => {
          const allOrders = res?.data?.orders || this.orders;
          fetchAndExport(allOrders, 0);
        },
        error: () => {
          fetchAndExport(this.orders, 0);
        }
      });
    }
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
}

