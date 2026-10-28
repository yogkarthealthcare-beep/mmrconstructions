import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { BankDetailsComponent } from '../../shared/components/bank-details/bank-details.component';

@Component({
  selector: 'app-investor-deposit',
  standalone: true,
  imports: [CommonModule, FormsModule, BankDetailsComponent],
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

  // Payment methods without online gateway
  paymentMethods = [
    { value: 'manual_upi', label: 'UPI Payment (QR Code / UPI ID)' },
    { value: 'bank_transfer', label: 'Bank Transfer (IMPS / NEFT / RTGS)' },
    { value: 'offline_cash', label: 'Cheque / DD / Cash (Office Deposit)' }
  ];

  // Dynamic UPI QR configs fetched from backend
  activeQrs: any[] = [];
  selectedQrKey: string = 'qr1';
  companyUpiId = 'mmrconstructions@hdfcbank';
  companyQrUrl = '/assets/images/qr/mmr_qr1.png';
  companyQrLabel = 'Primary UPI QR (HDFC Bank)';
  copiedUpi = false;

  // Screenshot / Camera photo selection
  selectedScreenshot?: File;
  screenshotPreviewUrl: string = '';

  // Lightbox preview for deposit history
  previewDocUrl: string | null = null;

  constructor(public api: ApiService) {}

  ngOnInit() {
    this.loadDeposits();
    this.loadActiveUpiQrs();
  }

  loadActiveUpiQrs() {
    this.api.get('/api/payment/active-upi-qrs').subscribe({
      next: (res: any) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.activeQrs = res.data;
          const primary = res.data.find((q: any) => q.is_primary) || res.data[0];
          if (primary) {
            this.applyQrConfig(primary);
          }
        }
      },
      error: () => {}
    });
  }

  applyQrConfig(qr: any) {
    this.selectedQrKey = qr.qr_code_key || 'qr1';
    if (qr.upi_id) this.companyUpiId = qr.upi_id;
    if (qr.qr_image_url) this.companyQrUrl = this.api.getFileUrl(qr.qr_image_url);
    if (qr.label) this.companyQrLabel = qr.label;
  }

  selectQr(qr: any) {
    this.applyQrConfig(qr);
  }

  copyUpiId() {
    navigator.clipboard.writeText(this.companyUpiId).then(() => {
      this.copiedUpi = true;
      setTimeout(() => this.copiedUpi = false, 2500);
    }).catch(() => {});
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
      error: () => {
        this.loading = false;
      }
    });
  }

  onScreenshotChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'फाइल 5 MB से कम होनी चाहिए (Screenshot/file must be 5 MB or less).';
      input.value = '';
      return;
    }

    this.selectedScreenshot = file;
    this.errorMessage = '';

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.screenshotPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.screenshotPreviewUrl = '';
    }
  }

  clearScreenshot(cameraInput?: HTMLInputElement, fileInput?: HTMLInputElement) {
    this.selectedScreenshot = undefined;
    this.screenshotPreviewUrl = '';
    if (cameraInput) cameraInput.value = '';
    if (fileInput) fileInput.value = '';
  }

  submitDeposit() {
    if (!this.form.amount || Number(this.form.amount) <= 0) {
      this.errorMessage = 'Please enter a valid deposit amount greater than zero.';
      return;
    }
    if (!this.form.transaction_reference.trim()) {
      const isCheque = this.form.payment_method === 'offline_cash';
      this.errorMessage = isCheque 
        ? 'Please enter Cheque Number / DD Number / Receipt Slip Number.'
        : 'Transaction Reference / UTR Number is required.';
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
    payload.append('transaction_reference', this.form.transaction_reference.trim());
    if (this.selectedScreenshot) {
      payload.append('payment_screenshot', this.selectedScreenshot);
    }

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
          this.screenshotPreviewUrl = '';
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

  getProofUrl(dep: any): string {
    if (!dep) return '';
    if (dep.payment_screenshot_url) {
      return this.api.getFileUrl(dep.payment_screenshot_url);
    }
    return `${this.api.getFileUrl(`/api/investor/deposits/${dep.id}/screenshot`)}`;
  }

  openPreview(url: string) {
    this.previewDocUrl = url;
  }

  closePreview() {
    this.previewDocUrl = null;
  }

  getStatusBadge(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success-subtle text-success border-success';
      case 'rejected': return 'bg-danger-subtle text-danger border-danger';
      default: return 'bg-warning-subtle text-warning border-warning';
    }
  }
}
