import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService, BASE_URL } from '../../services/api.service';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-plot-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminPaginationComponent,
    AdminTableContainerComponent
  ],
  templateUrl: './plot-orders.component.html',
  styleUrls: ['./plot-orders.component.css']
})
export class AdminPlotOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  baseUrl = BASE_URL;
  Math = Math;
  loading = false;
  detailLoading = false;
  actionLoading = false;
  statusUpdatingId: number | null = null;
  hoveredOrderId: number | null = null;

  orders: any[] = [];
  metrics: any = {
    total_orders: 0,
    approved_count: 0,
    pending_count: 0,
    rejected_count: 0,
    self_purchase_count: 0,
    customer_sale_count: 0,
    total_sales_volume: 0,
    total_advance_volume: 0
  };

  pagination = {
    total: 0,
    page: 1,
    limit: 15,
    pages: 1
  };

  // Filters
  search = '';
  status = 'ALL';
  bookingType = 'ALL';
  activeTab: 'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'SELF_PURCHASE' = 'ALL';

  // Modal / Detail state
  selectedOrder: any = null;
  selectedPayments: any[] = [];
  showDetailModal = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: any) => {
      if (params.tab && ['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'SELF_PURCHASE'].includes(String(params.tab).toUpperCase())) {
        this.setTab(String(params.tab).toUpperCase() as any);
      } else {
        this.loadOrders(1);
      }
    });
  }

  loadOrders(page: number = 1): void {
    this.loading = true;
    this.pagination.page = page;

    const params: any = {
      page: this.pagination.page,
      limit: this.pagination.limit,
      search: this.search.trim(),
      status: this.status,
      booking_type: this.bookingType
    };

    this.api.get('/api/admin/plot-orders', params, true).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.orders = res.data.orders || [];
          this.metrics = res.data.metrics || this.metrics;
          this.pagination = res.data.pagination || this.pagination;
        } else {
          this.orders = [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load plot orders', 'error');
      }
    });
  }

  setTab(tab: 'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'SELF_PURCHASE'): void {
    this.activeTab = tab;
    if (tab === 'ALL') {
      this.status = 'ALL';
      this.bookingType = 'ALL';
    } else if (tab === 'PENDING') {
      this.status = 'Pending';
      this.bookingType = 'ALL';
    } else if (tab === 'CONFIRMED') {
      this.status = 'Confirmed';
      this.bookingType = 'ALL';
    } else if (tab === 'REJECTED') {
      this.status = 'Rejected';
      this.bookingType = 'ALL';
    } else if (tab === 'SELF_PURCHASE') {
      this.status = 'ALL';
      this.bookingType = 'SELF_PURCHASE';
    }
    this.loadOrders(1);
  }

  onSearch(): void {
    this.loadOrders(1);
  }

  resetFilters(): void {
    this.search = '';
    this.status = 'ALL';
    this.bookingType = 'ALL';
    this.activeTab = 'ALL';
    this.loadOrders(1);
  }

  onPageChange(page: number): void {
    this.loadOrders(page);
  }

  // Inline Admin Status Dropdown Handler
  onStatusChange(order: any, targetStatus: string): void {
    if (!targetStatus || targetStatus === order.booking_status) return;

    const isApprove = targetStatus === 'Confirmed' || targetStatus === 'Approved';
    const isReject = targetStatus === 'Rejected';

    if (isReject) {
      Swal.fire({
        title: 'Reject Plot Order?',
        text: `Are you sure you want to reject Order #${order.booking_serial || order.booking_id}?`,
        icon: 'warning',
        input: 'textarea',
        inputPlaceholder: 'Please provide rejection reason (required)...',
        inputValidator: (val) => {
          if (!val || !val.trim()) return 'Rejection reason is required!';
          return null;
        },
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Yes, Reject Request',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.executeStatusUpdate(order, 'Rejected', result.value);
        } else {
          // Revert selection
          this.revertStatus(order);
        }
      });
    } else if (isApprove) {
      const isSelf = order.is_self_purchase;
      const commissionNotice = isSelf
        ? '<div style="margin-top: 8px; padding: 8px; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 13px;"><b>Self Purchase Detected:</b> 0% Commission will be applied. No deductions.</div>'
        : '';

      Swal.fire({
        title: 'Approve & Confirm Plot Order?',
        html: `Approve plot booking #${order.booking_serial || order.booking_id} for <b>${order.buyer_name}</b>?<br>Plot status will be set to <b>Sold</b>.${commissionNotice}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'Yes, Approve & Confirm',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.executeStatusUpdate(order, 'Confirmed');
        } else {
          this.revertStatus(order);
        }
      });
    } else {
      // Direct Pending or Under Process
      this.executeStatusUpdate(order, targetStatus);
    }
  }

  private revertStatus(order: any): void {
    // Triggers change detection refresh for dropdown
    const current = order.booking_status;
    order.booking_status = '';
    setTimeout(() => { order.booking_status = current; }, 10);
  }

  private executeStatusUpdate(order: any, status: string, reason?: string): void {
    this.statusUpdatingId = order.booking_id;

    this.api.patch(`/api/admin/plot-orders/${order.booking_id}/status`, {
      status,
      reason,
      remarks: reason
    }, true).subscribe({
      next: (res: any) => {
        this.statusUpdatingId = null;
        if (res.success) {
          this.showToast(`Order #${order.booking_serial || order.booking_id} updated to ${status}`, 'success');
          order.booking_status = status;
          if (status === 'Confirmed') {
            order.associate_approval_status = 'Approved';
          } else if (status === 'Rejected') {
            order.associate_approval_status = 'Rejected';
          }
          // Refresh statistics
          this.loadOrders(this.pagination.page);
          if (this.selectedOrder && this.selectedOrder.booking_id === order.booking_id) {
            this.selectedOrder.booking_status = status;
          }
        }
      },
      error: (err: any) => {
        this.statusUpdatingId = null;
        this.revertStatus(order);
        this.showToast(err?.error?.message || 'Failed to update order status', 'error');
      }
    });
  }

  // View Details Modal
  viewDetails(order: any): void {
    this.selectedOrder = order;
    this.selectedPayments = [];
    this.showDetailModal = true;
    this.detailLoading = true;

    this.api.get(`/api/admin/plot-orders/${order.booking_id}`, {}, true).subscribe({
      next: (res: any) => {
        this.detailLoading = false;
        if (res.success && res.data) {
          this.selectedOrder = res.data.order || order;
          this.selectedPayments = res.data.payments || [];
        }
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.selectedOrder = null;
  }

  // Invoice Navigation / Generation
  openInvoice(order: any): void {
    const invId = order.invoice_number || order.invoice_id || order.booking_id;
    if (order.invoice_number || order.invoice_id) {
      if (typeof window !== 'undefined') {
        window.open(`/invoice/${invId}`, '_blank');
      } else {
        this.router.navigate(['/invoice', invId]);
      }
    } else {
      // Auto-generate invoice first
      this.generateInvoice(order, true);
    }
  }

  generateInvoice(order: any, openAfter: boolean = false): void {
    this.actionLoading = true;
    this.api.post(`/api/admin/plot-orders/${order.booking_id}/generate-invoice`, {}, true).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        if (res.success) {
          const invNum = res.data?.invoice?.invoice_number || `MMR-INV-${order.booking_id}`;
          this.showToast('Invoice generated successfully!', 'success');
          order.invoice_number = invNum;
          if (openAfter) {
            if (typeof window !== 'undefined') {
              window.open(`/invoice/${invNum}`, '_blank');
            } else {
              this.router.navigate(['/invoice', invNum]);
            }
          }
        }
      },
      error: (err: any) => {
        this.actionLoading = false;
        this.showToast(err?.error?.message || 'Failed to generate invoice', 'error');
      }
    });
  }

  // Export to CSV
  exportData(): void {
    if (!this.orders || this.orders.length === 0) {
      this.showToast('No orders to export', 'error');
      return;
    }

    const columns: ExportColumn[] = [
      { key: 'booking_serial', header: 'Order ID' },
      { key: 'booking_date', header: 'Booking Date' },
      { key: 'buyer_name', header: 'Buyer Name' },
      { key: 'buyer_member_id', header: 'Buyer ID' },
      { key: 'buyer_mobile', header: 'Buyer Mobile' },
      { key: 'is_self_purchase', header: 'Is Self Purchase' },
      { key: 'team_member_name', header: 'Team Member' },
      { key: 'team_member_member_id', header: 'Team Member ID' },
      { key: 'associate_name', header: 'Associate' },
      { key: 'associate_member_id', header: 'Associate ID' },
      { key: 'plot_number', header: 'Plot Number' },
      { key: 'site_name', header: 'Site' },
      { key: 'total_agreed_price', header: 'Agreed Price (INR)' },
      { key: 'advance_amount', header: 'Advance Paid (INR)' },
      { key: 'payment_method', header: 'Payment Method' },
      { key: 'payment_type', header: 'Payment Type' },
      { key: 'booking_status', header: 'Status' },
      { key: 'invoice_number', header: 'Invoice #' }
    ];

    const exportRows = this.orders.map(o => ({
      ...o,
      is_self_purchase: o.is_self_purchase ? 'YES (0% Commission)' : 'NO'
    }));

    this.exportService.exportToExcel(exportRows, columns, `plot-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  private showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }
}
