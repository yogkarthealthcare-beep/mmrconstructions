import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-buyback-terms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './buyback-terms.component.html',
  styleUrls: ['./buyback-terms.component.css'],
})
export class AdminBuybackTermsComponent implements OnInit {
  loading = true;
  saving = false;
  success = '';
  error = '';
  form = { title: '', summary: '', content: '' };

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadTerms(); }

  loadTerms() {
    this.loading = true;
    this.error = '';
    this.api.adminGetBuybackTerms().subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.form = {
          title: data.title || '',
          summary: data.summary || '',
          content: data.content || '',
        };
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Unable to load Buyback Terms & Conditions.';
        this.loading = false;
      },
    });
  }

  save() {
    this.success = '';
    this.error = '';
    if (!this.form.title.trim() || !this.form.content.trim()) {
      this.error = 'Title and Terms & Conditions content are required.';
      return;
    }

    this.saving = true;
    this.api.adminUpdateBuybackTerms(this.form).subscribe({
      next: (res: any) => {
        this.success = res?.message || 'Buyback Terms & Conditions updated successfully.';
        this.saving = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Unable to update Buyback Terms & Conditions.';
        this.saving = false;
      },
    });
  }
}
