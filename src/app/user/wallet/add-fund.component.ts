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
    <div class="panel-content">
      <!-- Breadcrumb / Header -->
      <div class="pg-header">
        <div class="d-flex align-items-center gap-2 mb-2">
          <a routerLink="../" class="btn btn-outline-green btn-sm px-2 py-1">
            <i class="fas fa-arrow-left"></i> Back
          </a>
          <h4 class="m-0">Add Fund to Wallet</h4>
        </div>
        <p>Deposit money online safely to your wallet using secure gateways.</p>
      </div>

      <div class="row">
        <div class="col-lg-6 mx-auto">
          <div class="panel-card">
            <!-- Loader -->
            <div *ngIf="pageLoading" class="panel-loading py-5">
              <i class="fas fa-circle-notch"></i>
              <span>Loading payment details...</span>
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

            <form [formGroup]="fundForm" (ngSubmit)="onSubmit()" *ngIf="!pageLoading && !successMessage">
              <!-- Enter Amount -->
              <div class="mb-4">
                <label for="amount" class="form-label fw-bold">Enter Amount (INR)</label>
                <div class="input-group input-group-lg">
                  <span class="input-group-text">₹</span>
                  <input
                    type="number"
                    id="amount"
                    formControlName="amount"
                    class="form-control"
                    placeholder="Enter amount (e.g. 500)"
                    [class.is-invalid]="fundForm.get('amount')?.touched && fundForm.get('amount')?.invalid"
                  />
                </div>
                <div class="invalid-feedback d-block" *ngIf="fundForm.get('amount')?.touched && fundForm.get('amount')?.invalid">
                  <span *ngIf="fundForm.get('amount')?.errors?.['required']">Amount is required.</span>
                  <span *ngIf="fundForm.get('amount')?.errors?.['min']">Minimum amount is â‚¹{{ minimumAmount | number:'1.2-2' }}.</span>
                </div>
                <!-- Quick Amounts selection -->
                <div class="d-flex gap-2 mt-2 flex-wrap">
                  <button type="button" class="btn btn-outline-green btn-sm" (click)="setAmount(500)">+ ₹500</button>
                  <button type="button" class="btn btn-outline-green btn-sm" (click)="setAmount(1000)">+ ₹1,000</button>
                  <button type="button" class="btn btn-outline-green btn-sm" (click)="setAmount(5000)">+ ₹5,000</button>
                  <button type="button" class="btn btn-outline-green btn-sm" (click)="setAmount(10000)">+ ₹10,000</button>
                </div>
              </div>

              <!-- Choose Gateway -->
              <div class="mb-4">
                <label class="form-label fw-bold mb-3">Select Payment Gateway</label>
                <div class="row g-3">
                  <div class="col-sm-6" *ngFor="let gw of gateways">
                    <label class="d-flex align-items-center gap-2 mb-2" *ngIf="gateways.length > 1">
                      <input
                        type="radio"
                        name="payment_gateway"
                        [value]="gw.gateway_name"
                        [checked]="selectedGateway === gw.gateway_name"
                        (change)="selectGateway(gw.gateway_name)"
                      />
                      <span>{{ gw.display_name }}</span>
                    </label>
                    <app-gateway-card
                      [gateway]="gw"
                      [selected]="selectedGateway === gw.gateway_name"
                      (click)="selectGateway(gw.gateway_name)"
                    ></app-gateway-card>
                  </div>
                </div>
                <div *ngIf="gateways.length === 0" class="text-center p-3 border rounded-3 bg-light">
                  <span class="text-muted fs-13">No payment gateway config found. Please contact administrator.</span>
                </div>
              </div>

              <!-- Proceed Button -->
              <div class="d-grid mt-4">
                <app-loading-button
                  type="submit"
                  text="Proceed to Pay"
                  loadingText="Opening checkout..."
                  [loading]="submitting"
                  [disabled]="fundForm.invalid || !selectedGateway"
                  btnClass="btn btn-green btn-lg py-2"
                  icon="fas fa-lock"
                ></app-loading-button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
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
    this.loadGateways();
  }

  setAmount(val: number) {
    this.fundForm.patchValue({ amount: val });
  }

  selectGateway(name: string) {
    this.selectedGateway = name;
    this.applyMinimumAmount();
  }

  private walletHomePath(): string {
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
