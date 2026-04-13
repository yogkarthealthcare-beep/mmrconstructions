import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-customers', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './customers.component.html' })
export class CustomersComponent implements OnInit {
  loading = true; search = ''; statusFilter = '';
  customers: any[] = []; total = 0; page = 1; limit = 20;

  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.adminGetUsers({ user_type: 'Customer', status: this.statusFilter || null, search: this.search || null, page: this.page, limit: this.limit }).subscribe({
      next: (res: any) => {
        if (res.success) { this.customers = res.data.users || []; this.total = res.data.total || 0; }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
  onSearch() { this.page = 1; this.load(); }
}
