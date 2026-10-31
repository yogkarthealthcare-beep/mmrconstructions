import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-withdrawal-release-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="confirm-dialog-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="confirm-dialog-box" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="cd-header">
          <div class="cd-header-left">
            <div class="cd-icon-badge">
              <i class="fas fa-paper-plane"></i>
            </div>
            <div>
              <h5 class="cd-title">Release Withdrawal Funds</h5>
              <div class="cd-subtitle">Confirm manual payout & record transaction reference</div>
            </div>
          </div>
          <button type="button" class="cd-close-btn" (click)="onCancel()" title="Close dialog">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="cd-body">
          <!-- Hero Payout Card -->
          <div class="amount-hero-card mb-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="hero-label">PAYOUT AMOUNT TO RELEASE</span>
                <div class="hero-amount">₹{{ amount | number:'1.2-2' }}</div>
              </div>
              <span class="hero-badge">
                <i class="fas fa-shield-alt me-1"></i> Verified
              </span>
            </div>

            <!-- Recipient Meta (if request supplied) -->
            <div class="beneficiary-summary mt-2 pt-2" *ngIf="request">
              <div class="meta-row">
                <span class="meta-label">Beneficiary:</span>
                <span class="meta-value fw-bold text-dark">
                  {{ request.user_name || 'Valued User' }}
                  <span *ngIf="request.user_role" class="user-role-pill ms-1">{{ request.user_role }}</span>
                </span>
              </div>
              <div class="meta-row" *ngIf="request.bank_name || request.bank_account_number">
                <span class="meta-label">Bank Details:</span>
                <span class="meta-value font-monospace">
                  {{ request.bank_name || 'Bank' }} • A/C: {{ request.bank_account_number || '-' }}
                  <span *ngIf="request.ifsc_code" class="text-muted">({{ request.ifsc_code }})</span>
                </span>
              </div>
              <div class="meta-row" *ngIf="request.upi_id">
                <span class="meta-label">UPI ID:</span>
                <span class="meta-value font-monospace text-primary fw-semibold">{{ request.upi_id }}</span>
              </div>
            </div>
          </div>

          <div class="notice-callout mb-3">
            <i class="fas fa-info-circle text-primary"></i>
            <span>
              Releasing this payout will deduct <strong>₹{{ amount | number:'1.2-2' }}</strong> from the user's pending balance and mark the payout as completed.
            </span>
          </div>

          <form [formGroup]="releaseForm" (ngSubmit)="onConfirm()">
            <!-- Payout Ref ID -->
            <div class="mb-3">
              <label for="payout_reference_id" class="form-label-custom">
                <i class="fas fa-hashtag text-emerald me-1"></i> Transaction / UTR / Reference ID <span class="text-danger">*</span>
              </label>
              <div class="input-group-custom" [class.has-error]="submitted && releaseForm.get('payout_reference_id')?.invalid">
                <span class="input-icon"><i class="fas fa-receipt"></i></span>
                <input
                  type="text"
                  id="payout_reference_id"
                  formControlName="payout_reference_id"
                  class="field-input"
                  placeholder="e.g. UTR / IMPS202610310001 / TXN-98432"
                  autocomplete="off"
                />
              </div>
              <div class="field-error" *ngIf="submitted && releaseForm.get('payout_reference_id')?.invalid">
                <i class="fas fa-exclamation-circle me-1"></i> Transaction reference ID / UTR is required.
              </div>
            </div>

            <!-- Remarks -->
            <div class="mb-1">
              <label for="remarks" class="form-label-custom">
                <i class="far fa-comment-dots text-muted me-1"></i> Admin Remarks <span class="text-muted fw-normal">(Optional)</span>
              </label>
              <textarea
                id="remarks"
                formControlName="remarks"
                class="field-textarea"
                rows="2"
                placeholder="e.g. Transferred via HDFC NetBanking IMPS"
              ></textarea>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="cd-footer">
          <button type="button" class="btn-cancel" (click)="onCancel()">
            Cancel
          </button>
          
          <button
            type="button"
            class="btn-confirm"
            (click)="onConfirm()"
            [disabled]="releaseForm.invalid"
          >
            <i class="fas fa-check-circle me-1"></i> Confirm Release
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog-overlay {
      position: fixed !important;
      inset: 0 !important;
      background: rgba(15, 23, 42, 0.65) !important;
      z-index: 100000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      backdrop-filter: blur(4px) !important;
      -webkit-backdrop-filter: blur(4px) !important;
      padding: 16px !important;
      animation: fadeIn 0.2s ease;
    }

    .confirm-dialog-box {
      position: relative !important;
      z-index: 100001 !important;
      background: #ffffff !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.28) !important;
      border: 1px solid #e2e8f0 !important;
      width: 100% !important;
      max-width: 460px !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      animation: scaleUp 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
    }

    .cd-header {
      background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #ffffff;
    }

    .cd-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cd-icon-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 13px;
      flex-shrink: 0;
    }

    .cd-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      line-height: 1.25;
    }

    .cd-subtitle {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.82);
      margin: 0;
      line-height: 1.2;
    }

    .cd-close-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.12);
      border: none;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .cd-close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .cd-body {
      padding: 16px 18px;
      background: #ffffff;
    }

    .amount-hero-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .hero-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #047857;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }

    .hero-amount {
      font-size: 22px;
      font-weight: 800;
      color: #065f46;
      line-height: 1.15;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .hero-badge {
      background: #dcfce7;
      color: #047857;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      border: 1px solid #86efac;
    }

    .beneficiary-summary {
      border-top: 1px dashed #bbf7d0;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      margin-top: 4px;
      gap: 8px;
    }

    .meta-label {
      color: #64748b;
      flex-shrink: 0;
    }

    .meta-value {
      color: #1e293b;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-role-pill {
      display: inline-block;
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: #e2e8f0;
      color: #334155;
    }

    .notice-callout {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 12px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11.5px;
      line-height: 1.45;
      color: #475569;
    }

    .notice-callout i {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .form-label-custom {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #475569;
      margin-bottom: 5px;
    }

    .text-emerald {
      color: #059669 !important;
    }

    .input-group-custom {
      display: flex;
      align-items: center;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      background: #ffffff;
      overflow: hidden;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .input-group-custom:focus-within {
      border-color: #059669;
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }

    .input-group-custom.has-error {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
    }

    .input-icon {
      padding: 7px 11px;
      background: #f8fafc;
      color: #64748b;
      font-size: 12px;
      border-right: 1px solid #e2e8f0;
      flex-shrink: 0;
    }

    .field-input {
      flex: 1;
      border: none;
      outline: none;
      padding: 7px 10px;
      font-size: 12.5px;
      color: #0f172a;
      font-family: inherit;
      background: transparent;
    }

    .field-input::placeholder {
      color: #94a3b8;
      font-size: 12px;
    }

    .field-error {
      color: #ef4444;
      font-size: 11px;
      margin-top: 4px;
      display: flex;
      align-items: center;
    }

    .field-textarea {
      width: 100%;
      border: 1.5px solid #cbd5e1;
      border-radius: 7px;
      padding: 7px 10px;
      font-size: 12px;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      resize: vertical;
      font-family: inherit;
    }

    .field-textarea:focus {
      border-color: #059669;
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }

    .cd-footer {
      background: #f8fafc;
      padding: 10px 18px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-cancel:hover {
      background: #f1f5f9;
      color: #1e293b;
    }

    .btn-confirm {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border: none;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 6px rgba(4, 120, 87, 0.28);
      transition: all 0.15s ease;
    }

    .btn-confirm:hover:not(:disabled) {
      filter: brightness(1.08);
      box-shadow: 0 4px 10px rgba(4, 120, 87, 0.35);
    }

    .btn-confirm:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { transform: scale(0.94); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class WithdrawalReleaseDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() amount = 0;
  @Input() request: any = null;
  @Output() confirm = new EventEmitter<{ payout_reference_id: string; remarks: string }>();
  @Output() cancel = new EventEmitter<void>();

  releaseForm: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder) {
    this.releaseForm = this.fb.group({
      payout_reference_id: ['', Validators.required],
      remarks: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.submitted = false;
      this.releaseForm.reset();
    }
  }

  onConfirm() {
    this.submitted = true;
    if (this.releaseForm.invalid) {
      this.releaseForm.markAllAsTouched();
      return;
    }
    this.confirm.emit({
      payout_reference_id: this.releaseForm.value.payout_reference_id,
      remarks: this.releaseForm.value.remarks || ''
    });
    this.releaseForm.reset();
    this.submitted = false;
  }

  onCancel() {
    this.cancel.emit();
    this.releaseForm.reset();
    this.submitted = false;
  }
}
