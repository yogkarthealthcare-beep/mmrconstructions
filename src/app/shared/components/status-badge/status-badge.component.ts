import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="sbadge" [ngClass]="badgeClass">
      {{ label }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status: string = '';

  get badgeClass(): string {
    const s = this.status?.toLowerCase().trim();
    switch (s) {
      case 'success':
      case 'paid':
      case 'active':
      case 'confirmed':
        return 'sbadge-green';
      case 'failed':
      case 'inactive':
      case 'cancelled':
      case 'error':
        return 'sbadge-red';
      case 'pending':
      case 'maintenance':
      case 'paymentpending':
      case 'inprocess':
        return 'sbadge-yellow';
      case 'refunded':
      case 'refund':
        return 'sbadge-blue';
      default:
        return 'sbadge-gray';
    }
  }

  get label(): string {
    const s = this.status?.trim();
    if (!s) return 'Unknown';
    // Format camelCase or snake_case nicely
    if (s === 'paymentpending' || s === 'PaymentPending') return 'Payment Pending';
    if (s === 'inprocess' || s === 'InProcess') return 'In Process';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
