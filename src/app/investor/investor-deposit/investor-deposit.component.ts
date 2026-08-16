import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-deposit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-deposit.component.html',
  styleUrls: ['./investor-deposit.component.css']
})
export class InvestorDepositComponent implements OnInit {
  deposits: any[] = [];
  loading = true;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  form = {
    amount: null,
    payment_method: 'manual_upi',
    gateway: 'razorpay',
    transaction_reference: '',
    payment_screenshot_url: ''
  };
  selectedScreenshot?: File;

  paymentMethods = [
    { value: 'online', label: 'Online Payment' },
    { value: 'manual_upi', label: 'Manual UPI Payment' }
  ];
  gateways = ['razorpay', 'cashfree'];
  companyUpiId = 'mmrconstructions@upi';
  companyQrUrl = 'assets/mmr-logo.png';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDeposits();
  }

  loadDeposits() {
    this.loading = true;
    this.api.getInvestorDeposits().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.deposits = res.data || [];
        }
      },
      error: (err: any) => {
        this.loading = false;
      }
    });
  }

  submitDeposit() {
    if (!this.form.amount || Number(this.form.amount) <= 0) {
      this.errorMessage = 'Please enter a valid deposit amount.';
      return;
    }
    if (this.form.payment_method === 'manual_upi' && !this.form.transaction_reference.trim()) {
      this.errorMessage = 'Transaction Reference / UTR Number is required.';
      return;
    }
    if (this.selectedScreenshot && this.selectedScreenshot.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Payment screenshot must be 5 MB or less.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = new FormData();
    payload.append('amount', String(this.form.amount));
    payload.append('payment_method', this.form.payment_method);
    payload.append('gateway', this.form.gateway);
    payload.append('transaction_reference', this.form.transaction_reference.trim());
    if (this.form.payment_screenshot_url.trim()) payload.append('payment_screenshot_url', this.form.payment_screenshot_url.trim());
    if (this.selectedScreenshot) payload.append('payment_screenshot', this.selectedScreenshot);

    this.api.submitInvestorDepositForm(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res.success) {
          this.successMessage = 'Deposit request submitted successfully! Status set to Pending awaiting admin approval.';
          this.form = {
            amount: null,
            payment_method: 'manual_upi',
            gateway: 'razorpay',
            transaction_reference: '',
            payment_screenshot_url: ''
          };
          this.selectedScreenshot = undefined;
          this.loadDeposits();
        } else {
          this.errorMessage = res.message || 'Deposit submission failed.';
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.errorMessage = err.error?.message || 'Failed to submit deposit request.';
      }
    });
  }

  onScreenshotChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedScreenshot = input.files?.[0];
  }

  getStatusBadge(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success-subtle text-success border-success';
      case 'rejected': return 'bg-danger-subtle text-danger border-danger';
      default: return 'bg-warning-subtle text-warning border-warning';
    }
  }
}
