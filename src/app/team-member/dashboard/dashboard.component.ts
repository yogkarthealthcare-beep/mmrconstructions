import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { SalesTrackerSummary, CustomerSalesRow, BookableCustomer } from '../../services/booking-attribution.types';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';

@Component({
  selector: 'app-team-member-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VerifiedBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class TeamMemberDashboardComponent implements OnInit {
  currentUser: any = null;
  summary: SalesTrackerSummary | null = null;
  allSales: CustomerSalesRow[] = [];
  recentSales: CustomerSalesRow[] = [];
  customers: BookableCustomer[] = [];
  filteredCustomers: BookableCustomer[] = [];
  
  loading = true;
  loadingCustomers = false;
  searchCustomer = '';
  activeTab: 'customers' | 'sales' = 'customers';

  // 4 Core Commission & Wallet Metrics (Part 3 A)
  totalCommissionEarned = 0;
  pendingCommission = 0;
  availableBalance = 0;
  withdrawnAmount = 0;

  // 6 Core Metrics requested by User
  activeUsersCount = 0;
  processingCount = 0;
  soldCount = 0;
  cancelledCount = 0;
  totalSalesCount = 0;
  totalSalesValue = 0;
  totalGajSold = 0;

  get isEnrollmentPending(): boolean {
    return !this.auth.isEnrollmentCompleted();
  }

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private attributionApi: BookingAttributionApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();
    if (this.currentUser?.user_id) {
      this.loadDashboardData(this.currentUser.user_id);
    } else {
      this.loading = false;
    }
  }

  loadDashboardData(userId: number): void {
    this.loading = true;
    this.loadingCustomers = true;

    // Load Summary, Sales, Customers, and Commission Summary in parallel
    Promise.all([
      this.attributionApi.getTeamMemberSalesSummary(userId).toPromise().catch(() => null),
      this.attributionApi.getTeamMemberCustomersSales(userId, { page: 1, limit: 100 }).toPromise().catch(() => ({ data: [], total: 0 })),
      this.api.getTeamMemberCustomers().toPromise().then((res: any) => res?.data || (Array.isArray(res) ? res : [])).catch(() => this.attributionApi.getMyBookableCustomers().toPromise().catch(() => [])),
      this.api.getTeamMemberCommissionSummary().toPromise().catch(() => null)
    ]).then(([sumRes, salesRes, custList, commRes]) => {
      this.summary = sumRes || null;
      this.allSales = salesRes?.data || [];
      this.recentSales = this.allSales.slice(0, 5);
      this.customers = custList || [];
      this.filteredCustomers = [...this.customers];

      if (commRes?.success && commRes.data) {
        this.totalCommissionEarned = Number(commRes.data.total_commission_earned || 0);
        this.pendingCommission = Number(commRes.data.pending_commission || 0);
        this.availableBalance = Number(commRes.data.available_balance || 0);
        this.withdrawnAmount = Number(commRes.data.withdrawn_amount || 0);
      }

      this.computeStats();

      this.loading = false;
      this.loadingCustomers = false;
    }).catch(err => {
      console.error('Error loading dashboard data:', err);
      this.loading = false;
      this.loadingCustomers = false;
    });
  }

  computeStats(): void {
    const kpis = this.summary?.kpis || {};

    // 1. Active Users / Customers
    const activeFromCust = this.customers.filter(c =>
      !c.account_status || c.account_status === 'Active' || c.account_status === 'Approved'
    ).length;
    this.activeUsersCount = kpis.active_customers_count ?? this.summary?.active_customers_count ?? (activeFromCust || this.customers.length);

    // 2. Processing Bookings / Deals
    const processingFromSales = this.allSales.filter(s =>
      ['Submitted', 'PaymentPending', 'Allocated', 'Under Process', 'Processing', 'Pending'].includes(s.booking_status) ||
      s.associate_approval_status === 'Pending'
    ).length;
    this.processingCount = kpis.processing_count ?? this.summary?.processing_count ?? processingFromSales;

    // 3. Sold / Confirmed Deals
    const soldFromSales = this.allSales.filter(s =>
      s.booking_status === 'Confirmed' || s.booking_status === 'Sold' || s.associate_approval_status === 'Approved'
    ).length;
    this.soldCount = kpis.plots_sold ?? kpis.plots_sold_count ?? this.summary?.plots_sold_count ?? this.summary?.plots_sold ?? soldFromSales;

    // 4. Cancelled Deals
    const cancelledFromSales = this.allSales.filter(s =>
      s.booking_status === 'Cancelled' || s.booking_status === 'Rejected' || s.associate_approval_status === 'Rejected'
    ).length;
    this.cancelledCount = kpis.cancelled_deals_count ?? this.summary?.cancelled_deals_count ?? cancelledFromSales;

    // 5. Total Sales Count
    this.totalSalesCount = kpis.total_sales_count ?? this.summary?.total_sales_count ?? (this.soldCount + this.processingCount);

    // 6. Total Sales Value & Gaj
    const totalValFromSales = this.allSales
      .filter(s => s.booking_status === 'Confirmed' || s.booking_status === 'Sold' || s.associate_approval_status === 'Approved')
      .reduce((acc, curr) => acc + (Number(curr.advance_amount) || 0), 0);
    this.totalSalesValue = kpis.total_sales_value ?? this.summary?.total_sales_value ?? totalValFromSales;

    const gajFromSales = this.allSales
      .filter(s => s.booking_status === 'Confirmed' || s.booking_status === 'Sold')
      .reduce((acc, curr) => acc + (Number(curr.plot_size_gaj) || 0), 0);
    this.totalGajSold = kpis.total_gaj_sold ?? this.summary?.total_gaj_sold ?? gajFromSales;
  }

  onSearchCustomer(): void {
    const q = this.searchCustomer.toLowerCase().trim();
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
