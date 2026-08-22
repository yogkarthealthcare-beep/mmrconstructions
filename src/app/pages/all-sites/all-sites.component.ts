import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SiteToggleService } from '../../services/site-toggle.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface SiteCardItem {
  site_id?: number;
  name: string;
  loc: string;
  city: string;
  badgeClass: string;
  img: string;
  tags: string[];
  totalPlots?: number;
}

@Component({
  selector: 'app-all-sites',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './all-sites.component.html',
  styleUrls: ['../../sections/sites/sites.component.css', './all-sites.component.css']
})
export class AllSitesComponent implements OnInit {
  private api = inject(ApiService);
  private siteToggle = inject(SiteToggleService);

  loading = true;
  sites: SiteCardItem[] = [];

  get isMasterPropertyToolsOn(): boolean {
    return this.siteToggle.isMasterPropertyPlotEnabled();
  }

  ngOnInit() {
    this.fetchSites();
  }

  fetchSites() {
    this.loading = true;
    this.api.getSites().subscribe({
      next: (res: any) => {
        this.loading = false;
        const rawSites = Array.isArray(res) ? res : (res?.data || []);
        if (rawSites && rawSites.length > 0) {
          this.sites = rawSites.map((s: any, idx: number) => {
            const siteImg = s.property_image_url
              ? (/^https?:\/\//i.test(s.property_image_url) ? s.property_image_url : this.api.url(s.property_image_url))
              : (s.map_image_url
                ? (/^https?:\/\//i.test(s.map_image_url) ? s.map_image_url : this.api.url(s.map_image_url))
                : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75');

            const tags = Array.isArray(s.highlights) && s.highlights.length > 0
              ? s.highlights.map((h: string) => h.includes(':') ? h : `fas fa-map-marker-alt:${h}`)
              : ['fas fa-road:Highway Touch', 'fas fa-map-marker-alt:Prime Location'];

            return {
              site_id: s.site_id || s.id || (idx + 1),
              name: s.site_name || `Site ${idx + 1}`,
              loc: s.full_address || s.address || s.city || 'Prime Location',
              city: s.city || 'Uttar Pradesh',
              badgeClass: (s.city === 'Kanpur' || s.city === 'Lucknow') ? 'badge-green' : 'badge-gold',
              img: siteImg,
              tags: tags,
              totalPlots: Number(s.total_plots || 0)
            };
          });
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  parseTags(tags: string[]) {
    if (!tags || !Array.isArray(tags)) return [];
    return tags.map(t => {
      if (!t.includes(':')) return { icon: 'fas fa-map-marker-alt', label: t };
      const [icon, label] = t.split(':');
      return { icon: icon || 'fas fa-map-marker-alt', label: label || icon };
    });
  }
}
