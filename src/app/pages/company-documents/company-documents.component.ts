import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SeoService } from '../../services/seo.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-company-documents',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, TranslatePipe],
  templateUrl: './company-documents.component.html',
  styleUrls: ['./company-documents.component.css'],
})
export class CompanyDocumentsComponent implements OnInit {
  documents: any[] = [];
  loading = true;
  error = '';

  constructor(
    private api: ApiService,
    private seo: SeoService,
    public language: LanguageService,
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'Company Verification Documents | MMR Constructions',
      description: 'View official company registration, tax and verification documents published by MMR Constructions & Developers Private Limited.',
      canonical: 'https://mmrconstructions.in/company-documents',
      keywords: 'MMR Constructions documents, company verification, GST certificate, company registration certificate',
    });
    this.seo.setBreadcrumb([
      { name: 'Home', url: '/' },
      { name: 'Company Documents', url: '/company-documents' },
    ]);
    this.api.getCompanyDocuments().subscribe({
      next: (res: any) => {
        this.documents = res?.data || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'documentsLoadError';
        this.loading = false;
      },
    });
  }

  isPdf(document: any): boolean {
    return document?.file_type === 'pdf' || /\.pdf($|\?)/i.test(document?.file_url || '');
  }

  documentValue(document: any, field: 'document_name' | 'document_description' | 'document_type'): string {
    const hindiValue = document?.[`${field}_hi`];
    return String(this.language.current() === 'hi' && hindiValue ? hindiValue : document?.[field] || '');
  }

  fileUrl(document: any, download = false): string {
    const value = String(document?.file_url || '');
    const url = /^https?:\/\//i.test(value) ? value : this.api.url(value);
    return download ? `${url}${url.includes('?') ? '&' : '?'}download=1` : url;
  }
}
