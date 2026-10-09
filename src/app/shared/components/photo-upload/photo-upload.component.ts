import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { validateImageUpload, UploadFileType } from '../../utils/form-helpers';

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="photo-box" 
      [class.invalid-photo]="isInvalid" 
      [class.disabled-box]="disabled"
      (click)="triggerFileInput(fileInput)" 
      [title]="disabled ? (previewUrl ? 'Photo preview' : 'No photo uploaded') : (uploadType === 'signature' ? 'Click to upload signature (JPG/PNG <= 50KB)' : 'Click to upload photo (JPG/PNG <= 100KB)')"
    >
      <ng-container *ngIf="previewUrl; else uploadPlaceholder">
        <img [src]="previewUrl" alt="Photo preview">
      </ng-container>
      <ng-template #uploadPlaceholder>
        <span>
          {{ placeholderText }}<br>
          <small *ngIf="!disabled" style="font-size: 9.5px; opacity: 0.85;">(click to upload)</small>
          <small *ngIf="disabled" style="font-size: 9.5px; opacity: 0.75;">(No photo)</small>
        </span>
      </ng-template>
      <input 
        type="file" 
        #fileInput 
        (change)="onFileSelected($event)" 
        accept=".jpg,.jpeg,.png,image/jpeg,image/png" 
        style="display: none;"
      >
    </div>
  `,
  styles: [`
    .photo-box {
      width: 120px;
      height: 140px;
      border: 2px dashed #cfd8d2;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #5c6d64;
      font-size: 11px;
      text-align: center;
      background: #fafbfa;
      cursor: pointer;
      overflow: hidden;
      margin: 0 auto;
      transition: all 0.2s ease;
      position: relative;
    }
    .photo-box:hover:not(.disabled-box) {
      border-color: #16a34a;
      background: #f0fdf4;
    }
    .photo-box.disabled-box {
      cursor: default;
      border-style: solid;
      background: #f8fafc;
    }
    .photo-box.invalid-photo {
      border: 2.5px dashed #dc2626 !important;
      background-color: #fef2f2 !important;
      box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2) !important;
      animation: pulseError 1.5s infinite;
    }
    @keyframes pulseError {
      0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
      100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `]
})
export class PhotoUploadComponent implements OnChanges {
  @Input() placeholderText = 'PHOTO';
  @Input() isInvalid = false;
  @Input() uploadType: UploadFileType = 'photo';
  @Input() previewUrl: string | null = null;
  @Input() disabled = false;
  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileCleared = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['previewUrl']) {
      this.previewUrl = changes['previewUrl'].currentValue || null;
    }
  }

  triggerFileInput(input: HTMLInputElement) {
    if (!this.disabled && input) {
      input.click();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageUpload(file, this.uploadType);
    if (!validation.valid) {
      event.target.value = '';
      Swal.fire({
        icon: 'error',
        title: 'अमान्य फाइल / Invalid File',
        text: validation.message,
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    this.fileSelected.emit(file);
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setPreview(url: string | null) {
    this.previewUrl = url;
  }

  reset() {
    this.previewUrl = null;
    this.fileCleared.emit();
  }
}

