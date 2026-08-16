import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
          <h5>Release Withdrawal Funds</h5>
          <button class="cd-close-btn bg-none border-0" (click)="onCancel()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="cd-body">
          <p class="mb-3">Confirm manual payout release for <strong>₹{{ amount | number:'1.2-2' }}</strong>. This will deduct the amount from the user's pending balance and record the payout as successfully completed.</p>
          <form [formGroup]="releaseForm">
            <!-- Payout Ref ID -->
            <div class="mb-3">
              <label for="payout_reference_id" class="form-label fs-12 fw-bold text-muted uppercase">Transaction / Reference ID*</label>
              <input
                type="text"
                id="payout_reference_id"
                formControlName="payout_reference_id"
                class="form-control form-control-sm"
                placeholder="Enter bank transaction ref / IMPS UTR"
                [class.is-invalid]="submitted && releaseForm.get('payout_reference_id')?.invalid"
              />
              <div class="invalid-feedback" *ngIf="submitted && releaseForm.get('payout_reference_id')?.invalid">
                Transaction reference ID is required.
              </div>
            </div>

            <!-- Remarks -->
            <div class="mb-2">
              <label for="remarks" class="form-label fs-12 fw-bold text-muted uppercase">Admin Remarks (Optional)</label>
              <textarea
                id="remarks"
                formControlName="remarks"
                class="form-control form-control-sm"
                rows="2"
                placeholder="E.g. Sent via IMPS transfer."
              ></textarea>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="cd-footer">
          <button class="btn btn-outline-green btn-sm" (click)="onCancel()">
            Cancel
          </button>
          
          <button class="btn btn-green btn-sm" (click)="onConfirm()" [disabled]="releaseForm.invalid">
            Confirm Release
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    .confirm-dialog-box {
      background: #ffffff;
      border-radius: var(--r-lg);
      box-shadow: var(--sh-xl);
      width: 100%;
      max-width: 420px;
      margin: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: scaleUp 0.23s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .cd-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e8ece9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .cd-header h5 {
      font-family: var(--ff-display);
      font-size: 14.5px;
      font-weight: 700;
      color: var(--txt-h);
      margin: 0;
    }

    .cd-close-btn {
      color: var(--txt-muted);
      font-size: 14px;
      cursor: pointer;
      transition: color 0.15s;
    }

    .cd-close-btn:hover {
      color: var(--txt-h);
    }

    .cd-body {
      padding: 20px;
    }

    .cd-body p {
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--txt-body);
    }

    .cd-footer {
      background: #fafcfb;
      padding: 12px 20px;
      border-top: 1px solid #e8ece9;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class WithdrawalReleaseDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() amount = 0;
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
