import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

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
    { key: 'PANCard',      label: 'PAN Card',       icon: 'fas fa-credit-card',  desc: 'Government Income Tax PAN Identity' },
    { key: 'AadharCard',   label: 'Aadhaar Card',   icon: 'fas fa-id-card',       desc: 'UIDAI Address & Identity Proof' },
    { key: 'ProfilePhoto', label: 'Profile Photo',  icon: 'fas fa-user-circle',   desc: 'Official Passport Size Photo' },
    { key: 'Other',        label: 'Bank / Passbook',icon: 'fas fa-university',    desc: 'Bank Passbook / Cancelled Cheque' },
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
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
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
    if (!doc?.document_url) return;
    this.selectedDoc = doc;
  }

  getImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return this.api.url(url);
  }
}
