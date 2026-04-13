import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-my-plots', standalone: true, imports: [CommonModule], templateUrl: './my-plots.component.html' })
export class MyPlotsComponent {
  plots = [
    { id:'AIMA-A12', site:'AIMA Site, Kanpur', location:'Dhodi Ghaat Road, Rooma', size:'100 gaj', price:'₹4,60,000', dp:'₹1,00,000', emi:'₹6,000', tenure:'60 months', paid:'₹1,70,000', bal:'₹2,90,000', emiPaid:12, emiLeft:48, regDate:'15 Jan 2024', buybackDeadline:'15 Jan 2026', status:'active', img:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=70' },
    { id:'AIMA-A18', site:'AIMA Site, Kanpur', location:'Dhodi Ghaat Road, Rooma', size:'100 gaj', price:'₹4,60,000', dp:'₹1,00,000', emi:'₹6,000', tenure:'60 months', paid:'₹1,70,000', bal:'₹2,90,000', emiPaid:12, emiLeft:48, regDate:'22 Jan 2024', buybackDeadline:'22 Jan 2026', status:'active', img:'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=400&q=70' },
  ];
  pct(p: any) { return Math.round((p.emiPaid / (p.emiPaid + p.emiLeft)) * 100); }
}
