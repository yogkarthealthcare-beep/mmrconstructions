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

  get isOneTime(): boolean {
    const payType = String(this.data?.payment_type || this.data?.payment_method || this.invoice?.payment_method || '').toLowerCase();
    return Boolean(this.data?.is_one_time || payType.includes('full') || payType.includes('onetime') || payType.includes('one time'));
  }

  get isPartPayment(): boolean {
    const payType = String(this.data?.payment_type || this.data?.payment_method || this.invoice?.payment_method || '').toLowerCase();
    return Boolean(this.data?.is_part_wise || payType.includes('part') || (!this.isOneTime && !this.isEmi && Number(this.invoice?.balance_amount || this.data?.balance_amount || 0) > 0));
  }

  get isEmi(): boolean {
    const payType = String(this.data?.payment_type || this.data?.payment_method || this.invoice?.payment_method || this.data?.invoice_type || '').toLowerCase();
    return Boolean(this.data?.is_emi || payType.includes('emi') || payType.includes('installment') || (this.emiSchedules && this.emiSchedules.length > 0));
  }

  get emiSchedules(): any[] {
    return this.invoice?.emi_schedules || this.data?.emi_schedules || [];
  }

  get isIndividualEmi(): boolean {
    return Boolean(this.data?.emi_id || this.data?.installment_no || (this.data?.invoice_type && String(this.data.invoice_type).includes('EMI')));
  }

  get nextDueDate(): any {
    return this.data?.part_wise_deadline_at || this.invoice?.part_wise_deadline_at || this.data?.due_date || this.invoice?.next_due_date || null;
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
