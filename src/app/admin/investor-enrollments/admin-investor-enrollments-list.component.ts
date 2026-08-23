import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-investor-enrollments-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-investor-enrollments-list.component.html',
  styleUrls: ['./admin-investor-enrollments-list.component.css']
})
export class AdminInvestorEnrollmentsListComponent implements OnInit {
  investors: any[] = [];
  
  // Pagination & Search
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;
  searchQuery = '';

  loading = false;
  loginLoadingId: number | null = null;

  private api = (inject as any)(ApiService) || inject(ApiService);
  private router = inject(Router);

  constructor() {}

  ngOnInit() {
    this.loadInvestors();
  }

  loadInvestors() {
    this.loading = true;
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchQuery
    };
    
    this.api.get('/api/admin/investors-portal', params, true).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.investors = res.data.items || res.data.users || res.data || [];
          this.totalItems = res.data.total || this.investors.length;
          this.totalPages = res.data.total_pages || Math.ceil(this.totalItems / this.pageSize) || 1;
        } else {
          this.investors = [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Failed to load investors', err);
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadInvestors();
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadInvestors();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadInvestors();
    }
  }

  get pagesArray() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  loginAsInvestor(investor: any) {
    if (!investor || !investor.id) return;
    
    this.loginLoadingId = investor.id;
    const payload = {
      user_id: investor.id,
      user_type: 'Investor'
    };

    this.api.post('/api/admin/login-as-user', payload, true).subscribe({
      next: (res: any) => {
        this.loginLoadingId = null;
        if (res.success && res.data && res.data.token) {
          // Store token in local storage
          localStorage.setItem('mmr_investor_token', res.data.token);
          if (res.data.refresh_token) {
            localStorage.setItem('mmr_investor_refresh', res.data.refresh_token);
          }
          if (res.data.user) {
            localStorage.setItem('mmr_investor_user', JSON.stringify(res.data.user));
          }
          
          // Open investor dashboard in new tab
          window.open('/investor/dashboard', '_blank');
        } else {
          alert('Failed to login as investor. Invalid response.');
        }
      },
      error: (err: any) => {
        this.loginLoadingId = null;
        console.error('Login as investor failed', err);
        alert(err.error?.message || 'Failed to impersonate investor. Please check logs.');
      }
    });
  }
}
