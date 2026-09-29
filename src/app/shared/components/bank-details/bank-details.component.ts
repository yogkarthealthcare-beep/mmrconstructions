import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BankDetailField, COMPANY_BANK_DETAILS } from './bank-details.data';

@Component({
  selector: 'app-bank-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bank-details.component.html',
  styleUrls: ['./bank-details.component.css']
})
export class BankDetailsComponent {
  @Input() title: string = 'BANK DETAILS FOR PAYMENT';
  @Input() subtitle: string = 'Please transfer funds to the official MMR company bank account below:';
  @Input() details: BankDetailField[] = COMPANY_BANK_DETAILS;
  @Input() compact: boolean = false;
  @Input() showFooterNote: boolean = true;

  copiedKey: string | null = null;
  private copyTimeout: any = null;

  copyToClipboard(text: string, key: string) {
    if (!text) return;

    const handleSuccess = () => {
      this.copiedKey = key;
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      this.copyTimeout = setTimeout(() => {
        this.copiedKey = null;
      }, 2200);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(handleSuccess).catch(() => {
        this.fallbackCopyText(text, handleSuccess);
      });
    } else {
      this.fallbackCopyText(text, handleSuccess);
    }
  }

  private fallbackCopyText(text: string, cb: () => void) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) cb();
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
  }
}
