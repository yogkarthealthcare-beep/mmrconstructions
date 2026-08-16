import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

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

  documentTypes = [
    { value: 'pan_card', label: 'PAN Card' },
    { value: 'aadhaar_card', label: 'Aadhaar Card' },
    { value: 'passport_photo', label: 'Passport Size Photo' },
    { value: 'property_document', label: 'Property Documents' },
    { value: 'supporting_document', label: 'Other Supporting Documents' },
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

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0];
  }

  uploadDocument() {
    this.message = '';
    this.error = '';
    if (!this.selectedFile) {
      this.error = 'Please select a PDF, JPG, or PNG file.';
      return;
    }
    if (this.selectedFile.size > 5 * 1024 * 1024) {
      this.error = 'File size must be 5 MB or less.';
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
          this.message = res.message || 'Document uploaded.';
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
    if (!confirm('Delete this document?')) return;
    this.api.deleteInvestorDocument(doc.id).subscribe({
      next: () => this.loadDocuments(),
      error: (err: any) => this.error = err.error?.message || 'Delete failed.'
    });
  }

  fileUrl(id: string) {
    return this.api.investorDocumentUrl(id);
  }

  badge(status: string) {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'bg-success-subtle text-success border-success';
      case 'rejected': return 'bg-danger-subtle text-danger border-danger';
      default: return 'bg-warning-subtle text-warning border-warning';
    }
  }
}
