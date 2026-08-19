import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  loading = true;
  emis: any[] = [];
  searchTerm = '';
  selectedReceipt: any = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.api.getEmis().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.emis = (res.data || []).filter((e: any) => e.emi_status === 'Paid');
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get totalPaid(): number {
    return this.emis.reduce((s, e) => s + Number(e.paid_amount || e.emi_amount || 0), 0);
  }

  get filteredEmis(): any[] {
    if (!this.searchTerm.trim()) return this.emis;
    const q = this.searchTerm.toLowerCase().trim();
    return this.emis.filter(e =>
      (e.plot_number || '').toLowerCase().includes(q) ||
      (e.site_name || '').toLowerCase().includes(q) ||
      (e.installment_no || '').toString().includes(q)
    );
  }

  viewReceipt(receipt: any) {
    this.selectedReceipt = receipt;
  }

  printReceipt() {
    window.print();
  }
}
