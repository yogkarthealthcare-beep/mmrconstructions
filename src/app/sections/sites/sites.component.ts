import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-sites', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './sites.component.html' })
export class SitesComponent {
  sites = [
    { name: 'AIMA Site', loc: 'Dhodi Ghaat Road, Rooma, Kanpur', city: 'Kanpur', badgeClass: 'badge-green', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75', tags: ['fas fa-plane:Airport 6km', 'fas fa-graduation-cap:KIT Eng. 5km', 'fas fa-road:Highway'] },
    { name: 'Tribhuwan Khera', loc: 'Near Jajmau, NH-27, Unnao', city: 'Unnao', badgeClass: 'badge-gold', img: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=600&q=75', tags: ['fas fa-road:KL Highway', 'fas fa-water:Ganga 2.5km', 'fas fa-university:College 1km'] },
    { name: 'Gadan Khera', loc: 'Unnao', city: 'Unnao', badgeClass: 'badge-gold', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=75', tags: ['fas fa-road:Ganga Exp. 6km', 'fas fa-road:Six Lane 2km', 'fas fa-gavel:Unnao Court'] },
    { name: 'Ajgain Site', loc: 'Ajgain, Near Highway', city: 'Ajgain', badgeClass: 'badge-green', img: 'https://images.unsplash.com/photo-1613082410785-22292e8426e0?w=600&q=75', tags: ['fas fa-train:Railway Stn.', 'fas fa-road:LKO-KNP Hwy 1.5km'] },
    { name: 'Lucknow Site', loc: 'Near Amousi Airport, Lucknow', city: 'Lucknow', badgeClass: 'badge-green', img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=75', tags: ['fas fa-plane:Airport 2km', 'fas fa-road:Ring Road 200m', 'fas fa-train:Railway 500m'] },
  ];

  parseTags(tags: string[]) { return tags.map(t => { const [icon, label] = t.split(':'); return { icon, label }; }); }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
