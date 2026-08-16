import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel-card payment-summary-card">
      <div class="summary-header">
        <h5>Order Details</h5>
        <div class="order-badge">#{{ orderId }}</div>
      </div>
      
      <div class="summary-body">
        <!-- Main Amount Highlight -->
        <div class="amount-highlight">
          <span class="currency">₹</span>
          <span class="value">{{ amount | number:'1.2-2' }}</span>
          <span class="label">Total Amount Payable</span>
        </div>

        <hr class="summary-divider" />

        <!-- Detail Grid -->
        <div class="details-grid">
          <div class="detail-row">
            <span class="detail-label">Customer Name</span>
            <span class="detail-val">{{ customerName || '—' }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Email Address</span>
            <span class="detail-val text-truncate" [title]="customerEmail">{{ customerEmail || '—' }}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Mobile Number</span>
            <span class="detail-val">{{ customerMobile || '—' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-summary-card {
      background: #ffffff;
      border: 1px solid #e8ece9;
      border-radius: var(--r-xl);
      overflow: hidden;
      padding: 0;
    }

    .summary-header {
      background: #fafcfb;
      padding: 18px 24px;
      border-bottom: 1px solid #e8ece9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .summary-header h5 {
      font-family: var(--ff-ui);
      font-size: 15px;
      font-weight: 700;
      color: var(--txt-h);
      margin: 0;
    }

    .order-badge {
      font-family: var(--ff-body);
      font-size: 11px;
      font-weight: 700;
      background: var(--clr-primary-bg);
      color: var(--clr-primary);
      padding: 4px 10px;
      border-radius: var(--r-full);
    }

    .summary-body {
      padding: 24px;
    }

    .amount-highlight {
      text-align: center;
      padding: 12px 0 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .amount-highlight .currency {
      font-family: var(--ff-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--clr-primary-lt);
      line-height: 1;
    }

    .amount-highlight .value {
      font-family: var(--ff-display);
      font-size: 38px;
      font-weight: 900;
      color: var(--clr-primary);
      line-height: 1.1;
      margin: 4px 0;
    }

    .amount-highlight .label {
      font-size: 11.5px;
      color: var(--txt-muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .summary-divider {
      border: 0;
      border-top: 1.5px dashed #e5e7eb;
      margin: 20px 0;
    }

    .details-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-size: 13.5px;
    }

    .detail-label {
      color: var(--txt-muted);
      font-weight: 500;
      flex-shrink: 0;
    }

    .detail-val {
      color: var(--txt-h);
      font-weight: 600;
      text-align: right;
    }
  `]
})
export class PaymentSummaryComponent {
  @Input() orderId: string = '';
  @Input() amount: number = 0;
  @Input() customerName: string = '';
  @Input() customerEmail: string = '';
  @Input() customerMobile: string = '';
}
