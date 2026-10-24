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

  // Allows toggling second copy between Admin Copy and Associate Copy
  overrideRole: 'admin' | 'associate' | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') || '';
    const shouldPrint = this.route.snapshot.queryParamMap.get('print') === 'true';
    const isAdmin = typeof window !== 'undefined' && Boolean(
      sessionStorage.getItem('mmr_admin_token') || localStorage.getItem('mmr_admin_token')
    );

    this.api.get(`/api/invoice/${this.bookingId}`, {}, isAdmin).subscribe({
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
    const invType = String(this.data?.invoice_type || '').toLowerCase();
    const payStatus = String(this.invoice?.payment_status || this.data?.payment_status || '').toLowerCase();
    const bal = Number(this.invoice?.balance_amount ?? this.data?.balance_amount ?? 0);
    return Boolean(
      this.data?.is_one_time ||
      payType.includes('full') ||
      payType.includes('onetime') ||
      payType.includes('one time') ||
      payType.includes('one-time') ||
      invType.includes('full') ||
      invType.includes('onetime') ||
      (bal === 0 && !this.isEmi) ||
      (payStatus === 'completed' && bal === 0 && !this.isEmi) ||
      (payStatus === 'paid' && bal === 0 && !this.isEmi)
    );
  }

  get isEmi(): boolean {
    const payType = String(this.data?.payment_type || this.data?.payment_method || this.invoice?.payment_method || this.data?.invoice_type || '').toLowerCase();
    return Boolean(
      this.data?.is_emi ||
      payType.includes('emi') ||
      payType.includes('installment') ||
      (this.emiSchedules && this.emiSchedules.length > 0)
    );
  }

  get isPartPayment(): boolean {
    if (this.isOneTime || this.isEmi) return false;
    const payType = String(this.data?.payment_type || this.data?.payment_method || this.invoice?.payment_method || '').toLowerCase();
    const invType = String(this.data?.invoice_type || '').toLowerCase();
    const bal = Number(this.invoice?.balance_amount ?? this.data?.balance_amount ?? 0);
    return Boolean(
      this.data?.is_part_wise ||
      payType.includes('part') ||
      invType.includes('part') ||
      bal > 0
    );
  }

  get noticeDetails(): { badge: string; hindi: string; english: string } {
    if (this.isOneTime) {
      return {
        badge: 'ONE TIME FULL PAYMENT',
        hindi: 'Invoice ko sambhal kar rakhe. Thanks.',
        english: 'Please keep this invoice safe. Thanks.'
      };
    } else if (this.isEmi) {
      return {
        badge: 'INSTALLMENT / EMI PLAN',
        hindi: 'Invoice ko sambhal kar rakhe payment dispute me apka saathi.',
        english: 'Keep this invoice safe, your companion in payment disputes.'
      };
    } else {
      return {
        badge: 'PART-WISE PAYMENT',
        hindi: 'Remaining amount ko 15 din me settle karna anivarya hai.',
        english: 'It is mandatory to settle the remaining amount within 15 days.'
      };
    }
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

  get isAssociateViewer(): boolean {
    if (this.overrideRole) {
      return this.overrideRole === 'associate';
    }
    if (typeof window === 'undefined') return false;

    // 1. Explicit query param (e.g. ?copy=associate or ?from=associate or ?role=associate)
    const qp = (this.route.snapshot.queryParamMap.get('copy') ||
                this.route.snapshot.queryParamMap.get('from') ||
                this.route.snapshot.queryParamMap.get('role') || '').toLowerCase();
    if (qp === 'associate' || qp === 'member') return true;
    if (qp === 'admin') return false;

    // 2. Referrer check
    if (typeof document !== 'undefined' && document.referrer) {
      if (document.referrer.includes('/associate')) return true;
      if (document.referrer.includes('/admin')) return false;
    }

    // 3. Current URL check
    if (window.location.pathname.includes('/associate')) return true;
    if (window.location.pathname.includes('/admin')) return false;

    // 4. Stored user check
    const adminToken = sessionStorage.getItem('mmr_admin_token') || localStorage.getItem('mmr_admin_token');
    const userStr = sessionStorage.getItem('mmr_user') || localStorage.getItem('mmr_user');
    if (userStr && !adminToken) {
      try {
        const u = JSON.parse(userStr);
        if (u.role === 'associate' || u.role === 'team_member' || u.is_associate) return true;
      } catch {}
    }

    return false;
  }

  get secondaryCopyTitle(): string {
    return this.isAssociateViewer ? 'ASSOCIATE COPY' : 'ADMIN COPY';
  }

  toggleRole() {
    this.overrideRole = this.isAssociateViewer ? 'admin' : 'associate';
  }

  pdfLoading = false;

  print() {
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

  async downloadPdf() {
    const invNum = this.invoice?.invoice_number || this.bookingId || 'MMR-Invoice';
    const element = typeof document !== 'undefined' ? document.getElementById('invoice-sheet') : null;

    if (!element) {
      this.downloadPdfFromBackend(invNum);
      return;
    }

    this.pdfLoading = true;
    try {
      const html2pdf = await this.loadHtml2Pdf();
      const opt = {
        margin: [4, 4, 4, 4],
        filename: `${invNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 1200 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.warn('Direct html2pdf generation failed, falling back to backend PDF endpoint:', err);
      this.downloadPdfFromBackend(invNum);
    } finally {
      this.pdfLoading = false;
    }
  }

  private downloadPdfFromBackend(invNum: string) {
    const isAdmin = typeof window !== 'undefined' && Boolean(
      sessionStorage.getItem('mmr_admin_token') || localStorage.getItem('mmr_admin_token')
    );
    this.api.getBlob(`/api/invoice/${invNum}/pdf`, isAdmin).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invNum}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        window.print();
      }
    });
  }

  downloadImage() {
    window.print();
  }
}
