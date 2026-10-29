import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { CustomerApprovalActionsComponent } from '../../shared/customer-approval-actions/customer-approval-actions.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-team-member-customer-enrollments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomerApprovalActionsComponent],
  templateUrl: './team-member-customer-enrollments.component.html',
  styleUrls: ['./team-member-customer-enrollments.component.css']
})
export class TeamMemberCustomerEnrollmentsComponent implements OnInit {
  loading = true;
  submitting = false;
  customers: any[] = [];
  filteredCustomers: any[] = [];

  // Search & Filters
  searchQuery = '';
  statusFilter = 'all'; // 'all' | 'pending' | 'approved' | 'rejected'

  // Form View Modal State
  selectedCustomer: any = null;
  selectedEnrollment: any = null;
  formDetailLoading = false;
  showFormModal = false;

  constructor(
    private api: ApiService,
    private attributionApi: BookingAttributionApiService
  ) {}

  ngOnInit(): void {
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    this.loading = true;
    Promise.all([
      this.api.getMyCustomersForApproval().toPromise().catch(() => []),
      this.attributionApi.getMyBookableCustomers().toPromise().catch(() => [])
    ]).then(([approvalList, bookableList]: [any, any]) => {
      const approvalMap = new Map<number, any>();
      const rawApproval: any[] = Array.isArray(approvalList) ? approvalList : (approvalList?.data || []);
      const rawBookable: any[] = Array.isArray(bookableList) ? bookableList : (bookableList?.data || []);

      for (const item of rawApproval) {
        if (item.user_id) approvalMap.set(Number(item.user_id), item);
      }

      // Combine approval customers and bookable customers
      const combinedList: any[] = [];
      const seenIds = new Set<number>();

      for (const item of rawApproval) {
        const uid = Number(item.user_id);
        seenIds.add(uid);
        combinedList.push({
          ...item,
          user_id: uid,
          enrollment_submission: item.enrollment_submission || null,
          has_enrollment: Boolean(item.enrollment_submission || item.application_status || item.application_no)
        });
      }

      for (const b of rawBookable) {
        const uid = Number(b.user_id);
        if (!seenIds.has(uid)) {
          seenIds.add(uid);
          combinedList.push({
            ...b,
            user_id: uid,
            enrollment_submission: b.enrollment_submission || null,
            has_enrollment: Boolean(b.enrollment_submission || b.application_status || b.application_no)
          });
        }
      }

      this.customers = combinedList;
      this.applyFilters();
      this.loading = false;
    }).catch(err => {
      console.error('Failed to load customer enrollments:', err);
      this.loading = false;
    });
  }

  applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    const st = this.statusFilter;

    this.filteredCustomers = this.customers.filter(c => {
      const enr = c.enrollment_submission;
      const appStatus = String(enr?.application_status || c.application_status || c.enrollment_status || 'Pending').toLowerCase();

      // Status filter
      let matchStatus = true;
      if (st === 'pending') {
        matchStatus = appStatus === 'pending' || appStatus.includes('hold') || (!c.enrollment_submission && !c.enrollment_status);
      } else if (st === 'approved') {
        matchStatus = appStatus === 'approved' || appStatus === 'completed';
      } else if (st === 'rejected') {
        matchStatus = appStatus === 'rejected' || appStatus === 'cancelled';
      }

      // Query filter
      const matchQuery = !q ||
        String(c.full_name || '').toLowerCase().includes(q) ||
        String(c.mobile_no || '').includes(q) ||
        String(c.member_id || '').toLowerCase().includes(q) ||
        String(enr?.application_no || c.application_no || '').toLowerCase().includes(q);

      return matchStatus && matchQuery;
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(filter: string): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  get stats() {
    const total = this.customers.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const c of this.customers) {
      const enr = c.enrollment_submission;
      const st = String(enr?.application_status || c.application_status || c.enrollment_status || 'Pending').toLowerCase();
      if (st === 'approved' || st === 'completed') approved++;
      else if (st === 'rejected' || st === 'cancelled') rejected++;
      else pending++;
    }

    return { total, pending, approved, rejected };
  }

  // ── Open Form Details Modal ──
  viewSubmittedForm(customer: any): void {
    this.selectedCustomer = customer;
    this.selectedEnrollment = customer.enrollment_submission || null;
    this.showFormModal = true;
    this.formDetailLoading = true;

    const lookupId = customer.enrollment_submission?.id || customer.submission_id || customer.user_id;
    if (lookupId) {
      this.api.adminGetCustomerEnrollment(lookupId).subscribe({
        next: (res: any) => {
          this.formDetailLoading = false;
          const data = res.data || res;
          if (data) {
            this.selectedEnrollment = { ...(this.selectedEnrollment || {}), ...data };
          }
        },
        error: () => {
          this.formDetailLoading = false;
        }
      });
    } else {
      this.formDetailLoading = false;
    }
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.selectedCustomer = null;
    this.selectedEnrollment = null;
  }

  // ── Team Member Approve Form ──
  approveCustomer(customer: any): void {
    const uid = customer?.user_id;
    if (!uid) return;

    Swal.fire({
      title: 'Approve Customer Enrollment?',
      html: `Are you sure you want to approve enrollment form for <strong>${customer.full_name || 'this customer'}</strong>?<br><small class="text-muted">Your approval will activate this customer's profile.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#166534',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Yes, Approve'
    }).then((res) => {
      if (res.isConfirmed) {
        this.submitting = true;
        this.api.approveCustomerEnrollment(uid).subscribe({
          next: (response: any) => {
            this.submitting = false;
            Swal.fire({
              icon: 'success',
              title: 'Enrollment Approved!',
              text: response.message || 'Customer enrollment approved successfully.',
              timer: 2000,
              showConfirmButton: false
            });
            this.closeFormModal();
            this.loadEnrollments();
          },
          error: (err: any) => {
            this.submitting = false;
            Swal.fire({
              icon: 'error',
              title: 'Approval Failed',
              text: err?.error?.message || 'Failed to approve enrollment form.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  // ── Team Member Reject Form ──
  rejectCustomer(customer: any): void {
    const uid = customer?.user_id;
    if (!uid) return;

    Swal.fire({
      title: 'Reject Customer Enrollment',
      html: `Please provide reason for rejecting <strong>${customer.full_name}</strong>'s enrollment form:`,
      input: 'textarea',
      inputPlaceholder: 'e.g. Incomplete address details or document mismatch...',
      inputValidator: (val) => {
        if (!val || !val.trim()) return 'Reason is required!';
        return null;
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="fas fa-times-circle me-1"></i> Reject Form'
    }).then((res) => {
      if (res.isConfirmed) {
        this.submitting = true;
        this.api.rejectCustomerEnrollment(uid, res.value).subscribe({
          next: (response: any) => {
            this.submitting = false;
            Swal.fire({
              icon: 'info',
              title: 'Enrollment Rejected',
              text: response.message || 'Enrollment form has been rejected. Reason logged.',
              timer: 2500,
              showConfirmButton: false
            });
            this.closeFormModal();
            this.loadEnrollments();
          },
          error: (err: any) => {
            this.submitting = false;
            Swal.fire({
              icon: 'error',
              title: 'Rejection Failed',
              text: err?.error?.message || 'Failed to reject enrollment form.',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return this.api.url(path);
  }

  downloadPdf(customer: any): void {
    const subId = customer?.enrollment_submission?.id || customer?.submission_id;
    if (!subId) {
      Swal.fire('Info', 'Application submission ID not found.', 'info');
      return;
    }

    this.api.downloadCustomerPdf(subId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR-Customer-${customer.member_id || 'Enrollment'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire('Error', 'Failed to generate customer enrollment PDF.', 'error');
      }
    });
  }
}
