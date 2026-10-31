import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-associate-team-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './team-sales.component.html',
  styleUrls: ['./team-sales.component.css']
})
export class AssociateTeamSalesComponent implements OnInit {
  sales: any[] = [];
  filteredSales: any[] = [];
  loading = true;
  exporting = false;
  searchQuery = '';

  constructor(
    private auth: AuthService,
    private attributionApi: BookingAttributionApiService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user?.user_id) {
      this.loadTeamSales(user.user_id);
    } else {
      this.loading = false;
    }
  }

  loadTeamSales(associateId: number): void {
    this.loading = true;
    this.attributionApi.getAssociateTeamSales(associateId, { page: 1, limit: 100 }).subscribe({
      next: (res: any) => {
        const raw = res?.data || res || [];
        this.sales = Array.isArray(raw) ? raw : (raw.sales || raw.team_sales || raw.bookings || raw.team_members || []);
        this.applyFilter();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load team sales:', err);
        this.loading = false;
      }
    });
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredSales = [...this.sales];
      return;
    }
    this.filteredSales = this.sales.filter(s =>
      String(s.booking_serial || '').toLowerCase().includes(q) ||
      String(s.team_member_name || s.sold_by_name || '').toLowerCase().includes(q) ||
      String(s.customer_name || '').toLowerCase().includes(q) ||
      String(s.plot_number || '').toLowerCase().includes(q)
    );
  }

  exportCsv(): void {
    this.exporting = true;
    this.attributionApi.exportAssociateTeamSalesCsv().subscribe({
      next: (blob: Blob) => {
        this.exporting = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `associate-team-sales-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.exporting = false;
        Swal.fire({
          icon: 'error',
          title: 'Export Failed',
          text: err.message || 'Unable to download CSV export. Please try again.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }
}
