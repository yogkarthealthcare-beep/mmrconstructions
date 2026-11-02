import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, BASE_URL } from '../../services/api.service';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-payment-settlement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminPaginationComponent
  ],
  templateUrl: './payment-settlement.component.html',
  styleUrls: ['./payment-settlement.component.css']
})
export class AdminPaymentSettlementComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);
  private router = inject(Router);

  baseUrl = BASE_URL;
  Math = Math;
  loading = false;
  previewLoading = false;
  actionLoading = false;

  orders: any[] = [];
  metrics: any = {
    total_orders: 0,
    pending_count: 0,
    released_count: 0,
    cancelled_count: 0,
    total_received_amount: 0,
    total_settled_amount: 0
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
  activeTab: 'ALL' | 'PENDING' | 'RELEASED' | 'CANCELLED' = 'ALL';

  // Release Modal State
  showReleaseModal = false;
  selectedOrder: any = null;
  settlementPreview: any = null;
  releaseRemarks = '';
  isReleasing = false;

  // Cancel Modal State
  showCancelModal = false;
  orderToCancel: any = null;
  cancelReason = '';
  isCancelling = false;

  // Detail Modal State
  showDetailModal = false;
  detailOrder: any = null;

  // Mobile Landscape / Fullscreen Mode
  isLandscapeMode = false;
  isRotatedLandscape = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Primary Tab: Orders vs EMI Installments
  activeMainTab: 'ORDERS' | 'EMIS' = 'ORDERS';

  // EMI Installments State
  emis: any[] = [];
  emiMetrics: any = {
    total_emis: 0,
    verification_count: 0,
    pending_count: 0,
    paid_count: 0,
    overdue_count: 0,
    total_collected_amount: 0
  };
  emiPagination = {
    total: 0,
    page: 1,
    limit: 15,
    pages: 1
  };
  emiSearch = '';
  emiStatusTab: 'ALL' | 'VERIFICATION' | 'PENDING' | 'PAID' | 'OVERDUE' = 'ALL';
  emiLoading = false;
  releasingEmiId: number | null = null;

  // Proof Modal State
  showProofModal = false;
  selectedProofEmi: any = null;

  ngOnInit(): void {
    this.loadOrders(1);
    this.loadEmiMetricsOnly();
  }

  toggleLandscapeMode(): void {
    this.isLandscapeMode = !this.isLandscapeMode;
    if (this.isLandscapeMode) {
      try {
        if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (e) {}
    } else {
      this.isRotatedLandscape = false;
      try {
        if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (e) {}
    }
  }

  toggleRotateLandscape(): void {
    this.isRotatedLandscape = !this.isRotatedLandscape;
  }

  getNumberFitClass(val: number | string | undefined | null): string {
    if (val === undefined || val === null) return 'digits-normal';
    const num = Number(val);
    const str = !isNaN(num) ? Math.round(num).toLocaleString('en-IN') : String(val);
    const len = str.length;
    if (len >= 12) return 'digits-xxl';
    if (len >= 10) return 'digits-xl';
    if (len >= 7) return 'digits-lg';
    return 'digits-normal';
  }

  formatMoney(val: any): string {
    if (val === undefined || val === null || val === '') return '0';
    const num = Number(val);
    if (isNaN(num)) return '0';
    return Math.round(num).toLocaleString('en-IN');
  }

  loadOrders(page: number = 1): void {
    this.loading = true;
    this.pagination.page = page;

    const params: any = {
      page: this.pagination.page,
      limit: this.pagination.limit,
      search: this.search.trim(),
      status: this.status
    };

    this.api.get('/api/admin/payment-settlements', params, true).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          const rawOrders: any[] = res.data.orders || [];
          const seen = new Set<any>();
          this.orders = rawOrders
            .filter((o: any) => {
              const key = o.booking_id ?? o.booking_serial;
              if (!key || seen.has(key)) return false;
              if (o.is_self_purchase || o.is_company_direct || o.booking_type === 'SELF_PURCHASE') return false;
              if (o.buyer_user_type && o.buyer_user_type !== 'Customer') return false;
              seen.add(key);
              return true;
            })
            .map((o: any) => ({
              ...o,
              total_plot_price: Number(o.total_plot_price) || 0,
              amount_received: Number(o.amount_received) || 0,
              remaining_balance: Number(o.remaining_balance) || 0,
              total_distributed: Number(o.total_distributed) || 0,
              settlement_status: o.settlement_status || 'Pending'
            }));
          this.metrics = res.data.metrics || this.metrics;
          this.pagination = res.data.pagination || this.pagination;
        } else {
          this.orders = [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load payment settlement orders', 'error');
      }
    });
  }

  setTab(tab: 'ALL' | 'PENDING' | 'RELEASED' | 'CANCELLED'): void {
    this.activeTab = tab;
    if (tab === 'ALL') {
      this.status = 'ALL';
    } else if (tab === 'PENDING') {
      this.status = 'Pending';
    } else if (tab === 'RELEASED') {
      this.status = 'Released';
    } else if (tab === 'CANCELLED') {
      this.status = 'Cancelled';
    }
    this.loadOrders(1);
  }

  onSearch(): void {
    this.loadOrders(1);
  }

  resetFilters(): void {
    this.search = '';
    this.status = 'ALL';
    this.activeTab = 'ALL';
    this.loadOrders(1);
  }

  openReleaseModal(order: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement;
      if (target && target.blur) {
        target.blur();
      }
    }
    if (typeof document !== 'undefined' && document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }

    this.selectedOrder = order;
    this.settlementPreview = null;
    this.releaseRemarks = '';
    this.previewLoading = true;
    this.showReleaseModal = true;

    this.api.get(`/api/admin/payment-settlements/${order.booking_id}/preview`, {}, true).subscribe({
      next: (res: any) => {
        this.previewLoading = false;
        if (res.success && res.data) {
          this.settlementPreview = res.data;
        } else {
          this.showToast(res?.message || 'Could not load commission distribution preview', 'error');
        }
      },
      error: (err: any) => {
        this.previewLoading = false;
        this.showToast(err?.error?.message || 'Failed to calculate commission preview', 'error');
      }
    });
  }

  closeReleaseModal(): void {
    this.showReleaseModal = false;
    this.selectedOrder = null;
    this.settlementPreview = null;
    this.releaseRemarks = '';
    this.isReleasing = false;
  }

  confirmReleasePayment(): void {
    if (!this.selectedOrder || !this.settlementPreview) return;
    if (this.isReleasing) return;

    if (!this.settlementPreview.eligibleForRelease && !this.settlementPreview.isHistorical) {
      Swal.fire({
        icon: 'warning',
        title: 'Settlement Ineligible',
        text: this.settlementPreview.ineligibleReason || 'This order is not eligible for payment release.'
      });
      return;
    }

    Swal.fire({
      title: 'Confirm Payment Settlement Release',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Order ID:</strong> ${this.selectedOrder.booking_serial || ('#' + this.selectedOrder.booking_id)}</p>
          <p><strong>Buyer:</strong> ${this.selectedOrder.buyer_name || 'Customer'}</p>
          <p><strong>Amount Received:</strong> ₹${Number(this.selectedOrder.amount_received || 0).toLocaleString('en-IN')}</p>
          <p><strong>Total Distributed Commission:</strong> ₹${Number(this.settlementPreview.totalDistributionAmount || 0).toLocaleString('en-IN')}</p>
          <p><strong>Company Retained Share:</strong> ₹${Number(this.settlementPreview.companyShareFromReceived || 0).toLocaleString('en-IN')}</p>
          <hr/>
          <p style="font-size: 12px; color: #64748b;">
            This will record the payment settlement and update recipient ledgers. Continue?
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Release Settlement',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeRelease();
      }
    });
  }

  executeRelease(): void {
    this.isReleasing = true;
    const body = {
      remarks: this.releaseRemarks.trim()
    };

    this.api.post(`/api/admin/payment-settlements/${this.selectedOrder.booking_id}/release`, body, true).subscribe({
      next: (res: any) => {
        this.isReleasing = false;
        this.closeReleaseModal();
        if (res.success) {
          Swal.fire({
            icon: 'success',
            title: 'Settlement Released',
            text: res.message || 'Payment settlement released successfully!'
          });
          this.loadOrders(this.pagination.page);
        } else {
          this.showToast(res.message || 'Failed to release settlement', 'error');
        }
      },
      error: (err: any) => {
        this.isReleasing = false;
        Swal.fire({
          icon: 'error',
          title: 'Release Failed',
          text: err?.error?.message || 'Payment settlement release failed'
        });
      }
    });
  }

  openCancelModal(order: any): void {
    if (order.settlement_status === 'Released') {
      Swal.fire({
        icon: 'error',
        title: 'Action Not Permitted',
        text: 'This settlement has already been released. Released settlements cannot be directly cancelled.'
      });
      return;
    }
    this.orderToCancel = order;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.orderToCancel = null;
    this.cancelReason = '';
    this.isCancelling = false;
  }

  confirmCancelSettlement(): void {
    if (!this.orderToCancel) return;
    const reason = this.cancelReason.trim();
    if (!reason) {
      this.showToast('Please provide a reason for cancelling this settlement.', 'error');
      return;
    }

    this.isCancelling = true;
    this.api.post(`/api/admin/payment-settlements/${this.orderToCancel.booking_id}/cancel`, { reason }, true).subscribe({
      next: (res: any) => {
        this.isCancelling = false;
        this.closeCancelModal();
        if (res.success) {
          Swal.fire({
            icon: 'success',
            title: 'Settlement Cancelled',
            text: res.message || 'Settlement request cancelled successfully.'
          });
          this.loadOrders(this.pagination.page);
        } else {
          this.showToast(res.message || 'Failed to cancel settlement', 'error');
        }
      },
      error: (err: any) => {
        this.isCancelling = false;
        Swal.fire({
          icon: 'error',
          title: 'Cancellation Failed',
          text: err?.error?.message || 'Failed to cancel settlement request'
        });
      }
    });
  }

  viewDetails(order: any): void {
    this.detailOrder = order;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailOrder = null;
  }

  exportData(): void {
    const columns: ExportColumn[] = [
      { header: 'Order ID', key: 'booking_serial', width: 20 },
      { header: 'Booking Date', key: 'booking_date', width: 15 },
      { header: 'Site Name', key: 'site_name', width: 20 },
      { header: 'Plot Number', key: 'plot_number', width: 15 },
      { header: 'Buyer Name', key: 'buyer_name', width: 25 },
      { header: 'Buyer ID', key: 'buyer_member_id', width: 20 },
      { header: 'Seller Name', key: 'seller_name', width: 25 },
      { header: 'Seller ID', key: 'seller_member_id', width: 20 },
      { header: 'T Member Name', key: 'team_member_name', width: 25 },
      { header: 'T Member ID', key: 'team_member_member_id', width: 20 },
      { header: 'SOC / Associate Name', key: 'associate_name', width: 25 },
      { header: 'SOC / Associate ID', key: 'associate_member_id', width: 20 },
      { header: 'Referral ID', key: 'referral_id', width: 25 },
      { header: 'Total Plot Price', key: 'total_plot_price', width: 18 },
      { header: 'Amount Received', key: 'amount_received', width: 18 },
      { header: 'Payment Status', key: 'payment_status', width: 18 },
      { header: 'Settlement Status', key: 'settlement_status', width: 18 }
    ];

    const dataToExport = this.orders.map(o => ({
      ...o,
      booking_serial: o.booking_serial || ('BK-' + o.booking_id),
      booking_date: o.booking_date ? new Date(o.booking_date).toLocaleDateString('en-IN') : '',
      total_plot_price: '₹' + Number(o.total_plot_price || 0).toLocaleString('en-IN'),
      amount_received: '₹' + Number(o.amount_received || 0).toLocaleString('en-IN')
    }));

    this.exportService.exportToExcel(dataToExport, columns, `MMR_Plot_Orders_Payment_Settlement_${new Date().toISOString().slice(0,10)}`);
  }

  setMainTab(tab: 'ORDERS' | 'EMIS'): void {
    this.activeMainTab = tab;
    if (tab === 'EMIS' && this.emis.length === 0) {
      this.loadEmis(1);
    } else if (tab === 'ORDERS' && this.orders.length === 0) {
      this.loadOrders(1);
    }
  }

  loadEmiMetricsOnly(): void {
    this.api.get('/api/admin/payment-settlements/emi-installments', { page: 1, limit: 1 }, true).subscribe({
      next: (res: any) => {
        if (res.success && res.data?.metrics) {
          this.emiMetrics = res.data.metrics;
        }
      },
      error: () => {}
    });
  }

  loadEmis(page: number = 1): void {
    this.emiLoading = true;
    this.emiPagination.page = page;

    const params: any = {
      page: this.emiPagination.page,
      limit: this.emiPagination.limit,
      search: this.emiSearch.trim(),
      status: this.emiStatusTab
    };

    this.api.get('/api/admin/payment-settlements/emi-installments', params, true).subscribe({
      next: (res: any) => {
        this.emiLoading = false;
        if (res.success && res.data) {
          this.emis = (res.data.installments || []).map((e: any) => ({
            ...e,
            emi_amount: Number(e.emi_amount) || 0,
            late_fee_amount: Number(e.late_fee_amount) || 0,
            total_due: Number(e.total_due) || 0,
            paid_amount: Number(e.paid_amount) || 0,
            total_plot_price: Number(e.total_plot_price) || 0,
            advance_amount: Number(e.advance_amount) || 0
          }));
          this.emiMetrics = res.data.metrics || this.emiMetrics;
          this.emiPagination = res.data.pagination || this.emiPagination;
        } else {
          this.emis = [];
        }
      },
      error: (err: any) => {
        this.emiLoading = false;
        this.showToast(err?.error?.message || 'Failed to load EMI installments', 'error');
      }
    });
  }

  setEmiTab(tab: 'ALL' | 'VERIFICATION' | 'PENDING' | 'PAID' | 'OVERDUE'): void {
    this.emiStatusTab = tab;
    this.loadEmis(1);
  }

  onEmiSearch(): void {
    this.loadEmis(1);
  }

  resetEmiFilters(): void {
    this.emiSearch = '';
    this.emiStatusTab = 'ALL';
    this.loadEmis(1);
  }

  openProofModal(emi: any): void {
    this.selectedProofEmi = emi;
    this.showProofModal = true;
  }

  closeProofModal(): void {
    this.showProofModal = false;
    this.selectedProofEmi = null;
  }

  releaseEmi(emi: any): void {
    if (this.releasingEmiId) return;

    Swal.fire({
      title: `Release EMI Installment #${emi.installment_no}`,
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
          <p><strong>Customer:</strong> ${emi.customer_name || 'Customer'} (${emi.customer_member_id || 'N/A'})</p>
          <p><strong>Plot & Site:</strong> Plot #${emi.plot_number || 'N/A'}, ${emi.site_name || 'Project Site'}</p>
          <p><strong>Installment No:</strong> #${emi.installment_no} (${emi.due_date ? (new Date(emi.due_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })) : 'N/A'})</p>
          <p><strong>EMI Amount:</strong> ₹${Number(emi.total_due || emi.emi_amount || 0).toLocaleString('en-IN')}</p>
          ${emi.proof_reference_no ? `<p><strong>UTR / Ref No:</strong> ${emi.proof_reference_no}</p>` : ''}
          ${emi.proof_payment_mode ? `<p><strong>Payment Mode:</strong> ${emi.proof_payment_mode}</p>` : ''}
          <hr style="margin: 8px 0;"/>
          <p style="font-size: 12px; color: #059669; font-weight: 600;">
            ✓ Approving this will mark the installment as <strong>Paid</strong>, generate payment voucher, and release associate/team member commissions!
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Approve & Release',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.releasingEmiId = emi.emi_id;
        const payload = {
          paid_amount: Number(emi.total_due || emi.emi_amount || 0)
        };

        this.api.post(`/api/admin/payment-settlements/emi-installments/${emi.emi_id}/release`, payload, true).subscribe({
          next: (res: any) => {
            this.releasingEmiId = null;
            if (res.success) {
              Swal.fire({
                icon: 'success',
                title: 'EMI Settlement Released!',
                text: res.message || `Installment #${emi.installment_no} approved and commissions released.`,
                timer: 2500
              });
              this.showToast(`Installment #${emi.installment_no} approved successfully!`);
              this.loadEmis(this.emiPagination.page);
            } else {
              Swal.fire('Error', res.message || 'Failed to release EMI payment', 'error');
            }
          },
          error: (err: any) => {
            this.releasingEmiId = null;
            Swal.fire('Error', err?.error?.message || 'Failed to release EMI settlement', 'error');
          }
        });
      }
    });
  }

  trackByEmiId(index: number, item: any): any {
    return item?.emi_id ?? index;
  }

  trackByBookingId(index: number, order: any): any {
    return order?.booking_id ?? order?.booking_serial ?? index;
  }

  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }
}
