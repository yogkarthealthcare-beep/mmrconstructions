import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-documents', standalone: true, imports: [CommonModule], templateUrl: './documents.component.html' })
export class DocumentsComponent implements OnInit {
  loading = true; docs: any[] = []; toast = ''; uploading = false;

  docTypes = [
    { key: 'PANCard',      label: 'PAN Card',       icon: 'fas fa-credit-card' },
    { key: 'AadharCard',   label: 'Aadhar Card',    icon: 'fas fa-id-card' },
    { key: 'ProfilePhoto', label: 'Profile Photo',  icon: 'fas fa-camera' },
    { key: 'Other',        label: 'Other Document', icon: 'fas fa-file' },
  ];

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getDocuments().subscribe({
      next: (res: any) => { if (res.success) this.docs = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  upload(type: string, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading = true;
    const form = new FormData();
    form.append('document', file);
    form.append('document_type', type);
    this.api.uploadDoc(form).subscribe({
      next: (res: any) => {
        this.toast = 'Document uploaded successfully!';
        this.uploading = false;
        this.ngOnInit();
        setTimeout(() => this.toast = '', 3000);
      },
      error: (e: any) => { this.toast = e?.error?.message || 'Upload failed'; this.uploading = false; }
    });
  }

  docStatus(type: string) { return this.docs.find(d => d.document_type === type); }
}
