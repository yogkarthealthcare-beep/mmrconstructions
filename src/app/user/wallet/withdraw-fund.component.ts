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
    <div class="wallet-page-wrap">
      
      <!-- TOP NAVIGATION & HEADER -->
      <div class="wallet-page-header">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1.5">
              <a [routerLink]="walletHomePath()" class="wallet-back-btn">
                <i class="fas fa-arrow-left"></i> Back to Wallet
              </a>
              <span class="header-badge">
                <i class="fas fa-university text-gold me-1"></i> PAYOUT REQUEST
              </span>
            </div>
            <h2 class="wallet-page-title mb-1">Withdraw Funds</h2>
            <p class="wallet-page-sub mb-0">Transfer your available wallet balance to your bank account or UPI.</p>
          </div>

          <!-- Quick Balance Pill for Top Right -->
          <div class="header-balance-pill" *ngIf="!pageLoading">
            <span class="hbp-label">Available Balance:</span>
            <span class="hbp-val">₹{{ availableBalance | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>

      <!-- PROMINENT WALLET BALANCE HERO BANNER -->
      <div class="wallet-hero-card mb-4" *ngIf="!pageLoading">
        <div class="wh-bg-decor"></div>
        <div class="row align-items-center g-3 position-relative">
          <div class="col-lg-6">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="wh-tag"><i class="fas fa-wallet text-gold me-1"></i> AVAILABLE FOR WITHDRAWAL</span>
              <span class="wh-status-badge"><span class="wh-pulse-dot"></span> Ready</span>
            </div>
            <div class="wh-balance-value">
              <span class="wh-currency">₹</span>{{ availableBalance | number:'1.2-2' }}
            </div>
            <p class="wh-sub mb-0">Total liquid balance currently withdrawable to your verified bank account.</p>
          </div>

          <div class="col-lg-6">
            <div class="wh-stats-grid">
              <div class="wh-stat-item">
                <div class="wh-stat-icon"><i class="fas fa-coins text-gold"></i></div>
                <div>
                  <div class="wh-stat-title">Min Withdrawal</div>
                  <div class="wh-stat-value">₹100.00</div>
                </div>
              </div>

              <div class="wh-stat-item">
                <div class="wh-stat-icon"><i class="fas fa-percent text-emerald-light"></i></div>
                <div>
                  <div class="wh-stat-title">Processing Fee</div>
                  <div class="wh-stat-value">₹0.00 (Zero Fee)</div>
                </div>
              </div>

              <div class="wh-stat-item">
                <div class="wh-stat-icon"><i class="fas fa-clock text-gold"></i></div>
                <div>
                  <div class="wh-stat-title">Processing Window</div>
                  <div class="wh-stat-value">24–48 Bank Hours</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN 2-COLUMN LAYOUT -->
      <div class="row g-4">
        
        <!-- LEFT COLUMN: WITHDRAWAL DETAILS CARD -->
        <div class="col-lg-7 col-xl-8">
          <div class="wallet-card main-form-card">
            
            <!-- Card Inner Header -->
            <div class="card-inner-header d-flex align-items-center justify-content-between pb-3 mb-4 border-bottom">
              <div class="d-flex align-items-center gap-3">
                <div class="card-header-icon bg-emerald-light text-emerald">
                  <i class="fas fa-paper-plane"></i>
                </div>
                <div>
                  <h4 class="fw-800 text-dark mb-0.5 fs-18">Withdrawal Details</h4>
                  <p class="text-muted fs-13 mb-0">Enter amount and verify your beneficiary bank account information.</p>
                </div>
              </div>
              <span class="badge bg-success-subtle text-success fs-11 px-2.5 py-1 rounded-pill fw-700">
                <i class="fas fa-shield-alt me-1"></i> Bank Verified
              </span>
            </div>

            <!-- Loader -->
            <div *ngIf="pageLoading" class="text-center py-5">
              <i class="fas fa-circle-notch fa-spin fa-2x text-emerald mb-2"></i>
              <p class="text-muted fs-13 mb-0">Checking account status &amp; available limits...</p>
            </div>

            <!-- Error Alert Banner -->
            <div *ngIf="!pageLoading && errorMessage" class="custom-alert alert-error mb-4">
              <i class="fas fa-exclamation-circle text-danger fs-5"></i>
              <div class="flex-grow-1 fs-13 fw-600 text-danger-dark">{{ errorMessage }}</div>
              <button type="button" class="btn-close-alert" (click)="errorMessage = ''"><i class="fas fa-times"></i></button>
            </div>

            <!-- Success Alert Banner -->
            <div *ngIf="!pageLoading && successMessage" class="custom-alert alert-success mb-4">
              <i class="fas fa-check-circle text-success fs-5"></i>
              <div class="flex-grow-1 fs-13 fw-600 text-success-dark">{{ successMessage }}</div>
            </div>

            <!-- Form -->
            <form [formGroup]="withdrawForm" (ngSubmit)="onSubmit()" *ngIf="!pageLoading && !successMessage">
              
              <!-- 1. WITHDRAWAL AMOUNT -->
              <div class="form-section mb-4">
                <label for="amount" class="section-label d-flex align-items-center justify-content-between mb-2">
                  <span class="fw-700 text-dark fs-14"><i class="fas fa-coins text-gold me-1.5"></i> Withdrawal Amount (INR)*</span>
                  <span class="text-muted fs-12 fw-500">Max Limit: ₹{{ availableBalance | number:'1.2-2' }}</span>
                </label>

                <!-- Modern Large Amount Input -->
                <div class="amount-input-box" [class.is-invalid]="submitted && withdrawForm.get('amount')?.invalid">
                  <span class="currency-prefix">₹</span>
                  <input
                    type="number"
                    id="amount"
                    formControlName="amount"
                    class="amount-large-input"
                    placeholder="0.00"
                    min="1"
                    step="any"
                  />
                  <span class="amount-currency-badge">INR</span>
                </div>

                <!-- Validation Feedback -->
                <div class="invalid-feedback d-block mt-1.5 fs-12" *ngIf="submitted && withdrawForm.get('amount')?.invalid">
                  <span *ngIf="withdrawForm.get('amount')?.errors?.['required']"><i class="fas fa-exclamation-triangle me-1"></i> Amount is required.</span>
                  <span *ngIf="withdrawForm.get('amount')?.errors?.['min']"><i class="fas fa-exclamation-triangle me-1"></i> Amount must be greater than 0.</span>
                  <span *ngIf="withdrawForm.get('amount')?.errors?.['max']"><i class="fas fa-exclamation-triangle me-1"></i> Amount cannot exceed Available Balance (₹{{ availableBalance | number:'1.2-2' }}).</span>
                  <span *ngIf="withdrawForm.get('amount')?.errors?.['minLimit']"><i class="fas fa-exclamation-triangle me-1"></i> Minimum withdrawal amount is ₹100.00.</span>
                </div>

                <!-- Quick Percentage / Amount Pills -->
                <div class="quick-amount-container mt-3">
                  <div class="quick-amount-label fs-12 text-muted fw-700 mb-2 d-flex align-items-center gap-1">
                    <i class="fas fa-bolt text-gold"></i> Quick Select:
                  </div>
                  <div class="quick-pills-grid">
                    <button type="button" class="quick-amount-pill" (click)="setPercentageAmount(25)">25%</button>
                    <button type="button" class="quick-amount-pill" (click)="setPercentageAmount(50)">50%</button>
                    <button type="button" class="quick-amount-pill" (click)="setPercentageAmount(75)">75%</button>
                    <button type="button" class="quick-amount-pill highlight-pill" (click)="setMaxAmount()">
                      <i class="fas fa-star text-gold fs-10"></i> Max (100%)
                    </button>
                    <button type="button" class="quick-amount-pill" (click)="setFixedAmount(500)">+ ₹500</button>
                    <button type="button" class="quick-amount-pill" (click)="setFixedAmount(1000)">+ ₹1,000</button>
                    <button type="button" class="quick-amount-pill" (click)="setFixedAmount(5000)">+ ₹5,000</button>
                  </div>
                </div>
              </div>

              <div class="section-divider my-4"></div>

              <!-- 2. BANK ACCOUNT INFORMATION -->
              <div class="form-section mb-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <div class="section-icon-badge">
                      <i class="fas fa-university"></i>
                    </div>
                    <h6 class="section-heading mb-0">Bank Account Information</h6>
                  </div>
                  <span class="badge bg-light text-muted border fs-11 px-2.5 py-1">IMPS / NEFT Settlement</span>
                </div>

                <!-- 2-Column Grid for Desktop -->
                <div class="row g-3">
                  <!-- Account Holder Name -->
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="bank_account_holder_name" class="custom-label">
                        Account Holder Name <span class="text-danger">*</span>
                      </label>
                      <div class="modern-input-group" [class.is-invalid]="submitted && withdrawForm.get('bank_account_holder_name')?.invalid">
                        <span class="ig-icon"><i class="fas fa-user"></i></span>
                        <input
                          type="text"
                          id="bank_account_holder_name"
                          formControlName="bank_account_holder_name"
                          class="modern-input"
                          placeholder="As in bank records"
                        />
                      </div>
                      <div class="invalid-feedback d-block mt-1 fs-11" *ngIf="submitted && withdrawForm.get('bank_account_holder_name')?.invalid">
                        Account holder name is required.
                      </div>
                    </div>
                  </div>

                  <!-- Bank Account Number -->
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="bank_account_number" class="custom-label">
                        Bank Account Number <span class="text-danger">*</span>
                      </label>
                      <div class="modern-input-group" [class.is-invalid]="submitted && withdrawForm.get('bank_account_number')?.invalid">
                        <span class="ig-icon"><i class="fas fa-hashtag"></i></span>
                        <input
                          type="text"
                          id="bank_account_number"
                          formControlName="bank_account_number"
                          class="modern-input font-monospace"
                          placeholder="Enter bank account number"
                        />
                      </div>
                      <div class="invalid-feedback d-block mt-1 fs-11" *ngIf="submitted && withdrawForm.get('bank_account_number')?.invalid">
                        Valid bank account number (6-20 digits) is required.
                      </div>
                    </div>
                  </div>

                  <!-- Bank Name -->
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="bank_name" class="custom-label">
                        Bank Name <span class="text-danger">*</span>
                      </label>
                      <div class="modern-input-group" [class.is-invalid]="submitted && withdrawForm.get('bank_name')?.invalid">
                        <span class="ig-icon"><i class="fas fa-building"></i></span>
                        <input
                          type="text"
                          id="bank_name"
                          formControlName="bank_name"
                          class="modern-input"
                          placeholder="e.g. State Bank of India, HDFC"
                        />
                      </div>
                      <div class="invalid-feedback d-block mt-1 fs-11" *ngIf="submitted && withdrawForm.get('bank_name')?.invalid">
                        Bank name is required.
                      </div>
                    </div>
                  </div>

                  <!-- IFSC Code -->
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="ifsc_code" class="custom-label">
                        IFSC Code <span class="text-danger">*</span>
                      </label>
                      <div class="modern-input-group" [class.is-invalid]="submitted && withdrawForm.get('ifsc_code')?.invalid">
                        <span class="ig-icon"><i class="fas fa-barcode"></i></span>
                        <input
                          type="text"
                          id="ifsc_code"
                          formControlName="ifsc_code"
                          class="modern-input text-uppercase font-monospace"
                          placeholder="e.g. SBIN0001234"
                          maxlength="11"
                        />
                      </div>
                      <div class="invalid-feedback d-block mt-1 fs-11" *ngIf="submitted && withdrawForm.get('ifsc_code')?.invalid">
                        Valid 11-character IFSC code is required.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="section-divider my-4"></div>

              <!-- 3. OPTIONAL UPI & REMARKS -->
              <div class="form-section mb-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <div class="section-icon-badge">
                      <i class="fas fa-mobile-alt"></i>
                    </div>
                    <h6 class="section-heading mb-0">Optional UPI &amp; Remarks</h6>
                  </div>
                  <span class="badge bg-light text-muted border fs-11 px-2.5 py-1">Optional</span>
                </div>

                <div class="row g-3">
                  <!-- UPI ID -->
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="upi_id" class="custom-label">UPI ID (Optional)</label>
                      <div class="modern-input-group" [class.is-invalid]="submitted && withdrawForm.get('upi_id')?.invalid">
                        <span class="ig-icon"><i class="fas fa-at"></i></span>
                        <input
                          type="text"
                          id="upi_id"
                          formControlName="upi_id"
                          class="modern-input"
                          placeholder="e.g. mobile@upi / name@okhdfcbank"
                        />
                      </div>
                      <div class="invalid-feedback d-block mt-1 fs-11" *ngIf="submitted && withdrawForm.get('upi_id')?.invalid">
                        Enter a valid UPI ID (e.g. name&#64;bank).
                      </div>
                    </div>
                  </div>

                  <!-- Remarks -->
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="remarks" class="custom-label">Remarks (Optional)</label>
                      <div class="modern-input-group">
                        <span class="ig-icon"><i class="fas fa-comment-dots"></i></span>
                        <input
                          type="text"
                          id="remarks"
                          formControlName="remarks"
                          class="modern-input"
                          placeholder="Notes or transaction reference"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 4. SUBMIT CTA BUTTON -->
              <div class="cta-section mt-4 pt-2">
                <button
                  type="submit"
                  class="btn-proceed-cta"
                  [disabled]="submitting"
                >
                  <span class="d-flex align-items-center justify-content-center gap-2" *ngIf="!submitting">
                    <span>Submit Withdrawal Request</span>
                    <span class="btn-cta-amt" *ngIf="enteredAmount > 0">₹{{ enteredAmount | number:'1.2-2' }}</span>
                    <i class="fas fa-arrow-right"></i>
                  </span>
                  <span class="d-flex align-items-center justify-content-center gap-2" *ngIf="submitting">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Submitting Request...</span>
                  </span>
                </button>
              </div>

              <!-- Security Badges Row -->
              <div class="security-badges-row d-flex align-items-center justify-content-center flex-wrap gap-4 mt-3 pt-2 text-muted fs-12">
                <span><i class="fas fa-shield-alt text-emerald me-1"></i> 256-Bit SSL Encrypted</span>
                <span><i class="fas fa-bolt text-gold me-1"></i> Direct Bank Settlement</span>
                <span><i class="fas fa-check-circle text-success me-1"></i> Zero Processing Fee</span>
              </div>
            </form>

          </div>
        </div>

        <!-- RIGHT COLUMN: WITHDRAWAL SUMMARY & GUIDELINES -->
        <div class="col-lg-5 col-xl-4">
          <div class="d-flex flex-column gap-3">
            
            <!-- WITHDRAWAL SUMMARY CARD -->
            <div class="summary-card">
              <div class="summary-card-header d-flex align-items-center justify-content-between pb-2.5 mb-3 border-bottom">
                <div class="d-flex align-items-center gap-2">
                  <div class="icon-circle-sm bg-emerald text-white">
                    <i class="fas fa-receipt fs-12"></i>
                  </div>
                  <h6 class="fw-800 text-dark fs-14 mb-0">Withdrawal Summary</h6>
                </div>
                <span class="badge bg-emerald-light text-emerald fs-11 fw-700">Live Breakdown</span>
              </div>

              <div class="summary-list">
                <div class="summary-row">
                  <span class="text-muted fs-13">Available Balance</span>
                  <span class="fw-700 text-dark fs-13">₹{{ availableBalance | number:'1.2-2' }}</span>
                </div>

                <div class="summary-row">
                  <span class="text-muted fs-13">Withdrawal Amount</span>
                  <span class="fw-800 text-gold fs-13">
                    {{ enteredAmount > 0 ? ('- ₹' + (enteredAmount | number:'1.2-2')) : '₹0.00' }}
                  </span>
                </div>

                <div class="summary-row">
                  <span class="text-muted fs-13">Processing Fee</span>
                  <span class="fw-700 text-success fs-13">₹0.00 (Free)</span>
                </div>

                <div class="summary-divider my-2"></div>

                <div class="summary-row remaining-row">
                  <span class="fw-700 text-dark fs-13">Remaining Balance</span>
                  <span class="fw-800 text-dark fs-14">₹{{ remainingBalance | number:'1.2-2' }}</span>
                </div>
              </div>

              <!-- Payout Net Box -->
              <div class="net-payout-box mt-3">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <div class="np-label">Estimated Payout Amount</div>
                    <div class="np-sub">Credited to your bank account</div>
                  </div>
                  <div class="np-val">
                    ₹{{ enteredAmount | number:'1.2-2' }}
                  </div>
                </div>
              </div>

              <div class="summary-footer-note text-center mt-3 pt-2 border-top text-muted fs-11">
                <i class="fas fa-info-circle text-gold me-1"></i> Funds are placed on hold until bank settlement completes.
              </div>
            </div>

            <!-- PAYOUT GUIDELINES CARD -->
            <div class="wallet-card p-3.5">
              <h6 class="fw-800 text-dark fs-14 mb-3 d-flex align-items-center gap-2">
                <i class="fas fa-shield-alt text-gold fs-15"></i> Payout Guidelines
              </h6>

              <div class="guide-steps">
                <div class="guide-step-item">
                  <div class="guide-step-num">1</div>
                  <div class="guide-step-content">
                    <div class="fw-700 text-dark fs-12">Account Holder Matching</div>
                    <div class="text-muted fs-11">Bank account holder name must match your registered KYC name.</div>
                  </div>
                </div>

                <div class="guide-step-item">
                  <div class="guide-step-num">2</div>
                  <div class="guide-step-content">
                    <div class="fw-700 text-dark fs-12">Settlement Timeline</div>
                    <div class="text-muted fs-11">Requests are processed within 24–48 banking working hours.</div>
                  </div>
                </div>

                <div class="guide-step-item">
                  <div class="guide-step-num">3</div>
                  <div class="guide-step-content">
                    <div class="fw-700 text-dark fs-12">Zero Deduction</div>
                    <div class="text-muted fs-11">No hidden charges or withdrawal fees are applied to Associate payouts.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- NEED ASSISTANCE CARD -->
            <div class="wallet-card p-3 bg-light border">
              <div class="d-flex align-items-center gap-2.5">
                <div class="icon-circle bg-white border text-emerald shadow-sm">
                  <i class="fas fa-headset"></i>
                </div>
                <div>
                  <div class="fw-700 text-dark fs-12">Need Payout Assistance?</div>
                  <div class="text-muted fs-11">Contact MMR Accounts: <a href="tel:+917071951011" class="text-emerald fw-700 text-decoration-none">+91 7071951011</a></div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .wallet-page-wrap {
      max-width: 1240px;
      margin: 0 auto;
      padding: 0.5rem 0.5rem 3rem 0.5rem;
    }

    /* Page Header */
    .wallet-page-header {
      background: #ffffff;
      border: 1px solid #e8ede9;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
    }

    .wallet-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #064e3b;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 4px 10px;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .wallet-back-btn:hover {
      background: #064e3b;
      color: #ffffff;
      transform: translateX(-2px);
    }

    .header-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #b45309;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .wallet-page-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .wallet-page-sub {
      font-size: 0.85rem;
      color: #64748b;
    }

    .header-balance-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 8px 14px;
    }

    .hbp-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }

    .hbp-val {
      font-size: 15px;
      font-weight: 800;
      color: #064e3b;
    }

    /* Prominent Hero Balance Banner */
    .wallet-hero-card {
      position: relative;
      background: linear-gradient(135deg, #064e3b 0%, #047857 55%, #022c22 100%);
      border-radius: 18px;
      padding: 1.6rem 2rem;
      color: #ffffff;
      box-shadow: 0 12px 30px -4px rgba(4, 120, 87, 0.4);
      overflow: hidden;
    }

    .wh-bg-decor {
      position: absolute;
      top: -40px;
      right: -40px;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(255, 255, 255, 0) 70%);
      pointer-events: none;
    }

    .wh-tag {
      font-size: 11px;
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .wh-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }

    .wh-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .wh-balance-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
      margin: 0.2rem 0;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .wh-currency {
      color: #f59e0b;
      margin-right: 2px;
      font-size: 1.8rem;
    }

    .wh-sub {
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.8);
    }

    .wh-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .wh-stat-item {
      background: rgba(0, 0, 0, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .wh-stat-icon {
      font-size: 16px;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .wh-stat-title {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 600;
    }

    .wh-stat-value {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
    }

    /* Cards */
    .wallet-card {
      background: #ffffff;
      border: 1px solid #e8ede9;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      position: relative;
    }

    .card-header-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .bg-emerald-light { background: #ecfdf5; }
    .text-emerald { color: #047857; }
    .text-gold { color: #f59e0b; }

    /* Amount Input Box */
    .amount-input-box {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      padding: 8px 16px;
      transition: all 0.25s ease;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .amount-input-box:focus-within {
      border-color: #047857;
      box-shadow: 0 0 0 4px rgba(4, 120, 87, 0.12);
    }

    .amount-input-box.is-invalid {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .currency-prefix {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f59e0b;
      margin-right: 8px;
      user-select: none;
    }

    .amount-large-input {
      border: none;
      outline: none;
      background: transparent;
      width: 100%;
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .amount-currency-badge {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }

    /* Quick Pills */
    .quick-pills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .quick-amount-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .quick-amount-pill:hover {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #047857;
      transform: translateY(-1px);
    }

    .quick-amount-pill.highlight-pill {
      background: #fef3c7;
      border-color: #fde68a;
      color: #b45309;
    }

    .quick-amount-pill.highlight-pill:hover {
      background: #fde68a;
      border-color: #fcd34d;
      color: #92400e;
    }

    /* Section Headings */
    .section-heading {
      font-family: inherit;
      font-size: 14.5px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .section-icon-badge {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: #ecfdf5;
      color: #047857;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }

    /* Form Fields & Modern Input Group (Zero Overlap) */
    .custom-label {
      font-size: 12.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
      display: block;
    }

    .modern-input-group {
      position: relative;
      display: flex;
      align-items: stretch;
      width: 100%;
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .modern-input-group .ig-icon {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-right: none;
      border-top-left-radius: 10px;
      border-bottom-left-radius: 10px;
      color: #64748b;
      font-size: 13px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .modern-input-group .modern-input {
      border: 1.5px solid #e2e8f0;
      border-left: none;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      height: 44px;
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      background: #ffffff;
      padding: 10px 14px !important;
      width: 100%;
      outline: none;
      box-shadow: none;
      transition: all 0.2s ease;
    }

    .modern-input-group:focus-within .ig-icon {
      border-color: #047857;
      color: #047857;
      background: #ecfdf5;
    }

    .modern-input-group:focus-within .modern-input {
      border-color: #047857;
      box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.12);
      background: #ffffff;
    }

    .modern-input-group.is-invalid .ig-icon {
      border-color: #ef4444;
      color: #ef4444;
      background: #fef2f2;
    }

    .modern-input-group.is-invalid .modern-input {
      border-color: #ef4444;
      background-color: #fff5f5;
    }

    .section-divider {
      height: 1px;
      background: #f1f5f9;
    }

    /* Proceed CTA Button */
    .btn-proceed-cta {
      width: 100%;
      background: linear-gradient(135deg, #047857 0%, #064e3b 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.01em;
      box-shadow: 0 8px 24px -4px rgba(4, 120, 87, 0.4);
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .btn-proceed-cta:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      box-shadow: 0 12px 28px -4px rgba(4, 120, 87, 0.5);
      transform: translateY(-2px);
    }

    .btn-proceed-cta:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-proceed-cta:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-cta-amt {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 14px;
    }

    /* Summary Card */
    .summary-card {
      background: #ffffff;
      border: 1px solid #e8ede9;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }

    .icon-circle-sm {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .summary-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .summary-divider {
      height: 1px;
      background: #e2e8f0;
    }

    .remaining-row {
      padding-top: 2px;
    }

    .net-payout-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border: 1.5px solid #a7f3d0;
      border-radius: 12px;
      padding: 12px 14px;
    }

    .np-label {
      font-size: 11.5px;
      font-weight: 800;
      color: #064e3b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .np-sub {
      font-size: 11px;
      color: #047857;
      opacity: 0.85;
    }

    .np-val {
      font-size: 1.35rem;
      font-weight: 800;
      color: #064e3b;
    }

    /* Guide Steps */
    .guide-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .guide-step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .guide-step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #ecfdf5;
      color: #047857;
      font-weight: 800;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .icon-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* Alerts */
    .custom-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .text-danger-dark { color: #991b1b; }

    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .text-success-dark { color: #166534; }

    .btn-close-alert {
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      padding: 0 4px;
    }
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

  get enteredAmount(): number {
    const val = Number(this.withdrawForm?.get('amount')?.value);
    return isNaN(val) || val < 0 ? 0 : val;
  }

  get remainingBalance(): number {
    const rem = this.availableBalance - this.enteredAmount;
    return rem >= 0 ? rem : 0;
  }

  setPercentageAmount(pct: number) {
    if (this.availableBalance <= 0) return;
    const val = Math.floor((this.availableBalance * pct) / 100);
    this.withdrawForm.patchValue({ amount: val });
    this.withdrawForm.get('amount')?.markAsTouched();
  }

  setMaxAmount() {
    if (this.availableBalance <= 0) return;
    this.withdrawForm.patchValue({ amount: this.availableBalance });
    this.withdrawForm.get('amount')?.markAsTouched();
  }

  setFixedAmount(amt: number) {
    const current = Number(this.withdrawForm.get('amount')?.value || 0);
    const newAmt = Math.min(current + amt, this.availableBalance);
    this.withdrawForm.patchValue({ amount: newAmt });
    this.withdrawForm.get('amount')?.markAsTouched();
  }

  public walletHomePath(): string {
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
          setTimeout(() => this.router.navigate([this.walletHomePath()]), 2200);
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
