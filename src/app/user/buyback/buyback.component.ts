import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-buyback',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './buyback.component.html',
  styleUrls: ['./buyback.component.css']
})
export class BuybackComponent implements OnInit {
  loading = true;
  applications: any[] = [];
  bookings: any[] = [];
  applying = false;
  toast = '';
  toastType = 'success';
  selectedBookingId: number | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getBuybackStatus().subscribe({
      next: (res: any) => {
        if (res.success) this.applications = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
    this.api.getBookings().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.bookings = (res.data || []).filter((b: any) => b.booking_status === 'Confirmed');
        }
      }
    });
  }

  get basePrefix(): string {
    return this.router.url.startsWith('/associate') ? '/associate' : '/user';
  }

  alreadyApplied(bookingId: number) {
    return this.applications.some(a => a.booking_id === bookingId);
  }

  apply() {
    if (!this.selectedBookingId) return;
    this.applying = true;
    this.api.applyBuyback(this.selectedBookingId).subscribe({
      next: (res: any) => {
        this.showToast(res.message || 'Buyback application submitted successfully!', 'success');
        this.applying = false;
        this.selectedBookingId = null;
        this.ngOnInit();
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to submit buyback application', 'error');
        this.applying = false;
      }
    });
  }

  statusColor(s: string) {
    const m: any = { Pending: 'sbadge-yellow', Approved: 'sbadge-green', Rejected: 'sbadge-red', Processing: 'sbadge-blue' };
    return m[s] || 'sbadge-gray';
  }

  showToast(msg: string, type: string) {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 3500);
  }
}
