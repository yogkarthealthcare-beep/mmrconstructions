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
