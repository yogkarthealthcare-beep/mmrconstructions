import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-receipt-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './receipt-view.component.html',
  styleUrls: ['./receipt-view.component.css']
})
export class ReceiptViewComponent implements OnInit {
  loading = true;
  receipt: any = null;
  amountInWords = '';
  auditLogs: any[] = [];
  receiptId: string = '';
  error = '';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.receiptId = this.route.snapshot.paramMap.get('id') || '';
    const shouldPrint = this.route.snapshot.queryParamMap.get('print') === 'true';

    if (this.receiptId) {
      this.api.adminGetReceiptById(this.receiptId).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success && res.data) {
            this.receipt = res.data.receipt;
            this.amountInWords = res.data.amountInWords || '';
            this.auditLogs = res.data.auditLogs || [];

            if (shouldPrint) {
              setTimeout(() => {
                window.print();
              }, 500);
            }
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to load receipt details.';
        }
      });
    }
  }

  print(): void {
    window.print();
  }

  downloadPdf(): void {
    if (!this.receipt) return;
    this.api.adminGetReceiptPdfBlob(this.receipt.id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Receipt-${this.receipt.receipt_no.replace(/[\/\\]/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Failed to download PDF receipt.');
      }
    });
  }
}
