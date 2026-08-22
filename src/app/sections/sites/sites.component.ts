import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SiteToggleService } from '../../services/site-toggle.service';

interface SiteCardItem {
  site_id?: number;
  name: string;
  loc: string;
  city: string;
  badgeClass: string;
  img: string;
  tags: string[];
  vacant?: number;
  inProcess?: number;
  booked?: number;
  totalPlots?: number;
}

@Component({ selector: 'app-sites', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './sites.component.html' })
export class SitesComponent implements OnInit {
  private api: any = inject(ApiService);
  private siteToggle = inject(SiteToggleService);

  get isMasterPropertyToolsOn(): boolean {
    return this.siteToggle.isMasterPropertyPlotEnabled();
  }

  get displaySites(): SiteCardItem[] {
    return (this.sites || []).slice(0, 5);
  }

  sites: SiteCardItem[] = [
    { site_id: 1, name: 'AIMA Site', loc: 'Dhodi Ghaat Road, Rooma, Kanpur', city: 'Kanpur', badgeClass: 'badge-green', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75', tags: ['fas fa-plane:Airport 6km', 'fas fa-graduation-cap:KIT Eng. 5km', 'fas fa-road:Highway'] },
    { site_id: 2, name: 'Tribhuwan Khera', loc: 'Near Jajmau, NH-27, Unnao', city: 'Unnao', badgeClass: 'badge-gold', img: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=600&q=75', tags: ['fas fa-road:KL Highway', 'fas fa-water:Ganga 2.5km', 'fas fa-university:College 1km'] },
    { site_id: 3, name: 'Gadan Khera', loc: 'Unnao', city: 'Unnao', badgeClass: 'badge-gold', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=75', tags: ['fas fa-road:Ganga Exp. 6km', 'fas fa-road:Six Lane 2km', 'fas fa-gavel:Unnao Court'] },
    { site_id: 4, name: 'Ajgain Site', loc: 'Ajgain, Near Highway', city: 'Ajgain', badgeClass: 'badge-green', img: 'https://images.unsplash.com/photo-1613082410785-22292e8426e0?w=600&q=75', tags: ['fas fa-train:Railway Stn.', 'fas fa-road:LKO-KNP Hwy 1.5km'] },
    { site_id: 5, name: 'Lucknow Site', loc: 'Near Amousi Airport, Lucknow', city: 'Lucknow', badgeClass: 'badge-green', img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=75', tags: ['fas fa-plane:Airport 2km', 'fas fa-road:Ring Road 200m', 'fas fa-train:Railway 500m'] },
  ];

  ngOnInit() {
    this.fetchSites();
  }

  fetchSites() {
    this.api.getSites().subscribe({
      next: (res: any) => {
        const rawSites = Array.isArray(res) ? res : (res?.data || []);
        if (rawSites && rawSites.length > 0) {
          this.sites = rawSites.map((s: any, idx: number) => {
            const siteImg = s.property_image_url
              ? (/^https?:\/\//i.test(s.property_image_url) ? s.property_image_url : this.api.url(s.property_image_url))
              : (s.map_image_url
                ? (/^https?:\/\//i.test(s.map_image_url) ? s.map_image_url : this.api.url(s.map_image_url))
                : this.sites[idx % this.sites.length]?.img || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75');

            const defaultTags = this.sites[idx % this.sites.length]?.tags || ['fas fa-road:Highway Touch', 'fas fa-map-marker-alt:Prime Location'];
            const tags = Array.isArray(s.highlights) && s.highlights.length > 0
              ? s.highlights.map((h: string) => h.includes(':') ? h : `fas fa-map-marker-alt:${h}`)
              : defaultTags;

            return {
              site_id: s.site_id || s.id || (idx + 1),
              name: s.site_name || `Site ${idx + 1}`,
              loc: s.full_address || s.address || s.city || 'Prime Location',
              city: s.city || 'Unnao',
              badgeClass: (s.city === 'Kanpur' || s.city === 'Lucknow') ? 'badge-green' : 'badge-gold',
              img: siteImg,
              tags: tags,
              vacant: Number(s.vacant || 0),
              inProcess: Number(s.in_process || 0),
              booked: Number(s.booked || 0),
              totalPlots: Number(s.total_plots || 0),
            };
          });
        }
      },
      error: () => {}
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

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
