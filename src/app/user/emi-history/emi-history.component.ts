import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-emi-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emi-history.component.html',
  styleUrls: ['./emi-history.component.css']
})
export class EmiHistoryComponent implements OnInit {
  loading = true;
  emis: any[] = [];
  toast = '';
  uploadingId: number | null = null;
  searchTerm = '';
  statusFilter = 'all';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.api.getEmis().subscribe({
      next: (res: any) => {
        if (res.success) this.emis = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get paidCount(): number {
    return this.emis.filter(e => e.emi_status === 'Paid').length;
  }

  get totalPaid(): number {
    return this.emis.filter(e => e.emi_status === 'Paid').reduce((s, e) => s + Number(e.paid_amount || e.emi_amount || 0), 0);
  }

  get nextDue(): any {
    return this.emis.find(e => e.emi_status === 'Pending' || e.emi_status === 'Overdue');
  }

  get overdueCount(): number {
    return this.emis.filter(e => e.emi_status === 'Overdue' || (e.overdue_days > 0 && e.emi_status !== 'Paid')).length;
  }

  get filteredEmis(): any[] {
    return this.emis.filter(e => {
      const matchSearch = !this.searchTerm.trim() ||
        (e.plot_number || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (e.site_name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (e.installment_no || '').toString().includes(this.searchTerm);

      const matchStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'paid' && e.emi_status === 'Paid') ||
        (this.statusFilter === 'pending' && (e.emi_status === 'Pending' || e.emi_status === 'ProofSubmitted')) ||
        (this.statusFilter === 'overdue' && (e.emi_status === 'Overdue' || e.overdue_days > 0));

      return matchSearch && matchStatus;
    });
  }

  uploadProof(emiId: number, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingId = emiId;
    const form = new FormData();
    form.append('payment_proof', file);
    form.append('payment_mode', 'UPI');
    this.api.uploadEmiProof(emiId, form).subscribe({
      next: (res: any) => {
        this.toast = res.message || 'Payment proof submitted successfully for verification!';
        const emi = this.emis.find(e => e.emi_id === emiId);
        if (emi) emi.emi_status = 'ProofSubmitted';
        this.uploadingId = null;
        setTimeout(() => this.toast = '', 4000);
      },
      error: (e: any) => {
        this.toast = e?.error?.message || 'Upload failed. Please try again.';
        this.uploadingId = null;
        setTimeout(() => this.toast = '', 4000);
      }
    });
  }
}
