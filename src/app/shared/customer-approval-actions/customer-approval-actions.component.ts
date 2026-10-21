import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-approval-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-approval-actions.component.html',
  styleUrls: ['./customer-approval-actions.component.css']
})
export class CustomerApprovalActionsComponent implements OnDestroy {
  @Input() customer: any;
  @Input() compact = false;
  @Output() updated = new EventEmitter<void>();

  showModal = false;
  submittingKey = '';
  private activeParentCard: HTMLElement | null = null;

  constructor(private api: ApiService) {}

  get canApproveAny(): boolean {
    return Boolean(
      this.customer?.can_approve_enrollment ||
      this.customer?.can_approve_documents ||
      this.customer?.can_verify_kyc
    );
  }

  get enrollment(): any {
    return this.customer?.enrollment_submission || null;
  }

  get docs(): any[] {
    return this.customer?.documents || [];
  }

  get kyc(): any {
    return this.customer?.kyc_profile || null;
  }

  get isEnrollmentApproved(): boolean {
    const s = String(this.enrollment?.application_status || '').toLowerCase();
    return s === 'approved' || s === 'completed';
  }

  get isEnrollmentRejected(): boolean {
    const s = String(this.enrollment?.application_status || '').toLowerCase();
    return s === 'rejected';
  }

  get isKycVerified(): boolean {
    const s = String(this.kyc?.status || this.customer?.account_status || '').toLowerCase();
    return s === 'approved' || s === 'verified' || s === 'active';
  }

  get isKycRejected(): boolean {
    const s = String(this.kyc?.status || '').toLowerCase();
    return s === 'rejected';
  }

  get verifiedDocsCount(): number {
    return this.docs.filter((d: any) => d.is_verified || String(d.review_status).toLowerCase() === 'approved').length;
  }

  openReviewModal(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
      const target = event.target as HTMLElement;
      this.activeParentCard = target?.closest('.team-member-pro-card') as HTMLElement | null;
      if (this.activeParentCard) {
        this.activeParentCard.classList.add('modal-active');
      }
    }
    if (typeof document !== 'undefined') {
      document.body.classList.add('approval-modal-open');
    }
    this.showModal = true;
  }

  closeReviewModal(): void {
    this.showModal = false;
    if (this.activeParentCard) {
      this.activeParentCard.classList.remove('modal-active');
      this.activeParentCard = null;
    }
    if (typeof document !== 'undefined') {
      document.body.classList.remove('approval-modal-open');
    }
  }

  ngOnDestroy(): void {
    if (this.activeParentCard) {
      this.activeParentCard.classList.remove('modal-active');
      this.activeParentCard = null;
    }
    if (typeof document !== 'undefined') {
      document.body.classList.remove('approval-modal-open');
    }
  }

  formatApprovedBy(name?: string, memberId?: string, role?: string, date?: string, fallback?: string): string {
    if (name) {
      const idStr = memberId ? ` (${memberId})` : '';
      const roleStr = role ? ` · ${role}` : '';
      const dateStr = date ? `, ${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : '';
      return `${name}${idStr}${roleStr}${dateStr}`;
    }
    if (fallback) return fallback;
    return '';
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return this.api.url(path);
  }

  // 1. Enrollment Form Approve
  approveEnrollment(): void {
    const targetUserId = this.customer?.user_id;
    if (!targetUserId) return;

    Swal.fire({
      title: 'Approve Enrollment Form?',
      html: `Confirm approval for customer <strong>${this.customer.full_name}</strong>?<br><small class="text-muted">Your name and member ID will be permanently logged in the audit record.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#166534',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Yes, Approve Form'
    }).then((result) => {
      if (result.isConfirmed) {
        this.submittingKey = 'enrollment-approve';
        this.api.approveCustomerEnrollment(targetUserId).subscribe({
          next: (res: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'success',
              title: 'Enrollment Form Approved!',
              text: res.message || 'Customer enrollment form approved successfully.',
              timer: 2000,
              showConfirmButton: false
            });
            this.updated.emit();
          },
          error: (err: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'error',
              title: 'Approval Denied',
              text: err.error?.message || 'Failed to approve enrollment form.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // 2. Enrollment Form Reject
  rejectEnrollment(): void {
    const targetUserId = this.customer?.user_id;
    if (!targetUserId) return;

    Swal.fire({
      title: 'Reject Enrollment Form',
      html: `Please provide specific reasons why <strong>${this.customer.full_name}</strong>'s enrollment form is rejected:`,
      input: 'textarea',
      inputPlaceholder: 'e.g. Incomplete address details / blurry signature...',
      inputValidator: (val) => {
        if (!val || !val.trim()) return 'Rejection reason is required!';
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-times-circle me-1"></i> Reject Enrollment'
    }).then((result) => {
      if (result.isConfirmed) {
        this.submittingKey = 'enrollment-reject';
        this.api.rejectCustomerEnrollment(targetUserId, result.value).subscribe({
          next: (res: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'info',
              title: 'Enrollment Rejected',
              text: res.message || 'Enrollment Form rejected. Reason documented.',
              confirmButtonColor: '#166534'
            });
            this.updated.emit();
          },
          error: (err: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'error',
              title: 'Rejection Failed',
              text: err.error?.message || 'Failed to reject enrollment form.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // 3. Document Verify
  verifyDoc(doc: any): void {
    const targetUserId = this.customer?.user_id;
    if (!targetUserId || !doc?.document_id) return;

    Swal.fire({
      title: 'Verify Document?',
      html: `Verify <strong>${doc.document_type}</strong> for <strong>${this.customer.full_name}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#166534',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-check me-1"></i> Verify'
    }).then((result) => {
      if (result.isConfirmed) {
        this.submittingKey = `doc-ver-${doc.document_id}`;
        this.api.verifyCustomerDocument(targetUserId, doc.document_id).subscribe({
          next: (res: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'success',
              title: 'Document Verified',
              text: res.message || 'Document verified successfully.',
              timer: 1600,
              showConfirmButton: false
            });
            this.updated.emit();
          },
          error: (err: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'error',
              title: 'Verification Failed',
              text: err.error?.message || 'Failed to verify document.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // 4. Document Reject
  rejectDoc(doc: any): void {
    const targetUserId = this.customer?.user_id;
    if (!targetUserId || !doc?.document_id) return;

    Swal.fire({
      title: 'Reject Document',
      html: `Please enter rejection reason for <strong>${doc.document_type}</strong>:`,
      input: 'textarea',
      inputPlaceholder: 'e.g. Document image is not clearly legible...',
      inputValidator: (val) => {
        if (!val || !val.trim()) return 'Rejection reason is required!';
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Reject'
    }).then((result) => {
      if (result.isConfirmed) {
        this.submittingKey = `doc-rej-${doc.document_id}`;
        this.api.rejectCustomerDocument(targetUserId, doc.document_id, result.value).subscribe({
          next: (res: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'info',
              title: 'Document Rejected',
              text: res.message || 'Document marked as rejected.',
              timer: 1600,
              showConfirmButton: false
            });
            this.updated.emit();
          },
          error: (err: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'error',
              title: 'Rejection Failed',
              text: err.error?.message || 'Failed to reject document.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // 5. KYC Verify
  verifyKyc(): void {
    const targetUserId = this.customer?.user_id;
    if (!targetUserId) return;

    Swal.fire({
      title: 'Verify & Activate Customer KYC?',
      html: `Verify KYC for <strong>${this.customer.full_name}</strong>? This validates identity and marks the customer active in the system.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#166534',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-shield-alt me-1"></i> Yes, Verify KYC'
    }).then((result) => {
      if (result.isConfirmed) {
        this.submittingKey = 'kyc-verify';
        this.api.verifyCustomerKyc(targetUserId).subscribe({
          next: (res: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'success',
              title: 'KYC Verified!',
              text: res.message || 'Customer KYC verified and account activated.',
              confirmButtonColor: '#166534'
            });
            this.updated.emit();
          },
          error: (err: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'error',
              title: 'Verification Failed',
              text: err.error?.message || 'Failed to verify KYC.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // 6. KYC Reject
  rejectKyc(): void {
    const targetUserId = this.customer?.user_id;
    if (!targetUserId) return;

    Swal.fire({
      title: 'Reject Customer KYC',
      html: `Please provide specific reasons why <strong>${this.customer.full_name}</strong>'s KYC is rejected:`,
      input: 'textarea',
      inputPlaceholder: 'e.g. Identity mismatch with submitted documents...',
      inputValidator: (val) => {
        if (!val || !val.trim()) return 'Rejection reason is required!';
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Reject KYC'
    }).then((result) => {
      if (result.isConfirmed) {
        this.submittingKey = 'kyc-reject';
        this.api.rejectCustomerKyc(targetUserId, result.value).subscribe({
          next: (res: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'info',
              title: 'KYC Rejected',
              text: res.message || 'Customer KYC marked as rejected.',
              confirmButtonColor: '#166534'
            });
            this.updated.emit();
          },
          error: (err: any) => {
            this.submittingKey = '';
            Swal.fire({
              icon: 'error',
              title: 'Rejection Failed',
              text: err.error?.message || 'Failed to reject KYC.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }
}
