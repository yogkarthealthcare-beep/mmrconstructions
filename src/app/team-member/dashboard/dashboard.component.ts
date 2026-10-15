import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { SalesTrackerSummary, CustomerSalesRow } from '../../services/booking-attribution.types';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';

@Component({
  selector: 'app-team-member-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, VerifiedBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class TeamMemberDashboardComponent implements OnInit {
  currentUser: any = null;
  summary: SalesTrackerSummary | null = null;
  recentSales: CustomerSalesRow[] = [];
  loading = true;

  constructor(
    private auth: AuthService,
    private attributionApi: BookingAttributionApiService
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
    this.attributionApi.getTeamMemberSalesSummary(userId).subscribe({
      next: (sum) => {
        this.summary = sum;
        this.loadRecentSales(userId);
      },
      error: (err) => {
        console.error('Error loading TM summary:', err);
        this.loadRecentSales(userId);
      }
    });
  }

  loadRecentSales(userId: number): void {
    this.attributionApi.getTeamMemberCustomersSales(userId, { page: 1, limit: 5 }).subscribe({
      next: (res) => {
        this.recentSales = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading recent sales:', err);
        this.loading = false;
      }
    });
  }
}
