import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent],
  templateUrl: './commissions.component.html',
  styleUrls: ['./commissions.component.css']
})
export class CommissionsComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

  loading = true;
  statusFilter = 'all';
  search = '';
  commissions: any[] = [];
  toast = '';
  actionLoading = false;
  activeRowId: any = null;

  // Pagination state
  page = 1;
  pageSize = 10;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }

  // Selected Commission for Modals
  selectedComm: any = null;
  paymentRef = '';
  rejectReason = '';

  showApproveModal = false;
  showRejectModal = false;

  // MMR Commission Plan State
  planLoading = false;
  planSaving = false;
  showPlanModal = false;
  showSimDrawer = false;
  commissionPlan: any = {
    plan_name: 'MMR 10-Member Team Dynamic Commission Plan',
    is_active: true,
    commission_model: 'FlatTeam',
    total_commission_percentage: 10,
    seller_percentage: 50,
    team_pool_percentage: 50,
    effective_seller_percentage: 5.0,
    effective_team_pool_percentage: 5.0,
    version: 1
  };
  editPlanForm: any = {
    total_commission_percentage: 10,
    seller_percentage: 50,
    team_pool_percentage: 50,
    is_active: true,
    reason: ''
  };

  // Interactive Live Simulation State
  simPlotAmount: number = 1000000; // ₹10,00,000 default
  simParticipantCount: number = 10; // 10 members default

  constructor() {}

  get simTotalCommission(): number {
    const rate = Number(this.commissionPlan?.total_commission_percentage ?? 10);
    return Math.round(((Number(this.simPlotAmount) || 0) * rate / 100) * 100) / 100;
  }

  get simSellerAmount(): number {
    const sellerShare = Number(this.commissionPlan?.seller_percentage ?? 50);
    return Math.round((this.simTotalCommission * sellerShare / 100) * 100) / 100;
  }

  get simRemainingPool(): number {
    const poolShare = Number(this.commissionPlan?.team_pool_percentage ?? 50);
    return Math.round((this.simTotalCommission * poolShare / 100) * 100) / 100;
  }

  get simEachParticipantShare(): number {
    const count = Math.max(Number(this.simParticipantCount) || 1, 1);
    return Math.floor((this.simRemainingPool / count) * 100) / 100;
  }

  get simEachParticipantPercentageOfPool(): number {
    const count = Math.max(Number(this.simParticipantCount) || 1, 1);
    const poolShare = Number(this.commissionPlan?.team_pool_percentage ?? 50);
    return Number((poolShare / count).toFixed(2));
  }

  get simEachParticipantPercentageOfSale(): number {
    const totalRate = Number(this.commissionPlan?.total_commission_percentage ?? 10);
    const poolShare = Number(this.commissionPlan?.team_pool_percentage ?? 50);
    const count = Math.max(Number(this.simParticipantCount) || 1, 1);
    return Number(((totalRate * poolShare / 100) / count).toFixed(3));
  }

  get pagedCommissions(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedCommissions : this.filtered;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Associate Name', key: 'assoc_name', width: 22 },
      { header: 'Associate ID', key: 'member_id_display', width: 14 },
      { header: 'Role / Type', key: 'commission_type', width: 20 },
      { header: 'Seller', key: 'seller_display', width: 20 },
      { header: 'Net Amount (Rs.)', key: 'amount_display', width: 16 },
      { header: 'Plot / Project', key: 'plot_display', width: 20 },
      { header: 'UTR / Ref', key: 'payment_ref_display', width: 18 },
      { header: 'Status', key: 'status_display', width: 14 }
    ];

    const formatted = list.map((c, idx) => ({
      ...c,
      _sno: baseIndex + idx + 1,
      assoc_name: c.associate_name || c.full_name || 'N/A',
      member_id_display: c.member_id || 'N/A',
      commission_type: c.distribution_role ? `${c.distribution_role} (${c.commission_percentage || 0}%)` : (c.commission_type || 'Referral Commission'),
      seller_display: c.seller_name ? `${c.seller_name} (${c.seller_member_id || '—'})` : '—',
      amount_display: Number(c.net_amount || c.commission_amount || c.amount || 0).toLocaleString(),
      plot_display: c.plot_number ? `Plot #${c.plot_number} (${c.site_name || ''})` : (c.site_name || c.booking_serial || 'Direct Sale'),
      payment_ref_display: c.payment_reference || 'N/A',
      status_display: c.commission_status || 'Pending'
    }));

    const title = mode === 'current' ? `Commissions (Page ${this.page})` : 'All Associate Commission Records';
    const filename = `commissions_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

  ngOnInit() {
    this.load();
    this.loadCommissionPlan();
  }

  load() {
    this.loading = true;
    this.api.adminGetCommissions().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.commissions = res.data.commissions || res.data || [];
        } else {
          this.fetchPendingFallback();
        }
        this.loading = false;
      },
      error: () => {
        this.fetchPendingFallback();
      }
    });
  }

  fetchPendingFallback() {
    this.api.adminGetPendingComm().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.commissions = res.data || [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get pendingCount(): number {
    return this.commissions.filter(c => c.commission_status === 'Pending' || c.status === 'Pending').length;
  }

  get paidCount(): number {
    return this.commissions.filter(c => c.commission_status === 'Paid' || c.status === 'Paid' || c.commission_status === 'Approved').length;
  }

  get totalPendingAmount(): number {
    return this.commissions
      .filter(c => c.commission_status === 'Pending' || c.status === 'Pending')
      .reduce((sum, c) => sum + Number(c.commission_amount || c.amount || 0), 0);
  }

  get totalPaidAmount(): number {
    return this.commissions
      .filter(c => c.commission_status === 'Paid' || c.status === 'Paid' || c.commission_status === 'Approved')
      .reduce((sum, c) => sum + Number(c.commission_amount || c.amount || 0), 0);
  }

  get filtered(): any[] {
    return this.commissions.filter(c => {
      const status = (c.commission_status || c.status || '').toLowerCase();
      const matchFilter =
        this.statusFilter === 'all' ? true :
        status === this.statusFilter.toLowerCase();

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        c.associate_name?.toLowerCase().includes(q) ||
        c.full_name?.toLowerCase().includes(q) ||
        c.mobile_no?.includes(q) ||
        c.member_id?.toLowerCase().includes(q) ||
        c.plot_number?.toString().toLowerCase().includes(q) ||
        c.payment_reference?.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }

  openApproveModal(c: any) {
    this.selectedComm = c;
    this.paymentRef = '';
    this.showApproveModal = true;
  }

  confirmApprove() {
    if (!this.selectedComm) return;
    this.actionLoading = true;
    this.api.adminApproveComm(this.selectedComm.commission_id, this.paymentRef).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectedComm.commission_status = 'Paid';
          this.selectedComm.payment_reference = this.paymentRef;
          this.showToast(`Commission ₹${this.selectedComm.commission_amount || this.selectedComm.amount} approved and marked Paid!`);
          this.closeModals();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to approve commission');
        this.actionLoading = false;
      }
    });
  }

  openRejectModal(c: any) {
    this.selectedComm = c;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  confirmReject() {
    if (!this.selectedComm) return;
    this.actionLoading = true;
    this.api.adminRejectComm(this.selectedComm.commission_id, this.rejectReason).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectedComm.commission_status = 'Rejected';
          this.showToast('Commission payout rejected');
          this.closeModals();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to reject commission');
        this.actionLoading = false;
      }
    });
  }

  loadCommissionPlan() {
    this.planLoading = true;
    this.api.adminGetCommissionPlan().subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.commissionPlan = res.data;
        }
        this.planLoading = false;
      },
      error: () => {
        this.planLoading = false;
      }
    });
  }

  openEditPlanModal() {
    this.editPlanForm = {
      total_commission_percentage: Number(this.commissionPlan?.total_commission_percentage ?? 10),
      seller_percentage: Number(this.commissionPlan?.seller_percentage ?? 50),
      team_pool_percentage: Number(this.commissionPlan?.team_pool_percentage ?? 50),
      is_active: this.commissionPlan?.is_active !== false,
      reason: 'Admin updated MMR commission plan percentages'
    };
    this.showPlanModal = true;
  }

  onSellerPercentageChange() {
    const seller = Number(this.editPlanForm.seller_percentage) || 0;
    if (seller >= 0 && seller <= 100) {
      this.editPlanForm.team_pool_percentage = Math.round((100 - seller) * 100) / 100;
    }
  }

  saveCommissionPlan() {
    if (this.editPlanForm.total_commission_percentage <= 0 || this.editPlanForm.total_commission_percentage > 100) {
      this.showToast('Please enter a valid total commission percentage (1-100%)');
      return;
    }
    this.planSaving = true;
    this.api.adminUpdateCommissionPlan(this.editPlanForm).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.commissionPlan = res.data;
          this.showToast('Commission Plan settings & percentages saved successfully!');
          this.showPlanModal = false;
        } else {
          this.showToast(res?.message || 'Failed to update commission plan');
        }
        this.planSaving = false;
      },
      error: (err: any) => {
        this.showToast(err?.error?.message || 'Error updating commission plan');
        this.planSaving = false;
      }
    });
  }

  closeModals() {
    this.showApproveModal = false;
    this.showRejectModal = false;
    this.showPlanModal = false;
    this.showAddPlanModal = false;
    this.showEditInstallmentModal = false;
  }

  // ── M2: INSTALLMENT & PAYMENT PLANS TAB STATE ──────────────────
  activeTab: 'commissions' | 'plans' = 'commissions';
  installmentPlans: any[] = [];
  plansLoading = false;
  paymentPlanSettings: any = { part_wise_deadline_months: 3 };
  savingSettings = false;
  showAddPlanModal = false;
  showEditInstallmentModal = false;
  savingPlan = false;

  newPlanForm: any = {
    tenure_months: 12,
    interest_percent: 5,
    down_payment_percent: 20,
    sort_order: 1,
    reason: 'Initial creation of installment plan'
  };

  editInstallmentForm: any = {
    id: 0,
    tenure_months: 12,
    interest_percent: 5,
    down_payment_percent: 20,
    is_active: true,
    sort_order: 1,
    reason: 'Admin updated installment plan'
  };

  // Interactive Live Plan Calculator State
  planSimPrice: number = 1000000;
  selectedSimPlanId: number = 0;
  planSimResult: any = null;
  planSimLoading = false;

  switchTab(tab: 'commissions' | 'plans') {
    this.activeTab = tab;
    if (tab === 'plans') {
      this.loadInstallmentPlans();
      this.loadPaymentPlanSettings();
    }
  }

  loadInstallmentPlans() {
    this.plansLoading = true;
    this.api.adminGetInstallmentPlans().subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.installmentPlans = res.data;
          if (!this.selectedSimPlanId && this.installmentPlans.length > 0) {
            this.selectedSimPlanId = this.installmentPlans[0].id;
            this.runPlanPreview();
          }
        }
        this.plansLoading = false;
      },
      error: () => {
        this.plansLoading = false;
      }
    });
  }

  loadPaymentPlanSettings() {
    this.api.adminGetPaymentPlanSettings().subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.paymentPlanSettings = res.data;
        }
      }
    });
  }

  savePaymentPlanSettings() {
    const months = Number(this.paymentPlanSettings.part_wise_deadline_months);
    if (!months || months < 1 || months > 24) {
      this.showToast('Please enter a valid deadline between 1 and 24 months.');
      return;
    }
    this.savingSettings = true;
    this.api.adminUpdatePaymentPlanSettings({
      part_wise_deadline_months: months,
      reason: 'Admin updated part-wise payment deadline duration'
    }).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.showToast('Part-wise payment deadline setting updated successfully!');
        } else {
          this.showToast(res?.message || 'Failed to update settings');
        }
        this.savingSettings = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Error updating settings');
        this.savingSettings = false;
      }
    });
  }

  openCreatePlanModal() {
    this.newPlanForm = {
      tenure_months: 12,
      interest_percent: 5,
      down_payment_percent: 20,
      sort_order: (this.installmentPlans.length + 1),
      reason: 'Admin added new installment tenure plan'
    };
    this.showAddPlanModal = true;
  }

  createInstallmentPlan() {
    if (!this.newPlanForm.tenure_months || this.newPlanForm.tenure_months < 1) {
      this.showToast('Please enter a valid tenure in months.');
      return;
    }
    this.savingPlan = true;
    this.api.adminCreateInstallmentPlan(this.newPlanForm).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.showToast('New installment plan created successfully!');
          this.showAddPlanModal = false;
          this.loadInstallmentPlans();
        } else {
          this.showToast(res?.message || 'Failed to create plan');
        }
        this.savingPlan = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Error creating plan');
        this.savingPlan = false;
      }
    });
  }

  openEditInstallmentPlanModal(plan: any) {
    this.editInstallmentForm = {
      id: plan.id,
      tenure_months: plan.tenure_months,
      interest_percent: Number(plan.interest_percent),
      down_payment_percent: Number(plan.down_payment_percent),
      is_active: plan.is_active !== false,
      sort_order: Number(plan.sort_order || 0),
      reason: 'Admin updated plan percentages'
    };
    this.showEditInstallmentModal = true;
  }

  updateInstallmentPlan() {
    this.savingPlan = true;
    this.api.adminUpdateInstallmentPlan(this.editInstallmentForm.id, this.editInstallmentForm).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.showToast('Installment plan updated successfully!');
          this.showEditInstallmentModal = false;
          this.loadInstallmentPlans();
        } else {
          this.showToast(res?.message || 'Failed to update plan');
        }
        this.savingPlan = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Error updating plan');
        this.savingPlan = false;
      }
    });
  }

  toggleInstallmentPlanActive(plan: any) {
    const nextState = !plan.is_active;
    this.api.adminUpdateInstallmentPlan(plan.id, {
      interest_percent: Number(plan.interest_percent),
      down_payment_percent: Number(plan.down_payment_percent),
      is_active: nextState,
      sort_order: Number(plan.sort_order || 0),
      reason: `Admin ${nextState ? 'activated' : 'deactivated'} ${plan.tenure_months}M plan`
    }).subscribe({
      next: (res: any) => {
        if (res?.success) {
          plan.is_active = nextState;
          this.showToast(`Plan marked ${nextState ? 'Active' : 'Inactive'}`);
        }
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Error toggling plan state');
      }
    });
  }

  runPlanPreview() {
    if (!this.selectedSimPlanId) return;
    this.planSimLoading = true;
    this.api.previewInstallmentPlan({
      plan_id: Number(this.selectedSimPlanId),
      custom_price: Number(this.planSimPrice || 1000000)
    }).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) {
          this.planSimResult = res.data;
        }
        this.planSimLoading = false;
      },
      error: () => {
        this.planSimLoading = false;
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'A';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
