import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-emi-calculator-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './emi-calculator-mgmt.component.html',
  styleUrls: ['./emi-calculator-mgmt.component.css']
})
export class EmiCalculatorMgmtComponent implements OnInit {
  plans: any[] = [];
  loading = false;
  saving = false;
  toast = '';
  toastType: 'success' | 'error' = 'success';
  editingId: number | null = null;

  search = '';
  status = '';
  sortBy = 'display_order';
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;

  form = this.fb.group({
    plot_size: ['', [Validators.required, Validators.maxLength(120)]],
    plot_price: [0, [Validators.required, Validators.min(0)]],
    down_payment: [0, [Validators.required, Validators.min(0)]],
    loan_amount: [{ value: 0, disabled: true }],
    interest_rate: [0, [Validators.required, Validators.min(0)]],
    tenure_months: [60, [Validators.required, Validators.min(1)]],
    monthly_emi: [{ value: 0, disabled: true }],
    processing_fee: [0, [Validators.min(0)]],
    display_order: [0],
    is_active: [true],
  });

  constructor(private api: ApiService, private fb: FormBuilder) {}

  ngOnInit() {
    this.loadPlans();
    this.form.valueChanges.subscribe(() => this.recalculate());
  }

  get rawForm() {
    return this.form.getRawValue();
  }

  loadPlans() {
    this.loading = true;
    this.api.adminGetEmiCalculatorPlans({
      search: this.search,
      status: this.status,
      sort_by: this.sortBy,
      sort_dir: this.sortDir,
      page: this.page,
      limit: this.limit,
    }).subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.plans = data.items || [];
        this.total = data.total || 0;
        this.totalPages = data.total_pages || 1;
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.showToast(e?.error?.message || 'Unable to load EMI plans', 'error');
      }
    });
  }

  savePlan() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('Please fill required EMI plan fields.', 'error');
      return;
    }
    const payload = this.rawForm;
    if (Number(payload.down_payment) > Number(payload.plot_price)) {
      this.showToast('Down payment cannot be greater than plot price.', 'error');
      return;
    }

    this.saving = true;
    const request = this.editingId
      ? this.api.adminUpdateEmiCalculatorPlan(this.editingId, payload)
      : this.api.adminCreateEmiCalculatorPlan(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.showToast(this.editingId ? 'EMI plan updated' : 'EMI plan created');
        this.resetForm();
        this.loadPlans();
      },
      error: (e) => {
        this.saving = false;
        const status = e?.status ? ` (${e.status})` : '';
        this.showToast(`${e?.error?.message || e?.message || 'Unable to save EMI plan'}${status}`, 'error');
      }
    });
  }

  editPlan(plan: any) {
    this.editingId = plan.id;
    this.form.patchValue({
      plot_size: plan.plot_size || '',
      plot_price: Number(plan.plot_price || 0),
      down_payment: Number(plan.down_payment || 0),
      loan_amount: Number(plan.loan_amount || 0),
      interest_rate: Number(plan.interest_rate || 0),
      tenure_months: Number(plan.tenure_months || 60),
      monthly_emi: Number(plan.monthly_emi || 0),
      processing_fee: Number(plan.processing_fee || 0),
      display_order: Number(plan.display_order || 0),
      is_active: plan.is_active !== false,
    });
    this.recalculate();
  }

  deletePlan(plan: any) {
    if (!confirm(`Delete EMI plan "${plan.plot_size}"?`)) return;
    this.api.adminDeleteEmiCalculatorPlan(plan.id).subscribe({
      next: () => {
        this.showToast('EMI plan deleted');
        if (this.editingId === plan.id) this.resetForm();
        this.loadPlans();
      },
      error: (e) => this.showToast(e?.error?.message || 'Unable to delete EMI plan', 'error')
    });
  }

  resetForm() {
    this.editingId = null;
    this.form.reset({
      plot_size: '',
      plot_price: 0,
      down_payment: 0,
      loan_amount: 0,
      interest_rate: 0,
      tenure_months: 60,
      monthly_emi: 0,
      processing_fee: 0,
      display_order: 0,
      is_active: true,
    });
  }

  recalculate() {
    const raw = this.rawForm;
    const plotPrice = Number(raw.plot_price || 0);
    const downPayment = Number(raw.down_payment || 0);
    const tenure = Number(raw.tenure_months || 0);
    const annualRate = Number(raw.interest_rate || 0);
    const loanAmount = Math.max(plotPrice - downPayment, 0);
    let monthlyEmi = 0;
    if (loanAmount > 0 && tenure > 0) {
      const monthlyRate = annualRate / 12 / 100;
      if (monthlyRate > 0) {
        const factor = Math.pow(1 + monthlyRate, tenure);
        monthlyEmi = loanAmount * monthlyRate * factor / (factor - 1);
      } else {
        monthlyEmi = loanAmount / tenure;
      }
    }
    this.form.patchValue({
      loan_amount: Number(loanAmount.toFixed(2)),
      monthly_emi: Number(monthlyEmi.toFixed(2)),
    }, { emitEvent: false });
  }

  sort(column: string) {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDir = 'asc';
    }
    this.loadPlans();
  }

  reloadFromFirstPage() {
    this.page = 1;
    this.loadPlans();
  }

  setPage(next: number) {
    if (next < 1 || next > this.totalPages) return;
    this.page = next;
    this.loadPlans();
  }

  money(value: any) {
    return Number(value || 0);
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast = message;
    this.toastType = type;
    setTimeout(() => {
      if (this.toast === message) this.toast = '';
    }, 3200);
  }
}
