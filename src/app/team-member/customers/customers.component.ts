import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
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

  constructor(
    private attributionApi: BookingAttributionApiService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    Promise.all([
      this.attributionApi.getMyBookableCustomers().toPromise().catch(() => []),
      this.api.getMyCustomersForApproval().toPromise().catch(() => [])
    ]).then(([bookableList, approvalList]) => {
      const approvalMap = new Map<number, any>();
      if (Array.isArray(approvalList)) {
        for (const item of approvalList) {
          approvalMap.set(Number(item.user_id), item);
        }
      }

      // Merge original bookable customer list with approval data
      const merged = (bookableList || []).map((c: any) => {
        const uid = Number(c.user_id);
        const appInfo = approvalMap.get(uid);
        return {
          ...c,
          ...(appInfo || {}),
          user_id: c.user_id,
          full_name: c.full_name || appInfo?.full_name,
          member_id: c.member_id || appInfo?.member_id,
          mobile_no: c.mobile_no || appInfo?.mobile_no,
          email: c.email || appInfo?.email,
          account_status: c.account_status || appInfo?.account_status
        };
      });

      this.customers = merged;
      this.applyFilter();
      this.loading = false;
    }).catch(err => {
      console.error('Failed to load customers:', err);
      this.loading = false;
    });
  }

  onSearchInput(): void {
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
      String(c.member_id || '').toLowerCase().includes(q)
    );
  }

  bookForCustomer(customer: any): void {
    this.router.navigate(['/team-member/book-plot'], {
      queryParams: {
        customerId: customer.user_id,
        customerName: customer.full_name
      }
    });
  }
}
