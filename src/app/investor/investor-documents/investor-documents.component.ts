import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { validateImageUpload } from '../../shared/utils/form-helpers';

export interface DocumentCategory {
  key: string;
  label: string;
  hindiLabel: string;
  icon: string;
  required: boolean;
  maxKb: number;
  description: string;
}

@Component({
  selector: 'app-investor-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-documents.component.html',
  styleUrls: ['./investor-documents.component.css']
})
export class InvestorDocumentsComponent implements OnInit {
  documents: any[] = [];
  loading = true;
  uploading = false;
  message = '';
  error = '';

  documentType = 'pan_card';
  selectedFile?: File;

  // Selected files & local preview per category slot
  selectedSlotFiles: { [key: string]: File } = {};
  selectedSlotPreviews: { [key: string]: string } = {};
  slotUploading: { [key: string]: boolean } = {};
  slotErrors: { [key: string]: string } = {};
  slotSuccess: { [key: string]: string } = {};

  // Modal preview
  previewModalDoc: any = null;

  documentCategories: DocumentCategory[] = [
    {
      key: 'pan_card',
      label: 'PAN Card',
      hindiLabel: 'पैन कार्ड',
      icon: 'fas fa-id-card',
      required: true,
      maxKb: 500,
      description: 'Investor Permanent Account Number (PAN) Card copy.'
    },
    {
      key: 'aadhaar_card',
      label: 'Aadhaar Card',
      hindiLabel: 'आधार कार्ड',
      icon: 'fas fa-address-card',
      required: true,
      maxKb: 500,
      description: 'Front & Back side of UIDAI Aadhaar Card.'
    },
    {
      key: 'passport_photo',
      label: 'Passport Size Photo',
      hindiLabel: 'पासपोर्ट साइज फोटो',
      icon: 'fas fa-user-circle',
      required: true,
      maxKb: 100,
      description: 'Recent clear colored passport photograph.'
    },
    {
      key: 'property_document',
      label: 'Property Documents',
      hindiLabel: 'प्रॉपर्टी दस्तावेज़',
      icon: 'fas fa-building',
      required: false,
      maxKb: 500,
      description: 'Plot allotment letter, registry, or agreement.'
    },
    {
      key: 'supporting_document',
      label: 'Other Supporting Documents',
      hindiLabel: 'अन्य सहायक दस्तावेज़',
      icon: 'fas fa-file-alt',
      required: false,
      maxKb: 500,
      description: 'Bank passbook, cheque leaf or address proofs.'
    }
  ];

  documentTypes = [
    { value: 'pan_card', label: 'PAN Card (Max 500 KB)' },
    { value: 'aadhaar_card', label: 'Aadhaar Card (Max 500 KB)' },
    { value: 'passport_photo', label: 'Passport Size Photo (Max 100 KB)' },
    { value: 'property_document', label: 'Property Documents (Max 500 KB)' },
    { value: 'supporting_document', label: 'Other Supporting Documents (Max 500 KB)' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.loading = true;
    this.api.getInvestorDocuments().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.documents = res.success ? (res.data || []) : [];
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to load documents.';
      }
    });
  }

  getDocForType(typeKey: string): any {
    return this.documents.find(d => d.document_type === typeKey && !d.deleted_at);
  }

  getDocUrl(doc: any): string {
    if (!doc) return '';
    if (doc.file_url) {
      return this.api.getFileUrl(doc.file_url);
    }
    return this.api.investorDocumentUrl(doc.id);
  }

  // --- Slot-specific file selection ---
  onSlotFileChange(event: Event, catKey: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.slotErrors[catKey] = '';
    this.slotSuccess[catKey] = '';

    if (!file) return;

    const uploadType = (catKey === 'passport_photo') ? 'photo' : 'document';
    const val = validateImageUpload(file, uploadType);
    if (!val.valid) {
      this.slotErrors[catKey] = val.message || 'Invalid file format or size.';
      input.value = '';
      return;
    }

    this.selectedSlotFiles[catKey] = file;

    // Generate local preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedSlotPreviews[catKey] = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearSlotSelection(catKey: string) {
    delete this.selectedSlotFiles[catKey];
    delete this.selectedSlotPreviews[catKey];
    delete this.slotErrors[catKey];
    delete this.slotSuccess[catKey];
  }

  uploadSlotDocument(catKey: string) {
    const file = this.selectedSlotFiles[catKey];
    if (!file) return;

    const form = new FormData();
    form.append('document_type', catKey);
    form.append('document', file);

    this.slotUploading[catKey] = true;
    this.slotErrors[catKey] = '';
    this.slotSuccess[catKey] = '';

    this.api.uploadInvestorDocument(form).subscribe({
      next: (res: any) => {
        this.slotUploading[catKey] = false;
        if (res.success) {
          this.slotSuccess[catKey] = 'Document uploaded successfully!';
          this.clearSlotSelection(catKey);
          this.loadDocuments();
        } else {
          this.slotErrors[catKey] = res.message || 'Upload failed.';
        }
      },
      error: (err: any) => {
        this.slotUploading[catKey] = false;
        this.slotErrors[catKey] = err.error?.message || 'Upload failed. Please try again.';
      }
    });
  }

  getSelectedSlotFileName(catKey: string): string {
    return this.selectedSlotFiles[catKey]?.name || '';
  }

  getSelectedSlotFileSizeKb(catKey: string): string {
    const file = this.selectedSlotFiles[catKey];
    return file ? (file.size / 1024).toFixed(0) : '0';
  }

  // --- General Upload Form ---
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.selectedFile = file;
    this.error = '';
    this.message = '';

    if (file) {
      const uploadType = (this.documentType === 'passport_photo') ? 'photo' : 'document';
      const val = validateImageUpload(file, uploadType);
      if (!val.valid) {
        this.error = val.message || 'Invalid file format or size.';
        this.selectedFile = undefined;
        input.value = '';
      }
    }
  }

  uploadDocument() {
    this.message = '';
    this.error = '';
    if (!this.selectedFile) {
      this.error = 'Please select a valid JPG or PNG image file.';
      return;
    }

    const uploadType = (this.documentType === 'passport_photo') ? 'photo' : 'document';
    const val = validateImageUpload(this.selectedFile, uploadType);
    if (!val.valid) {
      this.error = val.message || 'Invalid file format or size.';
      return;
    }
    const form = new FormData();
    form.append('document_type', this.documentType);
    form.append('document', this.selectedFile);
    this.uploading = true;
    this.api.uploadInvestorDocument(form).subscribe({
      next: (res: any) => {
        this.uploading = false;
        if (res.success) {
          this.message = res.message || 'Document uploaded successfully.';
          this.selectedFile = undefined;
          this.loadDocuments();
        } else {
          this.error = res.message || 'Upload failed.';
        }
      },
      error: (err: any) => {
        this.uploading = false;
        this.error = err.error?.message || 'Upload failed.';
      }
    });
  }

  deleteDocument(doc: any) {
    if (doc.status === 'approved') return;
    if (!confirm(`Delete ${doc.document_type?.replace('_', ' ')}?`)) return;
    this.api.deleteInvestorDocument(doc.id).subscribe({
      next: () => this.loadDocuments(),
      error: (err: any) => this.error = err.error?.message || 'Delete failed.'
    });
  }

  // --- Lightbox / Modal ---
  openPreviewModal(doc: any) {
    this.previewModalDoc = doc;
  }

  closePreviewModal() {
    this.previewModalDoc = null;
  }

  badge(status: string) {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'bg-success-subtle text-success border-success';
      case 'rejected': return 'bg-danger-subtle text-danger border-danger';
      default: return 'bg-warning-subtle text-warning border-warning';
    }
  }

  formatDocType(type: string): string {
    const found = this.documentCategories.find(c => c.key === type);
    return found ? `${found.label} (${found.hindiLabel})` : (type || '').replace(/_/g, ' ');
  }

  getUploadedCount(): number {
    return this.documentCategories.filter(c => !!this.getDocForType(c.key)).length;
  }

  getRequiredCount(): number {
    return this.documentCategories.filter(c => c.required).length;
  }

  getRequiredUploadedCount(): number {
    return this.documentCategories.filter(c => c.required && !!this.getDocForType(c.key)).length;
  }
}
