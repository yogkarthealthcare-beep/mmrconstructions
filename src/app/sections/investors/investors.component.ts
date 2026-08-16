import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investors.component.html',
  styleUrls: ['./investors.component.css']
})
export class InvestorsComponent implements OnInit {
  investors: any[] = [];
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getInvestors().subscribe({
      next: (r: any) => {
        this.investors = Array.isArray(r?.data) ? r.data : [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
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
