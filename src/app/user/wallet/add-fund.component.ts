import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { PaymentService } from '../../services/payment.service';
import { RazorpayService } from '../../services/razorpay.service';
import { CashfreeService } from '../../services/cashfree.service';
import { PayuService } from '../../services/payu.service';
import { GatewayCardComponent } from '../../shared/components/gateway-card/gateway-card.component';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';
import { PaymentGateway } from '../../services/payment.types';

declare var Razorpay: any;

@Component({
  selector: 'app-add-fund',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    GatewayCardComponent,
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
                <i class="fas fa-shield-alt text-gold me-1"></i> SECURE DEPOSIT
              </span>
            </div>
            <h2 class="wallet-page-title mb-1">Add Fund to Wallet</h2>
            <p class="wallet-page-sub mb-0">Deposit money securely to your Associate wallet via instant payment gateways.</p>
          </div>

          <!-- Quick Balance Pill for Top Right -->
          <div class="header-balance-pill" *ngIf="!pageLoading">
            <span class="hbp-label">Current Balance:</span>
            <span class="hbp-val">₹{{ availableBalance | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>

      <!-- MAIN 2-COLUMN LAYOUT -->
      <div class="row g-4">
        
        <!-- LEFT / MAIN CARD (ADD MONEY FORM) -->
        <div class="col-lg-7 col-xl-8">
          <div class="wallet-card main-form-card">
            
            <!-- Card Header -->
            <div class="card-inner-header d-flex align-items-center justify-content-between pb-3 mb-4 border-bottom">
              <div class="d-flex align-items-center gap-3">
                <div class="card-header-icon bg-emerald-light text-emerald">
                  <i class="fas fa-wallet"></i>
                </div>
                <div>
                  <h4 class="fw-800 text-dark mb-0.5 fs-18">Add Money</h4>
                  <p class="text-muted fs-13 mb-0">Enter amount and choose your preferred instant payment method.</p>
                </div>
              </div>
              <span class="badge bg-success-subtle text-success fs-11 px-2.5 py-1 rounded-pill fw-700">
                <i class="fas fa-bolt me-1"></i> Instant Credit
              </span>
            </div>

            <!-- Loader -->
            <div *ngIf="pageLoading" class="text-center py-5">
              <i class="fas fa-circle-notch fa-spin fa-2x text-emerald mb-2"></i>
              <p class="text-muted fs-13 mb-0">Loading payment gateway configurations...</p>
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
            <form [formGroup]="fundForm" (ngSubmit)="onSubmit()" *ngIf="!pageLoading && !successMessage">
              
              <!-- 1. AMOUNT SECTION -->
              <div class="form-section mb-4">
                <label for="amount" class="section-label d-flex align-items-center justify-content-between mb-2">
                  <span class="fw-700 text-dark fs-14"><i class="fas fa-coins text-gold me-1.5"></i> Enter Amount (INR)*</span>
                  <span class="text-muted fs-12 fw-500">Min: ₹{{ minimumAmount | number:'1.2-2' }}</span>
                </label>

                <!-- Modern Large Amount Input -->
                <div class="amount-input-box" [class.is-invalid]="fundForm.get('amount')?.touched && fundForm.get('amount')?.invalid">
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
                <div class="invalid-feedback d-block mt-1.5 fs-12" *ngIf="fundForm.get('amount')?.touched && fundForm.get('amount')?.invalid">
                  <span *ngIf="fundForm.get('amount')?.errors?.['required']"><i class="fas fa-exclamation-triangle me-1"></i> Amount is required.</span>
                  <span *ngIf="fundForm.get('amount')?.errors?.['min']"><i class="fas fa-exclamation-triangle me-1"></i> Minimum deposit amount is ₹{{ minimumAmount | number:'1.2-2' }}.</span>
                </div>

                <!-- Quick Add Amount Pills -->
                <div class="quick-amount-container mt-3">
                  <div class="quick-amount-label fs-12 text-muted fw-700 mb-2 d-flex align-items-center gap-1">
                    <i class="fas fa-bolt text-gold"></i> Quick Add:
                  </div>
                  <div class="quick-pills-grid">
                    <button type="button" class="quick-amount-pill" (click)="setAmount(500)">
                      <i class="fas fa-plus fs-10"></i> ₹500
                    </button>
                    <button type="button" class="quick-amount-pill" (click)="setAmount(1000)">
                      <i class="fas fa-plus fs-10"></i> ₹1,000
                    </button>
                    <button type="button" class="quick-amount-pill" (click)="setAmount(5000)">
                      <i class="fas fa-plus fs-10"></i> ₹5,000
                    </button>
                    <button type="button" class="quick-amount-pill" (click)="setAmount(10000)">
                      <i class="fas fa-plus fs-10"></i> ₹10,000
                    </button>
                    <button type="button" class="quick-amount-pill" (click)="setAmount(25000)">
                      <i class="fas fa-plus fs-10"></i> ₹25,000
                    </button>
                    <button type="button" class="quick-amount-pill" (click)="setAmount(50000)">
                      <i class="fas fa-plus fs-10"></i> ₹50,000
                    </button>
                  </div>
                </div>
              </div>

              <div class="section-divider my-4"></div>

              <!-- 2. PAYMENT GATEWAY SELECTION -->
              <div class="form-section mb-4">
                <label class="section-label d-flex align-items-center justify-content-between mb-2.5">
                  <span class="fw-700 text-dark fs-14"><i class="fas fa-credit-card text-emerald me-1.5"></i> Select Payment Method</span>
                  <span class="text-emerald fs-12 fw-700"><i class="fas fa-lock me-1"></i> 100% Secure</span>
                </label>

                <!-- Gateways Grid -->
                <div class="gateway-selector-grid">
                  <div
                    *ngFor="let gw of gateways"
                    class="gateway-select-card"
                    [class.selected]="selectedGateway === gw.gateway_name"
                    (click)="selectGateway(gw.gateway_name)"
                  >
                    <div class="gsc-radio">
                      <i class="fas fa-check" *ngIf="selectedGateway === gw.gateway_name"></i>
                    </div>

                    <div class="gsc-logo-box">
                      <img *ngIf="gw.logo" [src]="gw.logo" [alt]="gw.display_name" class="gsc-logo" />
                      <div *ngIf="!gw.logo" class="gsc-logo-fallback">
                        <i class="fas fa-wallet text-emerald fs-5"></i>
                      </div>
                    </div>

                    <div class="gsc-text flex-grow-1">
                      <div class="gsc-title fw-800 text-dark fs-14">{{ gw.display_name }}</div>
                      <div class="gsc-sub text-muted fs-11">Instant UPI (GPay, PhonePe, Paytm), Cards &amp; NetBanking</div>
                    </div>

                    <div class="gsc-selected-tag" *ngIf="selectedGateway === gw.gateway_name">
                      <i class="fas fa-check-circle me-1"></i> Selected
                    </div>
                  </div>
                </div>

                <div *ngIf="gateways.length === 0" class="text-center p-4 border rounded-12 bg-light">
                  <i class="fas fa-exclamation-circle text-warning fs-3 mb-2"></i>
                  <p class="text-muted fs-13 mb-0">No active payment gateway found. Please contact MMR support.</p>
                </div>
              </div>

              <!-- 3. PROCEED BUTTON CTA -->
              <div class="cta-section mt-4 pt-2">
                <button
                  type="submit"
                  class="btn-proceed-cta"
                  [disabled]="fundForm.invalid || !selectedGateway || submitting"
                >
                  <span class="d-flex align-items-center justify-content-center gap-2" *ngIf="!submitting">
                    <span>Proceed to Pay</span>
                    <span class="btn-cta-amt" *ngIf="fundForm.value.amount">₹{{ fundForm.value.amount | number:'1.2-2' }}</span>
                    <i class="fas fa-arrow-right"></i>
                  </span>
                  <span class="d-flex align-items-center justify-content-center gap-2" *ngIf="submitting">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Processing Secure Payment...</span>
                  </span>
                </button>
              </div>

              <!-- Trust & Security Badges -->
              <div class="security-badges-row d-flex align-items-center justify-content-center flex-wrap gap-4 mt-3 pt-2 text-muted fs-12">
                <span><i class="fas fa-shield-alt text-emerald me-1"></i> 256-Bit SSL Encrypted</span>
                <span><i class="fas fa-bolt text-gold me-1"></i> Instant Wallet Credit</span>
                <span><i class="fas fa-building text-primary me-1"></i> Verified Banking Gateway</span>
              </div>
            </form>

          </div>
        </div>

        <!-- RIGHT / SECONDARY CARD (WALLET INFORMATION & GUIDELINES) -->
        <div class="col-lg-5 col-xl-4">
          <div class="d-flex flex-column gap-3">
            
            <!-- WALLET BALANCE CARD (Luxury Emerald Theme) -->
            <div class="wallet-balance-info-card">
              <div class="wb-bg-decor"></div>
              
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="wb-tag"><i class="fas fa-wallet text-gold me-1.5"></i> CURRENT WALLET BALANCE</span>
                <span class="wb-status-badge"><span class="wb-pulse-dot"></span> Active</span>
              </div>

              <div class="wb-balance-value">
                <span class="wb-currency">₹</span>{{ availableBalance | number:'1.2-2' }}
              </div>
              <p class="wb-sub mb-3">Available balance in your Associate wallet</p>

              <!-- Dynamic Preview after deposit -->
              <div class="wb-calc-preview" *ngIf="fundForm.value.amount && fundForm.value.amount > 0">
                <div class="d-flex align-items-center justify-content-between fs-12 mb-1 opacity-75">
                  <span>Adding Funds:</span>
                  <span class="fw-700 text-gold">+ ₹{{ fundForm.value.amount | number:'1.2-2' }}</span>
                </div>
                <div class="d-flex align-items-center justify-content-between fs-13 fw-800 border-top pt-1 mt-1 border-white-20">
                  <span>Estimated Balance:</span>
                  <span class="text-white">₹{{ (availableBalance + fundForm.value.amount) | number:'1.2-2' }}</span>
                </div>
              </div>

              <div class="wb-footer-badge">
                <i class="fas fa-lock me-1 text-gold"></i> 100% Secure &amp; Protected Wallet
              </div>
            </div>

            <!-- HOW IT WORKS CARD -->
            <div class="wallet-card p-3.5">
              <h6 class="fw-800 text-dark fs-14 mb-3 d-flex align-items-center gap-2">
                <i class="fas fa-lightbulb text-gold fs-15"></i> How Wallet Top-Up Works
              </h6>

              <div class="guide-steps">
                <div class="guide-step-item">
                  <div class="guide-step-num">1</div>
                  <div class="guide-step-content">
                    <div class="fw-700 text-dark fs-12">Enter Amount</div>
                    <div class="text-muted fs-11">Specify the deposit amount (min ₹{{ minimumAmount | number:'1.0-0' }}).</div>
                  </div>
                </div>

                <div class="guide-step-item">
                  <div class="guide-step-num">2</div>
                  <div class="guide-step-content">
                    <div class="fw-700 text-dark fs-12">Select Payment Method</div>
                    <div class="text-muted fs-11">Choose Razorpay for instant UPI, Debit/Credit Card or NetBanking.</div>
                  </div>
                </div>

                <div class="guide-step-item">
                  <div class="guide-step-num">3</div>
                  <div class="guide-step-content">
                    <div class="fw-700 text-dark fs-12">Complete Payment</div>
                    <div class="text-muted fs-11">Authenticate the transaction securely with your bank or UPI app.</div>
                  </div>
                </div>

                <div class="guide-step-item">
                  <div class="guide-step-num">4</div>
                  <div class="guide-step-content">
                    <div class="fw-700 text-dark fs-12">Instant Wallet Credit</div>
                    <div class="text-muted fs-11">Funds are credited immediately and available for bookings and transactions.</div>
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
                  <div class="fw-700 text-dark fs-12">Need Deposit Help?</div>
                  <div class="text-muted fs-11">Contact MMR Support: <a href="tel:+917071951011" class="text-emerald fw-700 text-decoration-none">+91 7071951011</a></div>
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

    /* Quick Amount Pills */
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

    .quick-amount-pill:active {
      transform: scale(0.97);
    }

    /* Gateway Cards */
    .gateway-selector-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gateway-select-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ffffff;
      border: 2px solid #e8ede9;
      border-radius: 14px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .gateway-select-card:hover {
      border-color: #a7f3d0;
      background: #fcfdfd;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }

    .gateway-select-card.selected {
      border-color: #047857;
      background: #f0fdf4;
      box-shadow: 0 4px 16px rgba(4, 120, 87, 0.08);
    }

    .gsc-radio {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #ffffff;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .gateway-select-card.selected .gsc-radio {
      border-color: #047857;
      background: #047857;
    }

    .gsc-logo-box {
      width: 48px;
      height: 38px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .gsc-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .gsc-selected-tag {
      font-size: 11px;
      font-weight: 700;
      color: #047857;
      background: #dcfce7;
      padding: 3px 10px;
      border-radius: 20px;
      flex-shrink: 0;
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

    /* Wallet Balance Info Card (Right side) */
    .wallet-balance-info-card {
      position: relative;
      background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #022c22 100%);
      border-radius: 18px;
      padding: 1.5rem 1.6rem;
      color: #ffffff;
      box-shadow: 0 12px 30px -4px rgba(4, 120, 87, 0.4);
      overflow: hidden;
    }

    .wb-bg-decor {
      position: absolute;
      top: -30px;
      right: -30px;
      width: 140px;
      height: 140px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(255, 255, 255, 0) 70%);
      pointer-events: none;
    }

    .wb-tag {
      font-size: 10px;
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .wb-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }

    .wb-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .wb-balance-value {
      font-size: 2.25rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
      margin: 0.25rem 0;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .wb-currency {
      color: #f59e0b;
      margin-right: 2px;
      font-size: 1.6rem;
    }

    .wb-sub {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.75);
    }

    .wb-calc-preview {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .border-white-20 {
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    .wb-footer-badge {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 600;
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

    .section-divider {
      height: 1px;
      background: #f1f5f9;
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
export class AddFundComponent implements OnInit {
  fundForm!: FormGroup;
  gateways: PaymentGateway[] = [];
  selectedGateway = '';
  pageLoading = true;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  minimumAmount = 1;
  availableBalance = 0.00;
  private activeOrderId = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: ApiService,
    private paymentService: PaymentService,
    private razorpayService: RazorpayService,
    private cashfreeService: CashfreeService,
    private payuService: PayuService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.fundForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.loadWalletBalance();
    this.loadGateways();
  }

  loadWalletBalance() {
    this.api.getWalletBalance().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.availableBalance = Number(res.data.available_balance || 0);
        }
      },
      error: () => {}
    });
  }

  setAmount(val: number) {
    this.fundForm.patchValue({ amount: val });
  }

  selectGateway(name: string) {
    this.selectedGateway = name;
    this.applyMinimumAmount();
  }

  public walletHomePath(): string {
    return this.router.url.startsWith('/associate') ? '/associate/wallet' : '/user/wallet';
  }

  private isAssociate(): boolean {
    return this.router.url.startsWith('/associate');
  }

  private applyMinimumAmount() {
    const selected = this.gateways.find((gw) => gw.gateway_name === this.selectedGateway) || this.gateways[0];
    this.minimumAmount = this.isAssociate()
      ? Number(selected?.min_associate_fund_amount || 1)
      : Number(selected?.min_customer_fund_amount || 1);

    const amountControl = this.fundForm.get('amount');
    amountControl?.setValidators([Validators.required, Validators.min(this.minimumAmount)]);
    amountControl?.updateValueAndValidity();
  }

  loadGateways() {
    this.pageLoading = true;
    this.errorMessage = '';
    this.paymentService.getActiveGateways().subscribe({
      next: (res) => {
        if (res.success) {
          this.gateways = res.data || [];
          if (this.gateways.length > 0) {
            const defaultGateway = this.gateways.find((gw) => gw.is_default) || this.gateways[0];
            this.selectedGateway = defaultGateway.gateway_name;
            this.applyMinimumAmount();
          }
        }
        this.pageLoading = false;
      },
      error: (err) => {
        console.error('Failed to load gateways', err);
        this.errorMessage = 'Could not load active payment gateways. Please try again.';
        this.pageLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.fundForm.invalid) {
      this.fundForm.markAllAsTouched();
      return;
    }

    if (!this.selectedGateway) {
      this.errorMessage = 'Please select a payment gateway.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const amount = this.fundForm.value.amount;

    this.api.initiateAddFund(amount, this.selectedGateway).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const details = res.data.checkout_details;
          const orderId = res.data.order_id;
          this.activeOrderId = orderId;

          if (this.selectedGateway === 'razorpay') {
            this.handleRazorpayCheckout(details, orderId);
          } else if (this.selectedGateway === 'cashfree') {
            this.handleCashfreeCheckout(details);
          } else if (this.selectedGateway === 'payu') {
            this.handlePayUCheckout(details);
          } else {
            this.errorMessage = 'Gateway strategy not recognized.';
            this.submitting = false;
          }
        } else {
          this.errorMessage = res.message || 'Initiating payment failed.';
          this.submitting = false;
        }
      },
      error: (err) => {
        console.error('Add fund initiate error', err);
        this.errorMessage = err?.error?.message || 'Server error initiating payment.';
        this.submitting = false;
      }
    });
  }

  private handleRazorpayCheckout(details: any, orderId: string) {
    this.razorpayService.loadScript().subscribe({
      next: () => {
        const options = {
          ...details,
          handler: (response: any) => {
            this.ngZone.run(() => {
              // Verify payment on backend wallet verification API
              this.api.verifyAddFund({
                order_id: orderId,
                gateway_name: 'razorpay',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }).subscribe({
                next: (verifyRes) => {
                  this.ngZone.run(() => {
                    if (verifyRes.success) {
                      this.successMessage = `Successfully added ₹${this.fundForm.value.amount.toFixed(2)} to your wallet!`;
                      this.cdr.detectChanges();
                      setTimeout(() => {
                        this.router.navigate([this.walletHomePath()], { queryParams: { _t: Date.now() } });
                      }, 1200);
                    } else {
                      this.errorMessage = verifyRes.message || 'Payment verification failed.';
                    }
                    this.submitting = false;
                    this.cdr.detectChanges();
                  });
                },
                error: (verifyErr) => {
                  this.ngZone.run(() => {
                    console.error('Verification error', verifyErr);
                    this.errorMessage = verifyErr?.error?.message || 'Payment verification failed.';
                    this.submitting = false;
                    this.cdr.detectChanges();
                  });
                }
              });
            });
          },
          modal: {
            ondismiss: () => {
              this.ngZone.run(() => {
                this.errorMessage = 'Payment window cancelled.';
                if (this.activeOrderId) {
                  this.api.cancelAddFund(this.activeOrderId).subscribe({ error: () => {} });
                }
                this.submitting = false;
                this.cdr.detectChanges();
              });
            }
          },
          theme: {
            color: '#1a5c3a'
          }
        };

        try {
          const rzp = new Razorpay(options);
          rzp.open();
        } catch (e: any) {
          this.errorMessage = 'Could not open Razorpay checkout widget: ' + e.message;
          this.submitting = false;
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load Razorpay SDK.';
        this.submitting = false;
      }
    });
  }

  private handleCashfreeCheckout(details: any) {
    this.cashfreeService.pay(details).subscribe({
      next: () => {
        console.log('Redirecting to Cashfree hosted checkout page...');
      },
      error: (err) => {
        console.error('Cashfree launch error', err);
        this.errorMessage = err?.message || 'Failed to trigger Cashfree SDK checkout.';
        this.submitting = false;
      }
    });
  }

  private handlePayUCheckout(details: any) {
    try {
      this.payuService.submit(details);
    } catch (err: any) {
      console.error('PayU launch error', err);
      this.errorMessage = err?.message || 'Failed to redirect to PayU. Please retry.';
      this.submitting = false;
    }
  }
}
