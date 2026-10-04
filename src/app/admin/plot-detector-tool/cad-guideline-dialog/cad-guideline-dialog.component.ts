import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UNIT_TYPES, SUPPORT_LAYERS, buildCadGuidelineText } from '../../../shared/unit-types.config';

@Component({
  selector: 'app-cad-guideline-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cad-guideline-dialog.component.html',
  styleUrls: ['./cad-guideline-dialog.component.css']
})
export class CadGuidelineDialogComponent {
  @Input() show = false;
  @Output() close = new EventEmitter<void>();

  unitTypes = UNIT_TYPES;
  supportLayers = SUPPORT_LAYERS;
  includeDevNotes = false;
  copied = false;
  showDevAccordion = false;

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.show) {
      this.closeModal();
    }
  }

  closeModal() {
    this.close.emit();
  }

  async copyGuideline() {
    const text = buildCadGuidelineText(this.includeDevNotes);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2200);
    } catch (err) {
      console.error('Failed to copy guideline text:', err);
    }
  }

  downloadTxt() {
    const text = buildCadGuidelineText(this.includeDevNotes);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMR_CAD_Site_Plan_Guideline.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}
