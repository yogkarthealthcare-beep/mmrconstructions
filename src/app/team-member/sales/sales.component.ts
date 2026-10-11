import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { CustomerSalesRow } from '../../services/booking-attribution.types';

@Component({
  selector: 'app-team-member-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class TeamMemberSalesComponent implements OnInit {
  sales: CustomerSalesRow[] = [];
  filteredSales: CustomerSalesRow[] = [];
  loading = true;

  saleTypeFilter: 'ALL' | 'CUSTOMER_SALE' | 'SELF_PURCHASE' = 'ALL';
  approvalFilter: string = 'ALL';
  searchQuery = '';

  constructor(
    private auth: AuthService,
    private attributionApi: BookingAttributionApiService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user?.user_id) {
      this.loadSales(user.user_id);
    } else {
      this.loading = false;
    }
  }

  loadSales(userId: number): void {
    this.loading = true;
    this.attributionApi.getTeamMemberCustomersSales(userId, { page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.sales = res.data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load TM sales:', err);
        this.loading = false;
      }
    });
  }

  setSaleType(type: 'ALL' | 'CUSTOMER_SALE' | 'SELF_PURCHASE'): void {
    this.saleTypeFilter = type;
    this.applyFilters();
  }

  setApproval(status: string): void {
    this.approvalFilter = status;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const q = this.searchQuery.toLowerCase().trim();

    this.filteredSales = this.sales.filter(s => {
      // Sale type filter
      if (this.saleTypeFilter !== 'ALL' && s.sale_type !== this.saleTypeFilter) {
        return false;
      }

      // Approval status filter
      if (this.approvalFilter !== 'ALL' && s.associate_approval_status !== this.approvalFilter) {
        return false;
      }

      // Search query filter
      if (q) {
        const serial = String(s.booking_serial || '').toLowerCase();
        const name = String(s.customer_name || '').toLowerCase();
        const plot = String(s.plot_number || '').toLowerCase();
        const site = String(s.site_name || '').toLowerCase();
        if (!serial.includes(q) && !name.includes(q) && !plot.includes(q) && !site.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }
}
