import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

type CommissionModel = 'Upline' | 'LevelWise' | 'EqualDistribution';

@Component({
  selector: 'app-commission-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commission-settings.component.html',
  styleUrls: ['./commission-settings.component.css'],
})
export class CommissionSettingsComponent implements OnInit {
  loading = true;
  saving = false;
  toast = '';
  error = '';
  showConfirm = false;
  reason = '';
  settings: any = this.emptySettings();
  audit: any[] = [];
  previewAmount = 100000;
  previewParticipants = 11;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.adminGetCommissionEngineSettings().subscribe({
      next: (res: any) => {
        this.settings = {
          ...this.emptySettings(),
          ...(res?.data || {}),
          eligibility_rules: {
            ...this.emptySettings().eligibility_rules,
            ...(res?.data?.eligibility_rules || {}),
          },
          bonus_rules: res?.data?.bonus_rules || {},
          levels: (res?.data?.levels || []).map((item: any) => ({ ...item })),
        };
        this.syncLevels();
        this.loading = false;
      },
      error: (error: any) => {
        this.error = error?.error?.message || 'Commission settings could not be loaded.';
        this.loading = false;
      },
    });
    this.api.adminGetCommissionEngineAudit({ limit: 10 }).subscribe({
      next: (res: any) => this.audit = res?.data?.items || [],
      error: () => this.audit = [],
    });
  }

  syncLevels(): void {
    const maximum = Math.max(1, Number(this.settings.maximum_levels || 1));
    const existing = new Map((this.settings.levels || []).map((item: any) => [Number(item.level_no), item]));
    this.settings.levels = Array.from({ length: maximum }, (_, index) => {
      const levelNo = index + 1;
      return existing.get(levelNo) || { level_no: levelNo, percentage: 0, is_active: true };
    });
  }

  requestSave(): void {
    this.error = '';
    this.reason = '';
    this.showConfirm = true;
  }

  confirmSave(): void {
    if (!this.reason.trim()) {
      this.error = 'Change reason is required.';
      return;
    }
    this.saving = true;
    const payload = {
      ...this.settings,
      confirmed: true,
      reason: this.reason.trim(),
      levels: this.settings.commission_model === 'LevelWise' ? this.settings.levels : [],
    };
    this.api.adminUpdateCommissionEngineSettings(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.showConfirm = false;
        this.toast = res?.message || 'Commission settings saved.';
        window.setTimeout(() => this.toast = '', 4000);
        this.load();
      },
      error: (error: any) => {
        this.saving = false;
        this.error = error?.error?.message || 'Commission settings could not be saved.';
      },
    });
  }

  modelLabel(value: string): string {
    if (value === 'LevelWise') return 'Level Wise';
    if (value === 'EqualDistribution') return 'Equal Distribution';
    return 'Upline';
  }

  get sellerPreview(): number {
    return this.roundMoney(Number(this.previewAmount || 0) * Number(this.settings.seller_percentage || 0) / 100);
  }

  get equalPoolPreview(): number {
    return this.roundMoney(Number(this.previewAmount || 0) * Number(this.settings.equal_distribution_percentage || 0) / 100);
  }

  get perParticipantPreview(): number {
    const count = Math.max(1, Number(this.previewParticipants || 1));
    return this.roundMoney(this.equalPoolPreview / count);
  }

  private roundMoney(value: number): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  private emptySettings(): any {
    return {
      commission_model: 'EqualDistribution' as CommissionModel,
      maximum_levels: 3,
      direct_percentage: 10,
      upline_percentage: 2,
      seller_percentage: 50,
      equal_distribution_percentage: 50,
      equal_distribution_enabled: true,
      distribution_scope: 'TopAssociateNetwork',
      payment_mode_rules: {
        full_payment: 'instant',
        emi: 'installment_wise',
      },
      eligibility_rules: {
        require_active_associate: true,
        exclude_blacklisted: true,
        minimum_plot_amount: 0,
        minimum_payment_amount: 0,
      },
      bonus_rules: {},
      is_active: true,
      levels: [],
    };
  }
}
