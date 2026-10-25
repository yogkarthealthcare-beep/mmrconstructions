import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminPaymentGatewayService } from '../../services/admin-payment-gateway.service';

export interface UpiPaymentDetails {
  qr_code_key: string;
  upi_id: string;
  payer_name: string;
  utr_number: string;
  proof_file: File | null;
  proof_preview_url: string | null;
  is_valid: boolean;
}

@Component({
  selector: 'app-upi-qr-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upi-qr-payment.component.html',
  styleUrls: ['./upi-qr-payment.component.css']
})
export class UpiQrPaymentComponent implements OnInit {
  @Input() advanceAmount: number = 0;
  @Input() isDarkTheme: boolean = false;
  @Output() paymentDetailsChange = new EventEmitter<UpiPaymentDetails>();

  activeQrs: any[] = [];
  selectedQrKey: string = 'qr1';
  selectedQr: any = null;

  payerName: string = '';
  utrNumber: string = '';
  proofFile: File | null = null;
  proofPreviewUrl: string | null = null;

  copiedUpi: boolean = false;
  loadingQrs: boolean = true;
  fallbackQrImage: string = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=mmrconstructions@hdfcbank&pn=MMR%20Constructions%20Pvt%20Ltd&cu=INR';

  constructor(private adminService: AdminPaymentGatewayService) {}

  ngOnInit(): void {
    this.loadActiveQrs();
  }

  loadActiveQrs(): void {
    this.loadingQrs = true;
    this.adminService.getActiveUpiQrs().subscribe({
      next: (res: any) => {
        const rows = res?.data || (Array.isArray(res) ? res : []);
        if (rows && rows.length > 0) {
          this.activeQrs = rows;
          const primary = rows.find((q: any) => q.is_primary) || rows[0];
          this.selectQr(primary.qr_code_key);
        } else {
          // Default fallback mock QR if none configured yet
          this.activeQrs = [
            {
              qr_code_key: 'qr1',
              label: 'Primary UPI QR (HDFC Bank)',
              upi_id: 'mmrconstructions@hdfcbank',
              qr_image_url: null,
              is_primary: true
            }
          ];
          this.selectQr('qr1');
        }
        this.loadingQrs = false;
        this.emitChanges();
      },
      error: () => {
        this.activeQrs = [
          {
            qr_code_key: 'qr1',
            label: 'Primary UPI QR (HDFC Bank)',
            upi_id: 'mmrconstructions@hdfcbank',
            qr_image_url: null,
            is_primary: true
          }
        ];
        this.selectQr('qr1');
        this.loadingQrs = false;
        this.emitChanges();
      }
    });
  }

  selectQr(key: string): void {
    this.selectedQrKey = key;
    this.selectedQr = this.activeQrs.find(q => q.qr_code_key === key) || this.activeQrs[0];
    this.emitChanges();
  }

  getQrImageUrl(): string {
    if (this.selectedQr?.qr_image_url) {
      return this.selectedQr.qr_image_url;
    }
    const upi = this.selectedQr?.upi_id || 'mmrconstructions@hdfcbank';
    const amountParam = this.advanceAmount > 0 ? `&am=${this.advanceAmount}` : '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=${encodeURIComponent(upi)}&pn=MMR%20Constructions&cu=INR${amountParam}`;
  }

  copyUpiId(): void {
    if (!this.selectedQr?.upi_id) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(this.selectedQr.upi_id).then(() => {
        this.copiedUpi = true;
        setTimeout(() => this.copiedUpi = false, 2500);
      });
    } else {
      const el = document.createElement('textarea');
      el.value = this.selectedQr.upi_id;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.copiedUpi = true;
      setTimeout(() => this.copiedUpi = false, 2500);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.proofFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.proofPreviewUrl = reader.result as string;
        this.emitChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeProof(): void {
    this.proofFile = null;
    this.proofPreviewUrl = null;
    this.emitChanges();
  }

  onFieldChange(): void {
    this.emitChanges();
  }

  get isValid(): boolean {
    const hasPayer = Boolean(this.payerName && this.payerName.trim().length >= 2);
    const hasUtr = Boolean(this.utrNumber && this.utrNumber.trim().length >= 4);
    const hasProof = Boolean(this.proofFile || this.proofPreviewUrl);
    return hasPayer && hasUtr && hasProof;
  }

  emitChanges(): void {
    this.paymentDetailsChange.emit({
      qr_code_key: this.selectedQrKey,
      upi_id: this.selectedQr?.upi_id || '',
      payer_name: this.payerName.trim(),
      utr_number: this.utrNumber.trim(),
      proof_file: this.proofFile,
      proof_preview_url: this.proofPreviewUrl,
      is_valid: this.isValid
    });
  }
}
