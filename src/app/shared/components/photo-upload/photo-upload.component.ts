import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="photo-box" [class.invalid-photo]="isInvalid" (click)="fileInput.click()">
      <ng-container *ngIf="previewUrl; else uploadPlaceholder">
        <img [src]="previewUrl" alt="Photo preview">
      </ng-container>
      <ng-template #uploadPlaceholder>
        <span>{{ placeholderText }}<br>(click to upload)</span>
      </ng-template>
      <input 
        type="file" 
        #fileInput 
        (change)="onFileSelected($event)" 
        accept="image/*" 
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
export class PhotoUploadComponent {
  @Input() placeholderText = 'PHOTO';
  @Input() isInvalid = false;
  @Output() fileSelected = new EventEmitter<File>();

  previewUrl: string | null = null;

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  reset() {
    this.previewUrl = null;
  }
}
