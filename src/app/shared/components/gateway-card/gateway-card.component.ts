import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentGateway } from '../../../services/payment.types';

@Component({
  selector: 'app-gateway-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="gateway-card" 
      [class.selected]="selected" 
      [class.maintenance]="gateway.status === 'maintenance'"
      (click)="onCardClick()"
    >
      <div class="gc-border-indicator"></div>
      
      <div class="gc-content">
        <!-- Logo and Display Name -->
        <div class="gc-info">
          <div class="gc-logo-wrap">
            <img 
              *ngIf="gateway.logo; else fallbackLogo" 
              [src]="gateway.logo" 
              [alt]="gateway.display_name" 
              class="gc-logo"
              (error)="useFallback = true"
              [hidden]="useFallback"
            />
            <ng-template #fallbackLogo>
              <div class="gc-logo-fallback">
                <i class="fas fa-credit-card"></i>
              </div>
            </ng-template>
          </div>
          
          <div class="gc-details">
            <h6 class="gc-name">{{ gateway.display_name }}</h6>
            <span class="gc-mode" *ngIf="gateway.mode && gateway.mode !== 'production' && gateway.mode !== 'live'">
              {{ gateway.mode | uppercase }} Mode
            </span>
          </div>
        </div>

        <!-- Selection Radio Icon -->
        <div class="gc-selection">
          <div class="gc-radio" [class.checked]="selected">
            <i class="fas fa-check-circle" *ngIf="selected"></i>
          </div>
        </div>
      </div>

      <!-- Maintenance Alert -->
      <div class="gc-maintenance-banner" *ngIf="gateway.status === 'maintenance'">
        <i class="fas fa-tools"></i> Under Maintenance
      </div>
    </div>
  `,
  styles: [`
    .gateway-card {
      position: relative;
      background: #ffffff;
      border: 1px solid #e8ece9;
      border-radius: var(--r-lg);
      padding: 16px;
      cursor: pointer;
      transition: transform .2s, box-shadow .2s, border-color .2s;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .gateway-card:hover:not(.maintenance) {
      transform: translateY(-2px);
      box-shadow: var(--sh-md);
      border-color: var(--clr-primary-lt);
    }

    .gateway-card.selected {
      border-color: var(--clr-primary);
      background: var(--clr-primary-bg);
    }

    .gateway-card.maintenance {
      opacity: 0.65;
      cursor: not-allowed;
      background: #f9fafb;
      border-color: #e5e7eb;
    }

    .gc-border-indicator {
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: transparent;
      transition: background-color .15s;
    }

    .selected .gc-border-indicator {
      background: var(--clr-primary);
    }

    .gc-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      flex: 1;
    }

    .gc-info {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .gc-logo-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--r-md);
      background: #f9fafb;
      border: 1px solid #e8ece9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .gc-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 4px;
    }

    .gc-logo-fallback {
      font-size: 18px;
      color: var(--txt-muted);
    }

    .gc-details {
      display: flex;
      flex-direction: column;
    }

    .gc-name {
      font-family: var(--ff-ui);
      font-size: 14px;
      font-weight: 600;
      color: var(--txt-h);
      margin: 0;
    }

    .gc-mode {
      font-size: 9px;
      font-weight: 700;
      color: var(--clr-gold-dk);
      background: var(--clr-gold-bg);
      padding: 1px 6px;
      border-radius: var(--r-full);
      margin-top: 3px;
      width: fit-content;
    }

    .gc-selection {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gc-radio {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      color: transparent;
      transition: all .15s;
    }

    .gc-radio.checked {
      border-color: var(--clr-primary);
      color: var(--clr-primary);
      background: #fff;
    }

    .gc-radio i {
      font-size: 16px;
    }

    .gc-maintenance-banner {
      margin-top: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #b45309;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `]
})
export class GatewayCardComponent {
  @Input() gateway!: PaymentGateway;
  @Input() selected: boolean = false;
  
  @Output() select = new EventEmitter<void>();

  useFallback = false;

  onCardClick() {
    if (this.gateway.status !== 'maintenance') {
      this.select.emit();
    }
  }
}
