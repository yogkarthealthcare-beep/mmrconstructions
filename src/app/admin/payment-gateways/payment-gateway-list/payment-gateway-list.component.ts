import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaymentGatewayAdmin } from '../../../services/payment.types';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-payment-gateway-list',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  templateUrl: './payment-gateway-list.component.html',
  styleUrls: ['./payment-gateway-list.component.css']
})
export class PaymentGatewayListComponent {
  @Input() gateways: PaymentGatewayAdmin[] = [];
  @Input() defaultGateway: string = '';
  
  @Output() toggleStatus = new EventEmitter<PaymentGatewayAdmin>();
  @Output() setDefault = new EventEmitter<PaymentGatewayAdmin>();
  @Output() updatePriority = new EventEmitter<{ gateway: PaymentGatewayAdmin, priority: number }>();

  getLogoUrl(gw: PaymentGatewayAdmin): string {
    if (gw?.logo) return gw.logo;
    const name = (gw?.gateway_name || '').toLowerCase();
    if (name.includes('razorpay')) return 'https://rzp-mobile.s3.amazonaws.com/images/rzp.png';
    if (name.includes('cashfree')) return 'https://cashfree.com/favicon.ico';
    if (name.includes('payu')) return 'https://payu.in/favicon.ico';
    if (name.includes('phonepe')) return 'https://www.phonepe.com/favicon.ico';
    if (name.includes('paytm')) return 'https://paytm.com/favicon.ico';
    return 'https://cdn-icons-png.flaticon.com/512/893/893097.png';
  }

  onToggleStatus(gateway: PaymentGatewayAdmin) {
    this.toggleStatus.emit(gateway);
  }

  onSetDefault(gateway: PaymentGatewayAdmin) {
    if (gateway.status === 'active') {
      this.setDefault.emit(gateway);
    }
  }

  onPriorityChange(gateway: PaymentGatewayAdmin, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value)) {
      this.updatePriority.emit({ gateway, priority: value });
    }
  }
}
