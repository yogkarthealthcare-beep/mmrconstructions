import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CustomerApprovalActionsComponent } from '../../shared/customer-approval-actions/customer-approval-actions.component';

@Component({
  selector: 'app-team-member-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomerApprovalActionsComponent],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class TeamMemberCustomersComponent implements OnInit {
  customers: any[] = [];
  filteredCustomers: any[] = [];
  loading = true;
  searchQuery = '';

  // Order Details Modal
  selectedCustomer: any = null;
  showOrdersModal = false;
  expandedBookingId: number | null = null;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    Promise.all([
      this.api.getTeamMemberCustomers().toPromise().catch(() => ({ success: false, data: [] })),
      this.api.getMyCustomersForApproval().toPromise().catch(() => [])
    ]).then(([teamCustRes, approvalList]: [any, any]) => {
      const approvalMap = new Map<number, any>();
      const rawApproval: any[] = Array.isArray(approvalList) ? approvalList : (approvalList?.data || []);
      for (const item of rawApproval) {
        if (item.user_id) approvalMap.set(Number(item.user_id), item);
      }

      const rawCustList: any[] = teamCustRes?.data || (Array.isArray(teamCustRes) ? teamCustRes : []);

      const merged = rawCustList.map((c: any) => {
        const uid = Number(c.user_id);
        const appInfo = approvalMap.get(uid);
        return {
          ...c,
          ...(appInfo || {}),
          user_id: c.user_id,
          full_name: c.full_name || appInfo?.full_name || 'Valued Customer',
          member_id: c.member_id || appInfo?.member_id || `CUS-${c.user_id}`,
          mobile_no: c.mobile_no || appInfo?.mobile_no || '—',
          email: c.email || appInfo?.email || '—',
          account_status: c.account_status || appInfo?.account_status || 'Active',
          bookings: c.bookings || []
        };
      });

      // Include any from approvalMap not yet in merged
      for (const appItem of rawApproval) {
        const uid = Number(appItem.user_id);
        if (!merged.some(m => Number(m.user_id) === uid)) {
          merged.push({
            ...appItem,
            full_name: appItem.full_name || 'Valued Customer',
            member_id: appItem.member_id || `CUS-${appItem.user_id}`,
            mobile_no: appItem.mobile_no || '—',
            email: appItem.email || '—',
            account_status: appItem.account_status || 'Active',
            bookings: appItem.bookings || []
          });
        }
      }

      this.customers = merged;
      this.applyFilter();
      this.loading = false;
    }).catch(err => {
      console.error('Failed to load team member customers:', err);
      this.loading = false;
    });
  }

  onSearchInput(): void {
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredCustomers = [...this.customers];
      return;
    }
    this.filteredCustomers = this.customers.filter(c =>
      String(c.full_name || '').toLowerCase().includes(q) ||
      String(c.mobile_no || '').includes(q) ||
      String(c.member_id || '').toLowerCase().includes(q) ||
      String(c.city || '').toLowerCase().includes(q)
    );
  }

  // Summary Metrics
  get totalPlotsCount(): number {
    return this.customers.reduce((sum, c) => sum + (c.bookings_count || c.bookings?.length || 0), 0);
  }

  get totalGajSold(): number {
    return this.customers.reduce((sum, c) => sum + Number(c.total_gaj || 0), 0);
  }

  get totalVolumeSold(): number {
    return this.customers.reduce((sum, c) => sum + Number(c.total_value || 0), 0);
  }

  // Modal Controls
  openOrdersModal(customer: any): void {
    this.selectedCustomer = customer;
    this.showOrdersModal = true;
    if (customer.bookings && customer.bookings.length === 1) {
      this.expandedBookingId = customer.bookings[0].booking_id;
    } else {
      this.expandedBookingId = null;
    }
  }

  closeOrdersModal(): void {
    this.showOrdersModal = false;
    this.selectedCustomer = null;
    this.expandedBookingId = null;
  }

  toggleBookingDetail(bookingId: number): void {
    this.expandedBookingId = this.expandedBookingId === bookingId ? null : bookingId;
  }

  bookForCustomer(customer: any): void {
    this.closeOrdersModal();
    this.router.navigate(['/team-member/book-plot'], {
      queryParams: {
        customerId: customer.user_id,
        customerName: customer.full_name
      }
    });
  }
}
