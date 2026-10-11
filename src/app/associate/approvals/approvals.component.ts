import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { BookingAttribution } from '../../services/booking-attribution.types';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-associate-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approvals.component.html',
  styleUrls: ['./approvals.component.css']
})
export class AssociateApprovalsComponent implements OnInit {
  allBookings: BookingAttribution[] = [];
  filteredBookings: BookingAttribution[] = [];
  activeTab: 'Pending' | 'Approved' | 'Rejected' | 'All' = 'Pending';
  loading = true;

  pendingCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  pendingOverdueCount = 0;

  constructor(private attributionApi: BookingAttributionApiService) {}

  ngOnInit(): void {
    this.loadApprovals();
  }

  loadApprovals(): void {
    this.loading = true;
    this.attributionApi.getAssociateBookingApprovals('All').subscribe({
      next: (data) => {
        this.allBookings = data || [];
        this.calculateCounts();
        this.setTab(this.activeTab);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load approvals:', err);
        this.loading = false;
      }
    });
  }

  calculateCounts(): void {
    this.pendingCount = this.allBookings.filter(b => b.associate_approval_status === 'Pending').length;
    this.approvedCount = this.allBookings.filter(b => b.associate_approval_status === 'Approved').length;
    this.rejectedCount = this.allBookings.filter(b => b.associate_approval_status === 'Rejected').length;
    this.pendingOverdueCount = this.allBookings.filter(b => b.associate_approval_status === 'Pending' && b.is_overdue).length;
  }

  setTab(tab: 'Pending' | 'Approved' | 'Rejected' | 'All'): void {
    this.activeTab = tab;
    if (tab === 'All') {
      this.filteredBookings = [...this.allBookings];
    } else {
      this.filteredBookings = this.allBookings.filter(b => b.associate_approval_status === tab);
    }
  }

  openApproveModal(booking: BookingAttribution): void {
    Swal.fire({
      title: 'Approve Booking?',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Booking Serial:</strong> <span class="text-success">${booking.booking_serial}</span></p>
          <p><strong>Customer:</strong> ${booking.customer_name || 'Customer'}</p>
          <p><strong>Team Member:</strong> ${booking.booked_by_name || 'Team Member'}</p>
          <p><strong>Plot Unit:</strong> Plot ${booking.plot_number} (${booking.site_name})</p>
          <p><strong>Advance Paid:</strong> ₹${booking.advance_amount}</p>
          <label class="form-label mt-2"><strong>Approval Notes (Optional):</strong></label>
          <textarea id="swal-approval-notes" class="form-control" rows="2" placeholder="e.g. Verified client KYC and payment..."></textarea>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#166534',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-check me-1"></i> Approve Booking',
      preConfirm: () => {
        const notesElem = document.getElementById('swal-approval-notes') as HTMLTextAreaElement;
        return notesElem ? notesElem.value.trim() : '';
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.submitDecision(booking.booking_id, 'approve', result.value);
      }
    });
  }

  openRejectModal(booking: BookingAttribution): void {
    Swal.fire({
      title: 'Reject Booking',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Booking Serial:</strong> ${booking.booking_serial}</p>
          <p>Please enter the specific reason for rejecting this booking. The reason will be documented and shared with the Team Member.</p>
          <label class="form-label mt-2"><strong>Rejection Reason <span class="text-danger">*</span>:</strong></label>
          <textarea id="swal-rejection-reason" class="form-control" rows="3" placeholder="Explain reason for rejection..."></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-times me-1"></i> Reject Booking',
      preConfirm: () => {
        const reasonElem = document.getElementById('swal-rejection-reason') as HTMLTextAreaElement;
        const val = reasonElem ? reasonElem.value.trim() : '';
        if (!val) {
          Swal.showValidationMessage('Rejection reason is mandatory.');
          return false;
        }
        return val;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.submitDecision(booking.booking_id, 'reject', undefined, result.value);
      }
    });
  }

  private submitDecision(bookingId: number, decision: 'approve' | 'reject', notes?: string, rejectionReason?: string): void {
    Swal.fire({
      title: 'Processing...',
      text: 'Submitting your approval decision.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.attributionApi.decideAssociateApproval(bookingId, {
      decision,
      decision_notes: notes,
      rejection_reason: rejectionReason
    }).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: decision === 'approve' ? 'Booking Approved!' : 'Booking Rejected',
          text: `Booking has been successfully ${decision === 'approve' ? 'approved' : 'rejected'}.`,
          confirmButtonColor: '#166534'
        });
        this.loadApprovals();
      },
      error: (err: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Decision Submission Failed',
          text: err.message || 'Unable to update booking status. It may have already been reviewed.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }
}
