import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-my-plots', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './my-plots.component.html' })
export class MyPlotsComponent implements OnInit {
  loading = true; bookings: any[] = [];
  buybackModal: any = null; toast = '';

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getBookings().subscribe({
      next: (res: any) => { if (res.success) this.bookings = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyBuyback(b: any) {
    this.api.applyBuyback(b.booking_id).subscribe({
      next: (res: any) => {
        this.toast = res.message || 'Buyback applied!';
        setTimeout(() => this.toast = '', 3500);
        this.buybackModal = null;
      },
      error: (e: any) => { this.toast = e?.error?.message || 'Error'; setTimeout(() => this.toast = '', 3000); }
    });
  }
}
