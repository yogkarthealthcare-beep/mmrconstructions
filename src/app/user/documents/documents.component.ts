import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

import { validateImageUpload } from '../../shared/utils/form-helpers';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit {
  loading = true;
  docs: any[] = [];
  toast = '';
  uploadingType: string | null = null;
  selectedDoc: any = null;

  docTypes = [
    { key: 'PANCard',      label: 'PAN Card',       icon: 'fas fa-credit-card',  desc: 'Government PAN Card Image (Max 500 KB)' },
    { key: 'AadharCard',   label: 'Aadhaar Card',   icon: 'fas fa-id-card',       desc: 'UIDAI Aadhaar Card Image (Max 500 KB)' },
    { key: 'ProfilePhoto', label: 'Profile Photo',  icon: 'fas fa-user-circle',   desc: 'Official Passport Photo (Max 100 KB)' },
    { key: 'Other',        label: 'Bank / Passbook',icon: 'fas fa-university',    desc: 'Bank Passbook / Cheque Image (Max 500 KB)' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDocs();
  }

  loadDocs() {
    this.loading = true;
    this.api.getDocuments().subscribe({
      next: (res: any) => {
        if (res.success) this.docs = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get verifiedCount(): number {
    return this.docs.filter(d => d.is_verified).length;
  }

  upload(type: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const uploadType = (type === 'ProfilePhoto') ? 'photo' : 'document';
    const val = validateImageUpload(file, uploadType);
    if (!val.valid) {
      this.toast = val.message || 'Invalid file format or size.';
      input.value = '';
      setTimeout(() => this.toast = '', 5000);
      return;
    }

    this.uploadingType = type;
    const form = new FormData();
    form.append('document', file);
    form.append('document_type', type);
    this.api.uploadDoc(form).subscribe({
      next: (res: any) => {
        this.toast = 'Document uploaded successfully for review!';
        this.uploadingType = null;
        this.loadDocs();
        setTimeout(() => this.toast = '', 3500);
      },
      error: (e: any) => {
        this.toast = e?.error?.message || 'Upload failed. Please try again.';
        this.uploadingType = null;
        setTimeout(() => this.toast = '', 3500);
      }
    });
  }

  docStatus(type: string) {
    return this.docs.find(d => d.document_type === type);
  }

  previewDoc(doc: any) {
    if (!doc) return;
    const path = doc.document_url || doc.file_path || doc.url || '';
    if (!path) return;
    this.selectedDoc = {
      ...doc,
      document_url: this.api.getFileUrl(path)
    };
  }

  getImageUrl(url: string | undefined): string {
    return this.api.getFileUrl(url);
  }
}
