import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-user-dashboard', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './dashboard.component.html' })
export class UserDashboardComponent {
  stats = [
    { icon:'fas fa-map',              color:'background:#eaf4ee;color:#1a5c3a;', val:'2',      lbl:'My Plots',         sub:'100 gaj each' },
    { icon:'fas fa-calendar-check',   color:'background:#fdf8ec;color:#a07c2a;', val:'₹12,000',lbl:'Monthly EMI',      sub:'Due 1st every month' },
    { icon:'fas fa-check-circle',     color:'background:#dcfce7;color:#16a34a;', val:'₹3,40,000',lbl:'Amount Paid',    sub:'Out of ₹9,20,000' },
    { icon:'fas fa-rupee-sign',       color:'background:#eff6ff;color:#2563eb;', val:'₹5,80,000',lbl:'Balance Amount', sub:'38 EMIs remaining' },
  ];

  myPlots = [
    { id:'AIMA-A12', site:'AIMA Site, Kanpur',       size:'100 gaj', price:'₹4,60,000', paid:'₹1,70,000', bal:'₹2,90,000', emiLeft:29, status:'active' },
    { id:'AIMA-A18', site:'AIMA Site, Kanpur',       size:'100 gaj', price:'₹4,60,000', paid:'₹1,70,000', bal:'₹2,90,000', emiLeft:29, status:'active' },
  ];

  recentPayments = [
    { date:'02 Apr 2025', amount:'₹12,000', method:'Cash',   status:'paid', receipt:'REC-2025-042' },
    { date:'01 Mar 2025', amount:'₹12,000', method:'Cheque', status:'paid', receipt:'REC-2025-031' },
    { date:'01 Feb 2025', amount:'₹12,000', method:'Cash',   status:'paid', receipt:'REC-2025-021' },
    { date:'01 Jan 2025', amount:'₹12,000', method:'Cash',   status:'paid', receipt:'REC-2025-011' },
  ];

  emiPct = 37; // % of total paid
}
