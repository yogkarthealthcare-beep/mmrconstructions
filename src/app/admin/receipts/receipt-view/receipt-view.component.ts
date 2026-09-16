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
            this.amountInWords = res.data.amountInWords || this.numberToWordsHelper(Number(this.receipt?.paid_amount) || 0);
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

  numberToWordsHelper(num: number): string {
    if (!num || num === 0) return 'Zero Rupees Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
    };

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    let str = inWords(whole) + ' Rupees';
    if (fraction > 0) {
      str += ' and ' + inWords(fraction) + ' Paise';
    }
    return str + ' Only';
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
