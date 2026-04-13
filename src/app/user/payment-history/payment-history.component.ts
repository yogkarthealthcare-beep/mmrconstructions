import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-payment-history', standalone: true, imports: [CommonModule], templateUrl: './payment-history.component.html' })
export class PaymentHistoryComponent implements OnInit {
  loading = true; emis: any[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getEmis().subscribe({
      next: (res: any) => { if (res.success) this.emis = (res.data || []).filter((e: any) => e.emi_status === 'Paid'); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  get totalPaid() { return this.emis.reduce((s, e) => s + +e.paid_amount, 0); }
}
