import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  templateUrl: './payment-status.component.html',
  styleUrls: ['./payment-status.component.css']
})
export class PaymentStatusComponent implements OnInit {
  orderId: string = '';
  paymentData: any = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('orderId');
      if (id) {
        this.orderId = id;
        this.fetchStatus();
      } else {
        this.errorMessage = 'No Order ID provided in url.';
        this.loading = false;
      }
    });
  }

  fetchStatus() {
    this.loading = true;
    this.errorMessage = '';
    
    this.paymentService.getPaymentStatus(this.orderId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.paymentData = res.data;
        } else {
          this.errorMessage = res.message || 'Payment status record not found.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching status', err);
        this.errorMessage = err?.error?.message || 'Unable to retrieve status details from server.';
        this.loading = false;
      }
    });
  }
}
