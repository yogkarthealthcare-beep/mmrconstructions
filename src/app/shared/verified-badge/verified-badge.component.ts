import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verified-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span *ngIf="isUserVerified"
          class="verified-user-badge d-inline-flex align-items-center"
          [class.badge-xs]="size === 'xs'"
          [class.badge-sm]="size === 'sm'"
          [class.badge-md]="size === 'md'"
          [class.badge-lg]="size === 'lg'"
          [title]="tooltip"
          [attr.aria-label]="tooltip">
      <svg class="verified-tick-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path class="tick-bg" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.05 2.148-2.42 2.148-4z"/>
        <path class="tick-check" d="M10.2 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.3-5.3 1.4 1.4z"/>
      </svg>
      <span *ngIf="showLabel" class="verified-badge-label ms-1">Verified</span>
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      line-height: 1;
    }
    .verified-user-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s ease-in-out;
    }
    .verified-user-badge:hover {
      transform: scale(1.1);
    }
    .verified-tick-svg {
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
    }
    .tick-bg {
      fill: #1DA1F2;
    }
    .tick-check {
      fill: #FFFFFF;
    }
    .badge-xs .verified-tick-svg {
      width: 12px;
      height: 12px;
    }
    .badge-sm .verified-tick-svg {
      width: 15px;
      height: 15px;
    }
    .badge-md .verified-tick-svg {
      width: 18px;
      height: 18px;
    }
    .badge-lg .verified-tick-svg {
      width: 22px;
      height: 22px;
    }
    .verified-badge-label {
      font-size: 11px;
      font-weight: 700;
      color: #1DA1F2;
    }
  `]
})
export class VerifiedBadgeComponent {
  @Input() user?: any;
  @Input() isVerified?: boolean;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';
  @Input() tooltip: string = 'Verified - Enrollment Form Completed';
  @Input() showLabel: boolean = false;

  get isUserVerified(): boolean {
    if (this.isVerified !== undefined && this.isVerified !== null) {
      return Boolean(this.isVerified);
    }
    if (!this.user) return false;
    const u = this.user;

    // 1. Presence of enrollment record ID (Associate, Customer, Investor)
    const hasEnrollmentId = Boolean(
      u.customer_enrollment_id ||
      u.associate_enrollment_id ||
      u.investor_enrollment_id ||
      u.enrollment_id
    );

    // 2. Enrollment Status checks (Completed, Submitted, Approved)
    const status = String(
      u.enrollment_status ||
      u.enrollmentStatus ||
      u.enrollment_form_status ||
      u.app_status ||
      u.appStatus ||
      ''
    ).toLowerCase().trim();
    const hasCompletedStatus = status === 'completed' || status === 'submitted' || status === 'approved';

    // 3. Enrolled boolean flags
    const hasEnrolledFlag = (
      u.is_enrolled === true ||
      u.isEnrolled === true ||
      u.enrollment_completed === true ||
      u.enrollment_form_submitted === true ||
      u.has_enrollment === true
    );

    // If explicit is_verified or isVerified boolean is provided in user object
    if (u.is_verified !== undefined && typeof u.is_verified === 'boolean') {
      return u.is_verified && (hasEnrollmentId || hasCompletedStatus || hasEnrolledFlag);
    }
    if (u.isVerified !== undefined && typeof u.isVerified === 'boolean') {
      return u.isVerified && (hasEnrollmentId || hasCompletedStatus || hasEnrolledFlag);
    }

    return hasEnrollmentId || hasCompletedStatus || hasEnrolledFlag;
  }
}
