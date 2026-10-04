import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

export interface SiteGalleryItem {
  id?: number;
  category?: string;
  site_name: string;
  site_address: string;
  site_image: string;
  display_order?: number;
}

export interface SiteAvailability {
  site_id: number;
  site_name: string;
  location: string;
  map_image_url?: string;
  total: number;
  available: number;
  in_process: number;
  sold_out: number;
  has_map: boolean;
}

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sites.component.html',
  styleUrls: ['./sites.component.css']
})
export class SitesComponent implements OnInit {
  private api = inject(ApiService);

  summariesLoading = true;
  summaryById = new Map<number, SiteAvailability>();
  summaryByName = new Map<string, SiteAvailability>();

  sites: SiteGalleryItem[] = [
    {
      id: 1,
      site_name: 'AIMA Site',
      site_address: 'Dhodi Ghaat Road, Rooma, Kanpur',
      site_image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80'
    },
    {
      id: 2,
      site_name: 'Tribhuwan Khera',
      site_address: 'Near Jajmau, NH-27, Unnao',
      site_image: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=800&q=80'
    },
    {
      id: 3,
      site_name: 'Gadan Khera',
      site_address: 'Unnao',
      site_image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'
    },
    {
      id: 4,
      site_name: 'Ajgain Site',
      site_address: 'Ajgain, Near Highway',
      site_image: 'https://images.unsplash.com/photo-1613082410785-22292e8426e0?w=800&q=80'
    },
    {
      id: 5,
      site_name: 'Lucknow Site',
      site_address: 'Near Amousi Airport, Lucknow',
      site_image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80'
    }
  ];

  get featuredSite(): SiteGalleryItem | null {
    return this.sites && this.sites.length > 0 ? this.sites[0] : null;
  }

  get gridSites(): SiteGalleryItem[] {
    return this.sites && this.sites.length > 1 ? this.sites.slice(1, 5) : [];
  }

  ngOnInit(): void {
    this.fetchSiteGallery();
    this.fetchAvailabilitySummary();
  }

  fetchAvailabilitySummary(): void {
    this.summariesLoading = true;
    this.api.getPublicSitesSummary().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(list)) {
          for (const item of list) {
            const sum: SiteAvailability = {
              site_id: Number(item.site_id),
              site_name: item.site_name || '',
              location: item.location || '',
              map_image_url: item.map_image_url || '',
              total: Number(item.total || 0),
              available: Number(item.available || 0),
              in_process: Number(item.in_process || 0),
              sold_out: Number(item.sold_out || 0),
              has_map: Boolean(item.has_map)
            };
            this.summaryById.set(sum.site_id, sum);
            if (sum.site_name) {
              this.summaryByName.set(sum.site_name.trim().toLowerCase(), sum);
            }
          }
        }
        this.summariesLoading = false;
      },
      error: () => {
        this.summariesLoading = false;
      }
    });
  }

  getSummary(site?: SiteGalleryItem | null): SiteAvailability | null {
    if (!site) return null;
    if (site.id && this.summaryById.has(Number(site.id))) {
      return this.summaryById.get(Number(site.id))!;
    }
    const nameKey = String(site.site_name || '').trim().toLowerCase();
    if (this.summaryByName.has(nameKey)) {
      return this.summaryByName.get(nameKey)!;
    }
    return null;
  }

  hasMap(site?: SiteGalleryItem | null): boolean {
    const summary = this.getSummary(site);
    if (summary) return summary.has_map !== false;
    return true; // default enabled
  }

  getEffectiveSiteId(site?: SiteGalleryItem | null): number {
    const summary = this.getSummary(site);
    if (summary?.site_id) return summary.site_id;
    return site?.id || 1;
  }

  fetchSiteGallery(): void {
    this.api.getSiteGallery('Plot').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(raw) && raw.length > 0) {
          this.sites = raw.map((item: any, idx: number) => ({
            id: item.id || item.site_id || idx + 1,
            category: item.category || 'Plot',
            site_name: item.site_name || `Site ${idx + 1}`,
            site_address: item.site_address || 'Prime Location',
            site_image: this.resolveImageUrl(item.site_image) || this.sites[idx % this.sites.length]?.site_image
          }));
        }
      },
      error: () => {
        // Fallback default list remains loaded
      }
    });
  }

  resolveImageUrl(img: string): string {
    if (!img) return '';
    if (/^https?:\/\//i.test(img)) return img;
    return this.api.url(img);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=75';
    }
  }

  trackById(_index: number, item: SiteGalleryItem): any {
    return item.id || item.site_name;
  }
}
