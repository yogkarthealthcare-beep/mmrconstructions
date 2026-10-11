import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { BookableCustomer } from '../../services/booking-attribution.types';

@Component({
  selector: 'app-team-member-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class TeamMemberCustomersComponent implements OnInit {
  customers: BookableCustomer[] = [];
  filteredCustomers: BookableCustomer[] = [];
  loading = true;
  searchQuery = '';

  constructor(
    private attributionApi: BookingAttributionApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.attributionApi.getMyBookableCustomers().subscribe({
      next: (list) => {
        this.customers = list || [];
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load customers:', err);
        this.loading = false;
      }
    });
  }

  onSearchInput(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredCustomers = [...this.customers];
      return;
    }
    this.filteredCustomers = this.customers.filter(c =>
      String(c.full_name || '').toLowerCase().includes(q) ||
      String(c.mobile_no || '').includes(q) ||
      String(c.member_id || '').toLowerCase().includes(q)
    );
  }

  bookForCustomer(customer: BookableCustomer): void {
    this.router.navigate(['/team-member/book-plot'], {
      queryParams: {
        customerId: customer.user_id,
        customerName: customer.full_name
      }
    });
  }
}
