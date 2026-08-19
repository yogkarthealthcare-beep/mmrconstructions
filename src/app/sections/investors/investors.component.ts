import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investors',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './investors.component.html',
  styleUrls: ['./investors.component.css']
})
export class InvestorsComponent implements OnInit {
  investors: any[] = [];
  totalCount = 0;
  loading = true;

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

        // Sort descending by investment amount (highest investment first)
        uniqueList.sort((a, b) => (Number(b.investment_amount || 0) - Number(a.investment_amount || 0)));

        this.totalCount = uniqueList.length;
        // Limit preview on homepage to max 50 cards
        this.investors = uniqueList.slice(0, 50);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  /**
   * Split investors into rows of up to 10 cards per row.
   * Every row will be independently centered in template.
   */
  get investorRows(): any[][] {
    const rows: any[][] = [];
    const maxPerRow = 10;
    for (let i = 0; i < this.investors.length; i += maxPerRow) {
      rows.push(this.investors.slice(i, i + maxPerRow));
    }
    return rows;
  }

  /**
   * Dynamic sizing class based on total investor count:
   * 1-2 Cards -> 'card-lg' (Large)
   * 3-5 Cards -> 'card-md' (Medium)
   * 6+ Cards  -> 'card-sm' (Compact - max 10 per row)
   */
  get cardSizeClass(): string {
    const count = this.investors.length;
    if (count <= 2) return 'card-lg';
    if (count <= 5) return 'card-md';
    return 'card-sm';
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
