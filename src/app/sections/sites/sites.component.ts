import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

export interface SiteGalleryItem {
  id?: number;
  category?: string;
  site_name: string;
  site_address: string;
  site_image: string;
  display_order?: number;
}

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sites.component.html',
  styleUrls: ['./sites.component.css']
})
export class SitesComponent implements OnInit {
  private api = inject(ApiService);

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
  }

  fetchSiteGallery(): void {
    this.api.getSiteGallery('Plot').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(raw) && raw.length > 0) {
          this.sites = raw.map((item: any, idx: number) => ({
            id: item.id || idx + 1,
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
