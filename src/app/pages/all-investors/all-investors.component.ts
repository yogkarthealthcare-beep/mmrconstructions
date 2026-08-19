import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-all-investors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TopbarComponent, NavbarComponent, FooterComponent],
  templateUrl: './all-investors.component.html',
  styleUrls: ['./all-investors.component.css']
})
export class AllInvestorsComponent implements OnInit {
  investors: any[] = [];
  filteredInvestors: any[] = [];
  loading = true;
  searchTerm = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getInvestors().subscribe({
      next: (r: any) => {
        const rawList = Array.isArray(r?.data) ? r.data : [];
        const seen = new Set<string>();
        const uniqueList: any[] = [];

        for (const item of rawList) {
          const key = (item.name || '').trim().toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          uniqueList.push(item);
        }

        // Sort descending by investment amount
        uniqueList.sort((a, b) => (Number(b.investment_amount || 0) - Number(a.investment_amount || 0)));

        this.investors = uniqueList;
        this.filteredInvestors = uniqueList;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  filterInvestors() {
    if (!this.searchTerm.trim()) {
      this.filteredInvestors = this.investors;
      return;
    }
    const q = this.searchTerm.toLowerCase().trim();
    this.filteredInvestors = this.investors.filter(i =>
      (i.name || '').toLowerCase().includes(q)
    );
  }

  getImageUrl(url: string | undefined): string {
    if (!url) return 'assets/favicon-192x192.png';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return this.api.url(url);
  }

  imageError(e: Event) {
    (e.target as HTMLImageElement).src = 'assets/favicon-192x192.png';
  }
}
