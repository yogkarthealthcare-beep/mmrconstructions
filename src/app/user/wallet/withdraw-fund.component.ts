import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';

@Component({
  selector: 'app-withdraw-fund',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LoadingButtonComponent
  ],
  template: `
    <div class="panel-content">
      <!-- Header -->
      <div class="pg-header">
        <div class="d-flex align-items-center gap-2 mb-2">
          <a routerLink="../" class="btn btn-outline-green btn-sm px-2 py-1">
            <i class="fas fa-arrow-left"></i> Back
          </a>
          <h4 class="m-0">Withdraw Funds</h4>
        </div>
        <p>Submit a payout request to transfer available wallet balance to your bank account or UPI.</p>
      </div>

      <div class="row">
        <div class="col-lg-7 mx-auto">
          <!-- Balance Summary Card -->
          <div class="panel-card mb-4 bg-light-green text-green-dark border-green">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <span class="fs-12 uppercase fw-bold opacity-75">Available Wallet Balance</span>
                <h3 class="m-0 fw-bold">₹{{ availableBalance | number:'1.2-2' }}</h3>
              </div>
              <i class="fas fa-wallet fa-2x opacity-25"></i>
            </div>
          </div>

          <div class="panel-card">
            <!-- Loader -->
            <div *ngIf="pageLoading" class="panel-loading py-4">
              <i class="fas fa-circle-notch"></i>
              <span>Checking account status...</span>
            </div>

            <!-- Error Banner -->
            <div *ngIf="!pageLoading && errorMessage" class="panel-alert panel-alert-error mb-4">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Success Banner -->
            <div *ngIf="!pageLoading && successMessage" class="panel-alert panel-alert-success mb-4">
              <i class="fas fa-check-circle"></i>
              <span>{{ successMessage }}</span>
            </div>

            <!-- Form -->
            <form [formGroup]="withdrawForm" (ngSubmit)="onSubmit()" *ngIf="!pageLoading && !successMessage">
              <div class="row">
                <!-- Amount -->
                <div class="col-12 mb-3">
                  <label for="amount" class="form-label fw-bold">Withdrawal Amount (INR)*</label>
                  <div class="input-group">
                    <span class="input-group-text">₹</span>
                    <input
                      type="number"
                      id="amount"
                      formControlName="amount"
                      class="form-control"
                      placeholder="e.g. 500"
                      [class.is-invalid]="submitted && withdrawForm.get('amount')?.invalid"
                    />
                  </div>
                  <div class="invalid-feedback d-block" *ngIf="submitted && withdrawForm.get('amount')?.invalid">
                    <span *ngIf="withdrawForm.get('amount')?.errors?.['required']">Amount is required.</span>
                    <span *ngIf="withdrawForm.get('amount')?.errors?.['min']">Amount must be greater than 0.</span>
                    <span *ngIf="withdrawForm.get('amount')?.errors?.['max']">Amount cannot exceed Available Balance (₹{{ availableBalance }}).</span>
                    <span *ngIf="withdrawForm.get('amount')?.errors?.['minLimit']">Minimum withdrawal amount is ₹100.00.</span>
                  </div>
                </div>

                <div class="col-12"><hr class="my-3 text-muted"></div>

                <!-- Bank details -->
                <h6 class="fw-bold mb-3 text-gold"><i class="fas fa-university me-1"></i> Bank Account Information</h6>

                <!-- Account Holder Name -->
                <div class="col-md-6 mb-3">
                  <label for="bank_account_holder_name" class="form-label">Account Holder Name*</label>
                  <input
                    type="text"
                    id="bank_account_holder_name"
                    formControlName="bank_account_holder_name"
                    class="form-control"
                    placeholder="As in bank records"
                    [class.is-invalid]="submitted && withdrawForm.get('bank_account_holder_name')?.invalid"
                  />
                  <div class="invalid-feedback" *ngIf="submitted && withdrawForm.get('bank_account_holder_name')?.invalid">
                    Account holder name is required.
                  </div>
                </div>

                <!-- Account Number -->
                <div class="col-md-6 mb-3">
                  <label for="bank_account_number" class="form-label">Bank Account Number*</label>
                  <input
                    type="text"
                    id="bank_account_number"
                    formControlName="bank_account_number"
                    class="form-control"
                    placeholder="Enter account number"
                    [class.is-invalid]="submitted && withdrawForm.get('bank_account_number')?.invalid"
                  />
                  <div class="invalid-feedback" *ngIf="submitted && withdrawForm.get('bank_account_number')?.invalid">
                    Account number is required.
                  </div>
                </div>

                <!-- Bank Name -->
                <div class="col-md-6 mb-3">
                  <label for="bank_name" class="form-label">Bank Name*</label>
                  <input
                    type="text"
                    id="bank_name"
                    formControlName="bank_name"
                    class="form-control"
                    placeholder="e.g. State Bank of India"
                    [class.is-invalid]="submitted && withdrawForm.get('bank_name')?.invalid"
                  />
                  <div class="invalid-feedback" *ngIf="submitted && withdrawForm.get('bank_name')?.invalid">
                    Bank name is required.
                  </div>
                </div>

                <!-- IFSC Code -->
                <div class="col-md-6 mb-3">
                  <label for="ifsc_code" class="form-label">IFSC Code*</label>
                  <input
                    type="text"
                    id="ifsc_code"
                    formControlName="ifsc_code"
                    class="form-control"
                    placeholder="e.g. SBIN0001234"
                    [class.is-invalid]="submitted && withdrawForm.get('ifsc_code')?.invalid"
                  />
                  <div class="invalid-feedback" *ngIf="submitted && withdrawForm.get('ifsc_code')?.invalid">
                    Valid 11-digit IFSC code is required.
                  </div>
                </div>

                <div class="col-12"><hr class="my-3 text-muted"></div>

                <!-- UPI & Remarks details -->
                <h6 class="fw-bold mb-3 text-success"><i class="fas fa-mobile-alt me-1"></i> Optional UPI & Remarks</h6>

                <!-- UPI ID -->
                <div class="col-md-6 mb-3">
                  <label for="upi_id" class="form-label">UPI ID (Optional)</label>
                  <input
                    type="text"
                    id="upi_id"
                    formControlName="upi_id"
                    class="form-control"
                    placeholder="e.g. name@upi"
                    [class.is-invalid]="submitted && withdrawForm.get('upi_id')?.invalid"
                  />
                  <div class="invalid-feedback" *ngIf="submitted && withdrawForm.get('upi_id')?.invalid">
                    Enter a valid UPI ID (e.g. name&#64;bank).
                  </div>
                </div>

                <!-- Remarks -->
                <div class="col-md-6 mb-3">
                  <label for="remarks" class="form-label">Remarks (Optional)</label>
                  <input
                    type="text"
                    id="remarks"
                    formControlName="remarks"
                    class="form-control"
                    placeholder="Add notes for admin"
                  />
                </div>
              </div>

              <!-- Submit -->
              <div class="d-grid mt-4">
                <app-loading-button
                  type="submit"
                  text="Submit Request"
                  loadingText="Submitting request..."
                  [loading]="submitting"
                  [disabled]="withdrawForm.invalid"
                  btnClass="btn btn-green btn-lg py-2"
                  icon="fas fa-paper-plane"
                ></app-loading-button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-light-green { background: #e8f5e9; }
    .border-green { border: 1px solid #a5d6a7; }
    .text-green-dark { color: #1b5e20; }
  `]
})
export class WithdrawFundComponent implements OnInit {
  withdrawForm!: FormGroup;
  pageLoading = true;
  submitting = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';
  availableBalance = 0.00;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: ApiService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadBalanceAndBankDetails();
  }

  private initForm() {
    this.withdrawForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      bank_account_holder_name: ['', Validators.required],
      bank_account_number: ['', [Validators.required, Validators.pattern(/^[0-9]{6,20}$/)]],
      bank_name: ['', Validators.required],
      ifsc_code: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      upi_id: ['', [Validators.pattern(/^[\w.-]+@[\w.-]+$/)]],
      remarks: ['']
    });
  }

  private walletHomePath(): string {
    return this.router.url.startsWith('/associate') ? '/associate/wallet' : '/user/wallet';
  }

  loadBalanceAndBankDetails() {
    this.pageLoading = true;
    this.errorMessage = '';

    // Load wallet balance and profile in parallel
    this.api.getWalletBalance().subscribe({
      next: (res) => {
        if (res.success) {
          this.availableBalance = Number(res.data?.available_balance || 0);
          this.withdrawForm.get('amount')?.setValidators([
            Validators.required,
            Validators.min(0.01),
            Validators.max(this.availableBalance),
            (control) => control.value < 100 ? { minLimit: true } : null
          ]);
          this.withdrawForm.get('amount')?.updateValueAndValidity();
        }
        
        // Check if user has bank details in the backend to pre-fill
        this.api.getProfile().subscribe({
          next: (profileRes) => {
            if (profileRes.success && profileRes.data) {
              const u = profileRes.data;
              this.withdrawForm.patchValue({
                bank_account_holder_name: u.bank_holder_name || u.full_name || '',
                bank_account_number: u.bank_account_no || '',
                bank_name: u.bank_name || '',
                ifsc_code: u.ifsc_code || '',
                upi_id: u.upi_id || ''
              });
            }
            this.pageLoading = false;
          },
          error: () => {
            this.pageLoading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Could not load wallet status.';
        this.pageLoading = false;
      }
    });
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.withdrawForm.invalid) {
      this.withdrawForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    this.api.requestWithdrawal(this.withdrawForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = `Your payout request of ₹${this.withdrawForm.value.amount.toFixed(2)} has been submitted successfully.`;
          setTimeout(() => this.router.navigate([this.walletHomePath()]), 2500);
        } else {
          this.errorMessage = res.message || 'Failed to submit withdrawal request.';
        }
        this.submitting = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message || 'Server error submitting request.';
        this.submitting = false;
      }
    });
  }
}
