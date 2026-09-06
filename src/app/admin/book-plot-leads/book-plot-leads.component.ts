import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-book-plot-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent],
  templateUrl: './book-plot-leads.component.html',
  styleUrls: ['./book-plot-leads.component.css']
})
export class BookPlotLeadsComponent implements OnInit {
  rows: any[] = [];
  loading = false;
  search = '';
  status = '';
  page = 1;
  limit = 10;
  total = 0;
  pages = 1;
  statuses = ['New', 'Contacted', 'Follow Up', 'Converted', 'Closed'];

  constructor(
    private api: ApiService,
    private http: HttpClient,
    private exportService: AdminExportService
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.adminGetBookPlotLeads({
      page: this.page,
      limit: this.limit,
      search: this.search,
      status: this.status
    }).subscribe({
      next: (r: any) => {
        this.rows = r.data?.items || [];
        this.total = r.data?.pagination?.total || 0;
        this.pages = r.data?.pagination?.pages || 1;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  filter() {
    this.page = 1;
    this.load();
  }

  onPageChange(p: number) {
    this.page = p;
    this.load();
  }

  onPageSizeChange(size: number) {
    this.limit = size;
    this.page = 1;
    this.load();
  }

  update(row: any) {
    this.api.adminUpdateBookPlotLeadStatus(row.id, row.status).subscribe();
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Inquiry ID', key: 'inquiry_number', width: 14 },
      { header: 'Full Name', key: 'full_name', width: 22 },
      { header: 'Contact Number', key: 'contact_number', width: 16 },
      { header: 'Selected Site', key: 'selected_site_display', width: 20 },
      { header: 'Custom Site', key: 'custom_site_display', width: 20 },
      { header: 'User Type', key: 'user_type', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Inquiry Date', key: 'date_display', width: 16 }
    ];

    const processAndExport = (list: any[]) => {
      const baseIndex = mode === 'current' ? (this.page - 1) * this.limit : 0;
      const formatted = list.map((row, idx) => ({
        ...row,
        _sno: baseIndex + idx + 1,
        selected_site_display: row.selected_site || 'N/A',
        custom_site_display: row.custom_site_name || 'N/A',
        date_display: row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A'
      }));

      const title = mode === 'current' ? `Book Plot Leads (Page ${this.page})` : 'All Book Plot Leads';
      const filename = `book_plot_leads_${mode}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'excel') {
        this.exportService.exportToExcel(formatted, columns, filename, title);
      } else {
        this.exportService.exportToPdf(formatted, columns, filename, title);
      }
    };

    if (mode === 'current' || this.total <= this.rows.length) {
      processAndExport(this.rows);
    } else {
      this.api.adminGetBookPlotLeads({
        page: 1,
        limit: 10000,
        search: this.search,
        status: this.status
      }).subscribe({
        next: (r: any) => {
          const allList = r.data?.items || [];
          processAndExport(allList);
        },
        error: () => processAndExport(this.rows)
      });
    }
  }
}
