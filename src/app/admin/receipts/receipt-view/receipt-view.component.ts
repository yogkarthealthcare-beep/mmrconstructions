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
  pdfLoading = false;

  settings: any = {
    company_name: 'MMR Construction & Developers',
    company_logo: '',
    address: 'Tribhuvan Kheda, Sheshpur, Unnao, Uttar Pradesh, India, 209801',
    cin: 'U68200UP2025PTC229203',
    gst_number: '09AATCM6753A1Z5',
    phone: '+91 95111 19879',
    email: 'official@mmrconstructions.in',
    signature_url: ''
  };

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.receiptId = this.route.snapshot.paramMap.get('id') || '';
    const shouldPrint = this.route.snapshot.queryParamMap.get('print') === 'true';

    // 1. Fetch Company Invoice Settings
    this.api.get('/api/admin/invoice-settings', {}, true).subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.company_name) {
          this.settings = { ...this.settings, ...res.data };
        }
      },
      error: () => {}
    });

    // 2. Fetch Receipt Details
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

  getBalance(receipt: any): number {
    if (!receipt) return 0;
    const total = Number(receipt.receipt_amount || 0);
    const paid = Number(receipt.paid_amount || 0);
    return Math.max(0, total - paid);
  }

  getQrUrl(receipt: any): string {
    if (!receipt) return '';
    const data = `Receipt No: ${receipt.receipt_no || ''}\nSerial No: #${receipt.serial_no || ''}\nCustomer: ${receipt.customer_name || ''}\nAmount Paid: INR ${receipt.paid_amount || 0}\nDate: ${receipt.receipt_date || ''}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(data)}`;
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

  private loadHtml2Pdf(): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).html2pdf) {
      return Promise.resolve((window as any).html2pdf);
    }
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') return reject('No document');
      const existing = document.getElementById('html2pdf-cdn');
      if (existing) {
        existing.addEventListener('load', () => resolve((window as any).html2pdf));
        return;
      }
      const script = document.createElement('script');
      script.id = 'html2pdf-cdn';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  async downloadPdf(): Promise<void> {
    if (!this.receipt) return;
    const invNum = this.receipt?.receipt_no || `Receipt-${this.receiptId}`;
    const element = typeof document !== 'undefined' ? document.getElementById('receipt-sheet') : null;

    if (!element) {
      this.downloadPdfFromBackend();
      return;
    }

    this.pdfLoading = true;
    try {
      const html2pdf = await this.loadHtml2Pdf();
      const opt = {
        margin: [4, 4, 4, 4],
        filename: `Receipt-${invNum.replace(/[\/\\]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 1200 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      this.downloadPdfFromBackend();
    } finally {
      this.pdfLoading = false;
    }
  }

  private downloadPdfFromBackend(): void {
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
        window.print();
      }
    });
  }
}
