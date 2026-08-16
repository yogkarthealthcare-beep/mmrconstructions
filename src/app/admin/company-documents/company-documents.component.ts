import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

type DocumentForm = {
  document_name: string;
  document_name_hi: string;
  document_description: string;
  document_description_hi: string;
  document_type: string;
  document_type_hi: string;
  display_order: number;
  is_active: boolean;
  company_document: File | null;
};

@Component({
  selector: 'app-admin-company-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-documents.component.html',
  styleUrls: ['./company-documents.component.css'],
})
export class AdminCompanyDocumentsComponent implements OnInit {
  documents: any[] = [];
  loading = true;
  saving = false;
  showForm = false;
  editing: any = null;
  previewUrl = '';
  toast = '';
  toastType: 'success' | 'error' = 'success';
  form: DocumentForm = this.emptyForm();

  get activeCount(): number {
    return this.documents.filter((document) => document.is_active !== false).length;
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loading = true;
    this.api.adminGetCompanyDocuments().subscribe({
      next: (res: any) => {
        this.documents = res?.data || [];
        this.loading = false;
      },
      error: (error: any) => {
        this.loading = false;
        this.showToast(error?.error?.message || 'Unable to load company documents.', 'error');
      },
    });
  }

  openAdd(): void {
    this.editing = null;
    this.form = this.emptyForm();
    this.previewUrl = '';
    this.showForm = true;
  }

  openEdit(document: any): void {
    this.editing = document;
    this.form = {
      document_name: document.document_name || '',
      document_name_hi: document.document_name_hi || '',
      document_description: document.document_description || '',
      document_description_hi: document.document_description_hi || '',
      document_type: document.document_type || '',
      document_type_hi: document.document_type_hi || '',
      display_order: Number(document.display_order || 0),
      is_active: document.is_active !== false,
      company_document: null,
    };
    this.previewUrl = document.file_type === 'image' ? this.fileUrl(document) : '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editing = null;
    this.previewUrl = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      input.value = '';
      this.showToast('Only JPG, JPEG, PNG, WEBP and PDF files are allowed.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      input.value = '';
      this.showToast('Document file must be 5 MB or smaller.', 'error');
      return;
    }
    this.form.company_document = file;
    this.previewUrl = '';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.previewUrl = String(reader.result || '');
      reader.readAsDataURL(file);
    }
  }

  save(): void {
    if (!this.form.document_name.trim()) {
      this.showToast('Document name is required.', 'error');
      return;
    }
    if (!this.editing && !this.form.company_document) {
      this.showToast('Please select a document file.', 'error');
      return;
    }
    const data = new FormData();
    data.append('document_name', this.form.document_name.trim());
    data.append('document_name_hi', this.form.document_name_hi.trim());
    data.append('document_description', this.form.document_description.trim());
    data.append('document_description_hi', this.form.document_description_hi.trim());
    data.append('document_type', this.form.document_type.trim());
    data.append('document_type_hi', this.form.document_type_hi.trim());
    data.append('display_order', String(this.form.display_order || 0));
    data.append('is_active', String(this.form.is_active));
    if (this.form.company_document) data.append('company_document', this.form.company_document);

    this.saving = true;
    const request = this.editing
      ? this.api.adminUpdateCompanyDocument(this.editing.id, data)
      : this.api.adminCreateCompanyDocument(data);
    request.subscribe({
      next: (res: any) => {
        this.saving = false;
        this.closeForm();
        this.showToast(res?.message || 'Company document saved.');
        this.loadDocuments();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message || 'Unable to save company document.', 'error');
      },
    });
  }

  deactivate(document: any): void {
    if (!confirm(`Deactivate "${document.document_name}"?`)) return;
    this.api.adminDeleteCompanyDocument(document.id).subscribe({
      next: (res: any) => {
        this.showToast(res?.message || 'Company document deactivated.');
        this.loadDocuments();
      },
      error: (error: any) => this.showToast(error?.error?.message || 'Unable to deactivate document.', 'error'),
    });
  }

  fileSize(bytes: any): string {
    const value = Number(bytes || 0);
    if (!value) return '-';
    return value >= 1024 * 1024
      ? `${(value / 1024 / 1024).toFixed(1)} MB`
      : `${Math.ceil(value / 1024)} KB`;
  }

  fileUrl(document: any, download = false): string {
    const value = String(document?.file_url || '');
    const url = /^https?:\/\//i.test(value) ? value : this.api.url(value);
    return download ? `${url}${url.includes('?') ? '&' : '?'}download=1` : url;
  }

  private emptyForm(): DocumentForm {
    return {
      document_name: '',
      document_name_hi: '',
      document_description: '',
      document_description_hi: '',
      document_type: '',
      document_type_hi: '',
      display_order: this.documents.length + 1,
      is_active: true,
      company_document: null,
    };
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toast = message;
    this.toastType = type;
    window.setTimeout(() => this.toast = '', 4000);
  }
}
