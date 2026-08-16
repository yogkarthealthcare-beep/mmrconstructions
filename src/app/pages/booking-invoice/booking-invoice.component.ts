import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-booking-invoice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './booking-invoice.component.html',
  styleUrls: ['./booking-invoice.component.css'],
})
export class BookingInvoiceComponent implements OnInit {
  loading = true;
  invoice: any = null;
  settings: any = null;
  qrCode: string = '';
  barcode: string = '';
  verifyUrl: string = '';
  bookingId: string = '';
  error: string = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') || '';
    const shouldPrint = this.route.snapshot.queryParamMap.get('print') === 'true';

    this.api.get(`/api/invoice/${this.bookingId}`).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.invoice = res.data.invoice;
          this.settings = res.data.settings || {};
          this.qrCode = res.data.qr_code || '';
          this.barcode = res.data.barcode || '';
          this.verifyUrl = res.data.verify_url || '';

          if (shouldPrint) {
            setTimeout(() => { window.print(); }, 500);
          }
        }
      },
      error: (e: any) => {
        this.loading = false;
        this.error = e?.error?.message || 'Invoice is not available.';
      },
    });
  }

  get data() {
    return this.invoice?.invoice_data || this.invoice || {};
  }

  print() {
    window.print();
  }

  downloadPdf() {
    const invNum = this.invoice?.invoice_number || this.bookingId;
    this.api.getBlob(`/api/invoice/${invNum}/pdf`).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invNum}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        alert(err?.error?.message || 'Failed to download PDF');
      }
    });
  }

  downloadImage() {
    window.print();
  }
}
