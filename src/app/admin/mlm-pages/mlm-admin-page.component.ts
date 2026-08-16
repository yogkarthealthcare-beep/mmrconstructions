import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CommissionNotesComponent } from '../../shared/commission-notes/commission-notes.component';

@Component({
  selector: 'app-mlm-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CommissionNotesComponent],
  templateUrl: './mlm-admin-page.component.html',
  styleUrls: ['./mlm-admin-page.component.css']
})
export class MlmAdminPageComponent implements OnInit {
  mode = '';
  title = '';
  loading = false;
  toast = '';
  items: any[] = [];
  report: any = {};
  selected: any = null;
  form: any = {};
  filterStatus = '';
  currentPage = 1;
  pageSize = 10;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.route.data.subscribe(data => {
      this.mode = data['mode'] || 'reports';
      this.title = data['title'] || 'MLM Management';
      this.resetForm();
      this.load();
    });
  }

  load() {
    this.loading = true;
    const done = () => this.loading = false;
    const fail = (e: any) => { this.toast = e?.error?.message || 'Unable to load data'; done(); };
    const next = (res: any) => {
      const data = res?.data || {};
      if (this.mode === 'reports') this.report = data;
      else this.items = Array.isArray(data) ? data : (data.items || []);
      this.ensureValidPage();
      done();
    };

    if (this.mode === 'rules') this.api.adminGetCommissionRules().subscribe({ next, error: fail });
    else if (this.mode === 'ranks') this.api.adminGetRanks().subscribe({ next, error: fail });
    else if (this.mode === 'payouts') this.api.adminGetPayoutRequests({ status: this.filterStatus }).subscribe({ next, error: fail });
    else if (this.mode === 'commissions') this.api.adminGetCommissions({ status: this.filterStatus }).subscribe({ next, error: fail });
    else this.api.adminGetMlmReports().subscribe({ next, error: fail });
  }

  edit(item: any) {
    this.selected = item;
    this.form = { ...item };
  }

  resetForm() {
    this.selected = null;
    this.form = this.mode === 'ranks'
      ? { rank_name: '', min_direct_sales_gaj: 0, min_total_network_sales_gaj: 0, commission_multiplier: 1, is_active: true }
      : { commission_type: 'Direct', level_depth: 1, plot_area_unit: 'gaj', amount_per_100_gaj: 600, duration_months: 144, is_active: true };
  }

  get paginatedItems(): any[] {
    if (this.mode !== 'rules') return this.items;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    const start = Math.max(1, Math.min(this.currentPage - 2, this.totalPages - 4));
    const end = Math.min(this.totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  get pageStart(): number {
    return this.items.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.items.length);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.ensureValidPage();
  }

  private ensureValidPage(): void {
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
  }

  saveRuleOrRank() {
    const request = this.mode === 'ranks'
      ? (this.selected ? this.api.adminUpdateRank(this.selected.rank_id, this.form) : this.api.adminCreateRank(this.form))
      : (this.selected ? this.api.adminUpdateCommissionRule(this.selected.rule_id, this.form) : this.api.adminCreateCommissionRule(this.form));
    request.subscribe({
      next: () => { this.toast = 'Saved successfully'; this.resetForm(); this.load(); },
      error: (e) => this.toast = e?.error?.message || 'Save failed'
    });
  }

  approveCommission(item: any) {
    const ref = prompt('Payment reference') || '';
    this.api.adminApproveComm(item.commission_id, ref).subscribe({ next: () => this.load() });
  }

  rejectCommission(item: any) {
    const reason = prompt('Reject/Hold reason') || 'Rejected by admin';
    this.api.adminRejectComm(item.commission_id, reason).subscribe({ next: () => this.load() });
  }

  adjustCommission(item: any) {
    const amount = Number(prompt('New commission amount', item.net_amount));
    if (!Number.isFinite(amount)) return;
    this.api.adminAdjustComm(item.commission_id, amount, 'Manual adjustment').subscribe({ next: () => this.load() });
  }

  payoutAction(item: any, action: 'approve'|'reject'|'pay') {
    const payment_reference = action === 'pay' ? (prompt('Payment reference') || '') : '';
    const admin_note = action !== 'pay' ? (prompt('Admin note') || '') : '';
    this.api.adminProcessPayout(item.payout_id, action, { payment_reference, admin_note }).subscribe({ next: () => this.load() });
  }
}
