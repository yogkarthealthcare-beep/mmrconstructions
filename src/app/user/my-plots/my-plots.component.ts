import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-my-plots',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './my-plots.component.html',
  styleUrls: ['./my-plots.component.css']
})
export class MyPlotsComponent implements OnInit {
  loading = true;
  bookings: any[] = [];
  buybackModal: any = null;
  toast = '';
  searchTerm = '';
  statusFilter = 'all';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.loading = true;
    this.api.getBookings().subscribe({
      next: (res: any) => {
        if (res.success) this.bookings = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get basePrefix(): string {
    return this.router.url.startsWith('/associate') ? '/associate' : '/user';
  }

  get confirmedCount(): number {
    return this.bookings.filter(b => b.booking_status === 'Confirmed' || b.booking_status === 'Active').length;
  }

  get totalGaj(): number {
    return this.bookings.reduce((sum, b) => sum + Number(b.plot_area || 0), 0);
  }

  get totalAdvance(): number {
    return this.bookings.reduce((sum, b) => sum + Number(b.advance_amount || 0), 0);
  }

  get filteredBookings(): any[] {
    return this.bookings.filter(b => {
      const matchSearch = !this.searchTerm.trim() ||
        (b.plot_number || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (b.site_name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (b.booking_serial || '').toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'confirmed' && (b.booking_status === 'Confirmed' || b.booking_status === 'Active')) ||
        (this.statusFilter === 'pending' && (b.booking_status === 'PaymentPending' || b.booking_status === 'InProcess'));

      return matchSearch && matchStatus;
    });
  }

  applyBuyback(b: any) {
    this.api.applyBuyback(b.booking_id).subscribe({
      next: (res: any) => {
        this.toast = res.message || 'Buyback application submitted successfully!';
        setTimeout(() => this.toast = '', 3500);
        this.buybackModal = null;
      },
      error: (e: any) => {
        this.toast = e?.error?.message || 'Failed to submit buyback application';
        setTimeout(() => this.toast = '', 3500);
      }
    });
  }
}
