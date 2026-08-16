import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [class]="btnClass"
      [disabled]="disabled || loading"
      (click)="onClick($event)"
      style="position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px;"
    >
      <!-- Loading spinner -->
      <span *ngIf="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      
      <!-- FontAwesome Icon (if configured and not loading) -->
      <i *ngIf="icon && !loading" [class]="icon"></i>
      
      <!-- Button Text -->
      <span>{{ loading ? loadingText : text }}</span>
    </button>
  `,
  styles: [`
    .spinner-border {
      width: 1rem;
      height: 1rem;
      border-width: 0.2em;
    }
  `]
})
export class LoadingButtonComponent {
  @Input() text: string = 'Submit';
  @Input() loadingText: string = 'Processing...';
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() btnClass: string = 'btn btn-green';
  @Input() icon: string = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  @Output() btnClick = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    if (!this.loading && !this.disabled) {
      this.btnClick.emit(event);
    }
  }
}
