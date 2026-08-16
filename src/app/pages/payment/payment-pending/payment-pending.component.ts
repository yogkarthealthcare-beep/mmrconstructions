import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-payment-pending',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './payment-pending.component.html',
  styleUrls: ['./payment-pending.component.css']
})
export class PaymentPendingComponent implements OnInit, OnDestroy {
  orderId: string = '';
  attempts = 0;
  maxAttempts = 5;
  statusChecked = false;
  verifySubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.orderId = params['order_id'] || params['orderId'] || '';
      if (this.orderId) {
        this.runVerificationAndPoll();
      } else {
        this.statusChecked = true;
      }
    });
  }

  ngOnDestroy() {
    this.verifySubscription?.unsubscribe();
  }

  private runVerificationAndPoll() {
    // Step 1: Trigger server check for Cashfree verify endpoint
    this.paymentService.verifyCashfreePayment(this.orderId).subscribe({
      next: () => {
        this.pollPaymentStatus();
      },
      error: () => {
        // If verification call errors, attempt general poll status anyway
        this.pollPaymentStatus();
      }
    });
  }

  private pollPaymentStatus() {
    // Poll status every 2.5 seconds up to maxAttempts (5 times = ~12 seconds)
    this.verifySubscription = interval(2500)
      .pipe(take(this.maxAttempts))
      .subscribe({
        next: () => {
          this.attempts++;
          this.paymentService.getPaymentStatus(this.orderId).subscribe({
            next: (res) => {
              if (res.success && res.data) {
                const status = res.data.payment_status;
                if (status === 'success') {
                  this.verifySubscription?.unsubscribe();
                  this.router.navigate(['/payment-success'], { queryParams: { order_id: this.orderId } });
                } else if (status === 'failed') {
                  this.verifySubscription?.unsubscribe();
                  this.router.navigate(['/payment-failed'], { queryParams: { order_id: this.orderId, reason: res.data.failure_reason || 'Transaction failed.' } });
                }
              }
            },
            error: (err) => console.error('Error polling status', err)
          });
          
          if (this.attempts >= this.maxAttempts) {
            this.statusChecked = true;
          }
        },
        complete: () => {
          this.statusChecked = true;
        }
      });
  }
}
