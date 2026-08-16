import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirm-dialog-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="confirm-dialog-box" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="cd-header">
          <h5>{{ title }}</h5>
          <button class="cd-close-btn" (click)="onCancel()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="cd-body">
          <p>{{ message }}</p>
        </div>

        <!-- Footer -->
        <div class="cd-footer">
          <button class="btn btn-outline-green btn-sm" (click)="onCancel()">
            {{ cancelText }}
          </button>
          
          <button [class]="confirmClass + ' btn-sm'" (click)="onConfirm()">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    .confirm-dialog-box {
      background: #ffffff;
      border-radius: var(--r-lg);
      box-shadow: var(--sh-xl);
      width: 100%;
      max-width: 400px;
      margin: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: scaleUp 0.23s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .cd-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e8ece9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .cd-header h5 {
      font-family: var(--ff-ui);
      font-size: 14.5px;
      font-weight: 700;
      color: var(--txt-h);
      margin: 0;
    }

    .cd-close-btn {
      color: var(--txt-muted);
      font-size: 14px;
      cursor: pointer;
      transition: color 0.15s;
    }

    .cd-close-btn:hover {
      color: var(--txt-h);
    }

    .cd-body {
      padding: 20px;
    }

    .cd-body p {
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--txt-body);
      margin: 0;
    }

    .cd-footer {
      background: #fafcfb;
      padding: 12px 20px;
      border-top: 1px solid #e8ece9;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class ConfirmationDialogComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() confirmClass: string = 'btn btn-green';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
