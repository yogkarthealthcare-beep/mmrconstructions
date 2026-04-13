import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-sites-mgmt', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './sites-mgmt.component.html' })
export class SitesMgmtComponent {
  activeSite = 0;
  sites = [
    { name:'AIMA Site, Kanpur',       total:120, vacant:33, booked:12, sold:75 },
    { name:'Tribhuwan Khera, Unnao',  total:150, vacant:58, booked:15, sold:77 },
    { name:'Gadan Khera, Unnao',      total:100, vacant:55, booked:10, sold:35 },
    { name:'Ajgain Site',             total:80,  vacant:18, booked:5,  sold:57 },
    { name:'Lucknow Site',            total:200, vacant:102,booked:18, sold:80 },
  ];
  get activeSiteData() { return this.sites[this.activeSite]; }
  get plotGrid() {
    const s = this.activeSiteData;
    const result: string[] = [];
    for(let i=0; i<s.sold; i++) result.push('sold');
    for(let i=0; i<s.booked; i++) result.push('booked');
    for(let i=0; i<s.vacant; i++) result.push('vacant');
    return result;
  }
}
