import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-withdrawal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-withdrawal.component.html',
  styleUrls: ['./investor-withdrawal.component.css']
})
export class InvestorWithdrawalComponent implements OnInit {
  withdrawals: any[] = [];
  availableBalance = 0;
  profile: any = null;

  loading = true;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  form = {
    amount: null,
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    remarks: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.api.getInvestorProfile().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.profile = res.data;
          this.availableBalance = Number(res.data.available_balance || 0);
          this.form.bank_name = res.data.bank_name || '';
          this.form.account_number = res.data.account_number || '';
          this.form.ifsc_code = res.data.ifsc_code || '';
        }
      }
    });

    this.api.getInvestorWithdrawals().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.withdrawals = res.data || [];
        }
      },
      error: (err: any) => {
        this.loading = false;
      }
    });
  }

  submitWithdrawal() {
    const numAmount = Number(this.form.amount);

    if (!numAmount || numAmount <= 0) {
      this.errorMessage = 'Please enter a valid withdrawal amount.';
      return;
    }

    if (numAmount > this.availableBalance) {
      this.errorMessage = `Withdrawal amount (₹${numAmount}) cannot exceed your available balance of ₹${this.availableBalance.toFixed(2)}.`;
      return;
    }

    if (!this.form.account_number.trim() || !this.form.ifsc_code.trim()) {
      this.errorMessage = 'Bank Account Number and IFSC Code are required.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.submitInvestorWithdrawal({
      amount: numAmount,
      bank_name: this.form.bank_name,
      account_number: this.form.account_number.trim(),
      ifsc_code: this.form.ifsc_code.trim().toUpperCase(),
      remarks: this.form.remarks.trim()
    }).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res.success) {
          this.successMessage = 'Withdrawal request submitted successfully! Pending admin processing.';
          this.form.amount = null;
          this.form.remarks = '';
          this.loadData();
        } else {
          this.errorMessage = res.message || 'Withdrawal submission failed.';
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to submit withdrawal request.';
      }
    });
  }

  getStatusBadge(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success-subtle text-success border-success';
      case 'rejected': return 'bg-danger-subtle text-danger border-danger';
      default: return 'bg-warning-subtle text-warning border-warning';
    }
  }
}
