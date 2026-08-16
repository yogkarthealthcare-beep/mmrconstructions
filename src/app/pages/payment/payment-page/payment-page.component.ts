import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { RazorpayService } from '../../../services/razorpay.service';
import { CashfreeService } from '../../../services/cashfree.service';
import { PayuService } from '../../../services/payu.service';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { PaymentGateway, InitiatePaymentRequest } from '../../../services/payment.types';
import { PaymentSummaryComponent } from '../../../shared/components/payment-summary/payment-summary.component';
import { GatewayCardComponent } from '../../../shared/components/gateway-card/gateway-card.component';
import { LoadingButtonComponent } from '../../../shared/components/loading-button/loading-button.component';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaymentSummaryComponent,
    GatewayCardComponent,
    LoadingButtonComponent
  ],
  templateUrl: './payment-page.component.html',
  styleUrls: ['./payment-page.component.css']
})
export class PaymentPageComponent implements OnInit {
  orderId: string = '';
  amount: number = 0;
  gateways: PaymentGateway[] = [];
  selectedGatewayName: string = '';
  loading = false;
  pageLoading = true;
  errorMessage = '';

  // Form group for customer detail validations
  checkoutForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private razorpayService: RazorpayService,
    private cashfreeService: CashfreeService,
    private payuService: PayuService,
    private authService: AuthService,
    private apiService: ApiService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('orderId');
      if (id) {
        this.orderId = id;
        this.loadCheckoutData();
      } else {
        this.errorMessage = 'Invalid payment link. Missing Order ID.';
        this.pageLoading = false;
      }
    });
  }

  private initForm() {
    this.checkoutForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(3)]],
      customerEmail: ['', [Validators.required, Validators.email]],
      customerMobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]]
    });
  }

  private loadCheckoutData() {
    this.pageLoading = true;
    this.errorMessage = '';

    // Step 1: Load active payment gateways
    this.paymentService.getActiveGateways().subscribe({
      next: (gatewaysRes) => {
        if (gatewaysRes.success) {
          this.gateways = gatewaysRes.data || [];
          
          // Pre-select first gateway if available
          if (this.gateways.length > 0) {
            this.selectedGatewayName = this.gateways[0].gateway_name;
          }
        }
        this.checkOrderAndProfile();
      },
      error: (err) => {
        console.error('Failed to load gateways', err);
        this.errorMessage = 'Unable to fetch active gateways. Please retry.';
        this.checkOrderAndProfile();
      }
    });
  }

  private checkOrderAndProfile() {
    // Step 2: Fetch current payment status to fetch order amount
    this.paymentService.getPaymentStatus(this.orderId).subscribe({
      next: (statusRes) => {
        if (statusRes.success && statusRes.data) {
          this.amount = parseFloat(statusRes.data.amount);
          
          // If transaction is already successful, redirect immediately
          if (statusRes.data.payment_status === 'success') {
            this.router.navigate(['/payment-success'], { queryParams: { order_id: this.orderId } });
            return;
          }
        } else {
          this.amount = 51000; // Fallback default amount if status retrieve fails
        }
        this.loadProfile();
      },
      error: (err) => {
        console.error('Failed to fetch status', err);
        this.amount = 51000; // Fallback default
        this.loadProfile();
      }
    });
  }

  private loadProfile() {
    // Step 3: Prefill customer details from user profile
    const user = this.authService.getUser();
    if (user) {
      this.checkoutForm.patchValue({
        customerName: user.full_name || '',
        customerEmail: user.email || '',
        customerMobile: user.mobile_no || user.phone || ''
      });
    }

    // Try fetching fresh profile from API to ensure correct prefill
    this.apiService.getProfile().subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          this.checkoutForm.patchValue({
            customerName: res.data.full_name || this.checkoutForm.value.customerName,
            customerEmail: res.data.email || this.checkoutForm.value.customerEmail,
            customerMobile: res.data.mobile_no || this.checkoutForm.value.customerMobile
          });
        }
        this.pageLoading = false;
      },
      error: () => {
        this.pageLoading = false;
      }
    });
  }

  selectGateway(name: string) {
    this.selectedGatewayName = name;
  }

  onSubmitPayment() {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.errorMessage = 'Please fix form validation errors before proceeding.';
      return;
    }

    if (!this.selectedGatewayName) {
      this.errorMessage = 'Please choose a payment gateway to proceed.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formVal = this.checkoutForm.value;
    const initiatePayload: InitiatePaymentRequest = {
      order_id: this.orderId,
      amount: this.amount,
      gateway_name: this.selectedGatewayName,
      customer_name: formVal.customerName,
      customer_email: formVal.customerEmail,
      customer_mobile: formVal.customerMobile
    };

    // Step 4: Initiate session with backend
    this.paymentService.initiatePayment(initiatePayload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const details = res.data.checkout_details;
          
          if (res.data.gateway_name === 'razorpay') {
            this.handleRazorpayCheckout(details as any);
          } else if (res.data.gateway_name === 'cashfree') {
            this.handleCashfreeCheckout(details as any);
          } else if (res.data.gateway_name === 'payu') {
            this.handlePayUCheckout(details as any);
          } else {
            this.errorMessage = 'Unsupported gateway configuration returned.';
            this.loading = false;
          }
        } else {
          this.errorMessage = res.message || 'Payment initiation failed.';
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Payment initiation error', err);
        this.errorMessage = err?.error?.message || 'Server error initiating payment. Please try again.';
        this.loading = false;
      }
    });
  }

  private handleRazorpayCheckout(details: any) {
    this.razorpayService.pay(details).subscribe({
      next: (verifyRes) => {
        if (verifyRes.success) {
          this.router.navigate(['/payment-success'], { queryParams: { order_id: this.orderId } });
        } else {
          this.router.navigate(['/payment-failed'], { queryParams: { order_id: this.orderId, reason: verifyRes.message } });
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Razorpay Error', err);
        this.loading = false;
        if (err?.cancelled) {
          this.errorMessage = 'Payment window was dismissed. You can try checkout again.';
        } else {
          this.router.navigate(['/payment-failed'], { queryParams: { order_id: this.orderId, reason: err?.message || 'Verification failed.' } });
        }
      }
    });
  }

  private handleCashfreeCheckout(details: any) {
    this.cashfreeService.pay(details).subscribe({
      next: () => {
        // Redirection will trigger automatically, but set local loading state.
        console.log('Cashfree checkout triggered. Redirecting...');
      },
      error: (err) => {
        console.error('Cashfree Error', err);
        this.errorMessage = err?.message || 'Failed to launch Cashfree. Please retry.';
        this.loading = false;
      }
    });
  }

  private handlePayUCheckout(details: any) {
    try {
      this.payuService.submit(details);
    } catch (err: any) {
      console.error('PayU launch error', err);
      this.errorMessage = err?.message || 'Failed to redirect to PayU. Please retry.';
      this.loading = false;
    }
  }
}
