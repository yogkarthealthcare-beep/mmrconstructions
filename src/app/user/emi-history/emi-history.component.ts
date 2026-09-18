import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-emi-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './emi-history.component.html',
  styleUrls: ['./emi-history.component.css']
})
export class EmiHistoryComponent implements OnInit {
  loading = true;
  emis: any[] = [];
  plots: string[] = [];
  selectedPlot = 'all';
  toast = '';
  toastType = 'success';
  searchTerm = '';
  statusFilter = 'all';
  downloadingPdfId: number | null = null;
  selectedReceipt: any = null;

  // Proof Modal
  activeUploadEmi: any = null;
  proofSubmitting = false;
  proofForm: any = {
    payment_mode: 'UPI',
    reference_number: '',
    amount: '',
    proof_file: null as File | null
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.api.getEmis().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.emis = res.data || [];
          this.extractPlots();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  extractPlots() {
    const set = new Set<string>();
    this.emis.forEach(e => {
      if (e.plot_number) {
        set.add(`Plot ${e.plot_number}${e.site_name ? ' (' + e.site_name + ')' : ''}`);
      }
    });
    this.plots = Array.from(set);
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
      const q = this.searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (e.plot_number || '').toLowerCase().includes(q) ||
        (e.site_name || '').toLowerCase().includes(q) ||
        (e.installment_no || '').toString().includes(q);

      const matchPlot = this.selectedPlot === 'all' ||
        `Plot ${e.plot_number}${e.site_name ? ' (' + e.site_name + ')' : ''}` === this.selectedPlot;

      const matchStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'paid' && e.emi_status === 'Paid') ||
        (this.statusFilter === 'pending' && (e.emi_status === 'Pending' || e.emi_status === 'ProofSubmitted')) ||
        (this.statusFilter === 'overdue' && (e.emi_status === 'Overdue' || (e.overdue_days > 0 && e.emi_status !== 'Paid')));

      return matchSearch && matchPlot && matchStatus;
    });
  }

  openUploadModal(emi: any) {
    this.activeUploadEmi = emi;
    this.proofForm = {
      payment_mode: 'UPI',
      reference_number: '',
      amount: emi.emi_amount || '',
      proof_file: null
    };
  }

  onFileChange(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.proofForm.proof_file = file;
    }
  }

  submitProof() {
    if (!this.activeUploadEmi) return;
    if (!this.proofForm.proof_file) {
      this.showToast('Please choose a receipt file or payment screenshot.', 'error');
      return;
    }

    this.proofSubmitting = true;
    const form = new FormData();
    form.append('payment_proof', this.proofForm.proof_file);
    form.append('payment_mode', this.proofForm.payment_mode || 'UPI');
    form.append('transaction_reference', this.proofForm.reference_number || '');
    if (this.proofForm.amount) {
      form.append('amount', this.proofForm.amount.toString());
    }

    this.api.uploadEmiProof(this.activeUploadEmi.emi_id, form).subscribe({
      next: (res: any) => {
        this.showToast(res.message || 'Payment proof submitted! Under Verification by Admin.', 'success');
        this.activeUploadEmi.emi_status = 'ProofSubmitted';
        this.activeUploadEmi = null;
        this.proofSubmitting = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Upload failed. Please try again.', 'error');
        this.proofSubmitting = false;
      }
    });
  }

  downloadOfficialPdf(emi: any) {
    this.downloadingPdfId = emi.emi_id;
    this.api.downloadReceiptPdf(emi.emi_id).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdfId = null;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR_Receipt_Plot_${emi.plot_number}_Inst_${emi.installment_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('Official PDF Receipt downloaded successfully!', 'success');
      },
      error: () => {
        this.downloadingPdfId = null;
        // Fallback: open voucher modal preview
        this.selectedReceipt = emi;
      }
    });
  }

  viewReceiptModal(emi: any) {
    this.selectedReceipt = emi;
  }

  printReceipt() {
    window.print();
  }

  showToast(msg: string, type = 'success') {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }
}
