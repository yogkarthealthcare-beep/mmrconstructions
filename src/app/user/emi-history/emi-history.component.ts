import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-emi-history', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './emi-history.component.html' })
export class EmiHistoryComponent implements OnInit {
  loading = true; emis: any[] = []; toast = ''; uploadingId: number|null = null;

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getEmis().subscribe({
      next: (res: any) => { if (res.success) this.emis = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get paidCount()  { return this.emis.filter(e => e.emi_status === 'Paid').length; }
  get totalPaid()  { return this.emis.filter(e => e.emi_status === 'Paid').reduce((s,e) => s + +e.paid_amount, 0); }
  get nextDue()    { return this.emis.find(e => e.emi_status === 'Pending'); }
  get overdueCount(){ return this.emis.filter(e => e.emi_status === 'Overdue').length; }

  uploadProof(emiId: number, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingId = emiId;
    const form = new FormData();
    form.append('payment_proof', file);
    form.append('payment_mode', 'UPI');
    this.api.uploadEmiProof(emiId, form).subscribe({
      next: (res: any) => {
        this.toast = res.message || 'Proof submitted!';
        const emi = this.emis.find(e => e.emi_id === emiId);
        if (emi) emi.emi_status = 'ProofSubmitted';
        this.uploadingId = null;
        setTimeout(() => this.toast = '', 3500);
      },
      error: (e: any) => { this.toast = e?.error?.message || 'Upload failed'; this.uploadingId = null; }
    });
  }
}
