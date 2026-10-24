import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService, BASE_URL } from '../../services/api.service';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-plot-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminPaginationComponent
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

  // Read-only Site Location Map Modal State
  showPlotLocationModal = false;
  selectedLocationOrder: any = null;
  mapLoading = false;
  mapError = '';
  siteData: any = null;
  sitePlots: any[] = [];
  targetPlotOnMap: any = null;
  mapZoom = 1;
  mapPan = { x: 0, y: 0 };
  mapImageWidth = 2000;
  mapImageHeight = 1637;
  mapImageUrl = '';
  isPointerDown = false;
  pointerStart = { x: 0, y: 0 };
  panStart = { x: 0, y: 0 };

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
          const rawOrders = res.data.orders || [];
          this.orders = rawOrders.map((o: any) => {
            if (o.booking_status === 'Approved') o.booking_status = 'Confirmed';
            // Explicitly selected statuses that should display their selected option on page load:
            const explicitStatuses = ['Confirmed', 'Rejected', 'Under Process', 'Pending'];
            if (!o.booking_status || !explicitStatuses.includes(o.booking_status)) {
              o.booking_status = '';
            }
            return o;
          });
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
    if (targetStatus === order.booking_status) return;

    // Resetting to Choose
    if (!targetStatus || targetStatus === '') {
      Swal.fire({
        title: 'Reset Approval Status?',
        text: `Reset Order #${order.booking_serial || order.booking_id} status back to unreviewed (Choose)?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#64748b',
        confirmButtonText: 'Yes, Reset Status',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.executeStatusUpdate(order, 'Submitted');
        } else {
          this.revertStatus(order);
        }
      });
      return;
    }

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
    order.booking_status = null;
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
          const displayLabel = (status === 'Submitted' || !status) ? 'Choose' : status;
          this.showToast(`Order #${order.booking_serial || order.booking_id} updated to ${displayLabel}`, 'success');
          order.booking_status = (status === 'Submitted' || !status) ? '' : status;
          if (status === 'Confirmed') {
            order.associate_approval_status = 'Approved';
          } else if (status === 'Rejected') {
            order.associate_approval_status = 'Rejected';
          }
          // Refresh statistics
          this.loadOrders(this.pagination.page);
          if (this.selectedOrder && this.selectedOrder.booking_id === order.booking_id) {
            this.selectedOrder.booking_status = (status === 'Submitted' || !status) ? '' : status;
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

  // ── Plot Site Location Map Modal (Strictly Read-Only Inspection) ────
  openPlotLocationModal(order: any): void {
    if (!order || !order.site_id) {
      this.showToast('Site information not found for this plot booking.', 'error');
      return;
    }

    this.selectedLocationOrder = order;
    this.showPlotLocationModal = true;
    this.mapLoading = true;
    this.mapError = '';
    this.siteData = null;
    this.sitePlots = [];
    this.targetPlotOnMap = null;
    this.mapZoom = 1;
    this.mapPan = { x: 0, y: 0 };

    this.api.getPublicPlotMap(order.site_id).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        this.siteData = data.site || null;
        this.mapImageUrl = this.resolveImageUrl(this.siteData?.map_image_url || '');
        const rawPlots = data.plots || [];

        this.inspectImageDimensions(this.mapImageUrl, () => {
          this.processModalPlots(rawPlots, order);
          this.mapLoading = false;
          setTimeout(() => {
            this.fitAndFocusPlot(this.targetPlotOnMap);
          }, 80);
        });
      },
      error: () => {
        // Resilient fallback: try admin sales map endpoint
        this.api.adminGetSiteSalesMap(order.site_id).subscribe({
          next: (res: any) => {
            const data = res?.data || res || {};
            this.siteData = data.site || null;
            this.mapImageUrl = this.resolveImageUrl(this.siteData?.map_image_url || '');
            const rawPlots = data.plots || [];

            this.inspectImageDimensions(this.mapImageUrl, () => {
              this.processModalPlots(rawPlots, order);
              this.mapLoading = false;
              setTimeout(() => {
                this.fitAndFocusPlot(this.targetPlotOnMap);
              }, 80);
            });
          },
          error: () => {
            this.mapLoading = false;
            this.mapError = 'Site layout map preview could not be loaded at this moment.';
          }
        });
      }
    });
  }

  closePlotLocationModal(): void {
    this.showPlotLocationModal = false;
    this.selectedLocationOrder = null;
    this.sitePlots = [];
    this.targetPlotOnMap = null;
  }

  fitAndFocusPlot(plot: any): void {
    if (plot && plot.centroid && plot.centroid.x > 0) {
      this.mapZoom = 1.75;
      const viewportW = 600;
      const viewportH = 360;
      this.mapPan = {
        x: viewportW / 2 - plot.centroid.x * this.mapZoom,
        y: viewportH / 2 - plot.centroid.y * this.mapZoom
      };
    } else {
      this.resetMapZoom();
    }
  }

  resetMapZoom(): void {
    this.mapZoom = 1;
    this.mapPan = { x: 0, y: 0 };
  }

  zoomInMap(): void {
    this.mapZoom = Math.min(this.mapZoom * 1.3, 5);
  }

  zoomOutMap(): void {
    this.mapZoom = Math.max(this.mapZoom / 1.3, 0.4);
  }

  onMapPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.isPointerDown = true;
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.panStart = { ...this.mapPan };
  }

  onMapPointerMove(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    this.mapPan = {
      x: this.panStart.x + dx,
      y: this.panStart.y + dy
    };
  }

  onMapPointerUp(): void {
    this.isPointerDown = false;
  }

  onMapWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.mapZoom = Math.max(0.4, Math.min(6, this.mapZoom * factor));
  }

  openInFullPlotMap(order: any): void {
    if (!order?.site_id) return;
    const url = `/sites/${order.site_id}/plot-map?plot=${order.plot_id || order.plot_number}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      this.router.navigateByUrl(url);
    }
  }

  private inspectImageDimensions(url: string, callback: () => void): void {
    if (!url) {
      this.mapImageWidth = 2000;
      this.mapImageHeight = 1637;
      callback();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        this.mapImageWidth = img.naturalWidth;
        this.mapImageHeight = img.naturalHeight;
      }
      callback();
    };
    img.onerror = () => {
      this.mapImageWidth = 2000;
      this.mapImageHeight = 1637;
      callback();
    };
    img.src = url;
  }

  private processModalPlots(rawPlots: any[], order: any): void {
    this.sitePlots = rawPlots.map((plot: any) => {
      const coords = this.normalizeCoordinates(plot.polygon_coordinates, this.mapImageWidth, this.mapImageHeight);
      const svgPoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      const bbox = this.computeBoundingBox(coords);
      const centroid = this.computeCentroid(coords, plot.label_x, plot.label_y);

      const isTarget = Number(plot.plot_id) === Number(order.plot_id) ||
        (plot.plot_number && String(plot.plot_number).trim().toLowerCase() === String(order.plot_number).trim().toLowerCase());

      const processed = {
        ...plot,
        svgPoints,
        bbox,
        centroid,
        isTarget
      };

      if (isTarget) {
        this.targetPlotOnMap = processed;
      }

      return processed;
    });
  }

  private normalizeCoordinates(rawCoords: any[], width: number, height: number): Array<{ x: number; y: number }> {
    if (!Array.isArray(rawCoords) || rawCoords.length === 0) return [];
    let isPercent = true;
    for (const pt of rawCoords) {
      const px = Array.isArray(pt) ? Number(pt[0]) : Number(pt.x);
      const py = Array.isArray(pt) ? Number(pt[1]) : Number(pt.y);
      if (px > 100 || py > 100) {
        isPercent = false;
        break;
      }
    }
    return rawCoords.map(pt => {
      const px = Array.isArray(pt) ? Number(pt[0]) : Number(pt.x);
      const py = Array.isArray(pt) ? Number(pt[1]) : Number(pt.y);
      if (isPercent) {
        return {
          x: (px / 100) * width,
          y: (py / 100) * height
        };
      }
      return { x: px, y: py };
    });
  }

  private computeBoundingBox(points: Array<{ x: number; y: number }>): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  private computeCentroid(points: Array<{ x: number; y: number }>, labelX: number | null, labelY: number | null): { x: number; y: number } {
    if (labelX != null && labelY != null && !isNaN(labelX) && !isNaN(labelY)) {
      const lx = labelX <= 100 ? (labelX / 100) * this.mapImageWidth : labelX;
      const ly = labelY <= 100 ? (labelY / 100) * this.mapImageHeight : labelY;
      return { x: lx, y: ly };
    }
    if (!points.length) return { x: 0, y: 0 };
    let sumX = 0, sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  resolveImageUrl(img: string): string {
    if (!img) return '';
    if (/^https?:\/\//i.test(img)) return img;
    return this.api.url(img);
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
