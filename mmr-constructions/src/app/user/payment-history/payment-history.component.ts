import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-payment-history', standalone: true, imports: [CommonModule], templateUrl: './payment-history.component.html' })
export class PaymentHistoryComponent {
  summaryStats = [
    { val:'₹1,80,000', lbl:'Total Paid',    icon:'fas fa-check-circle', bg:'#dcfce7', clr:'#16a34a' },
    { val:'15',        lbl:'Payments Made', icon:'fas fa-receipt',      bg:'#eaf4ee', clr:'#1a5c3a' },
    { val:'₹7,40,000', lbl:'Balance Due',   icon:'fas fa-rupee-sign',   bg:'#fdf8ec', clr:'#a07c2a' },
  ];
  payments = [
    { id:'REC-2025-042', date:'02 Apr 2025', desc:'EMI #15 — AIMA-A12 + AIMA-A18', amount:'₹12,000', method:'Cash',   status:'paid' },
    { id:'REC-2025-031', date:'01 Mar 2025', desc:'EMI #14 — Both plots',           amount:'₹12,000', method:'Cheque', status:'paid' },
    { id:'REC-2025-021', date:'01 Feb 2025', desc:'EMI #13 — Both plots',           amount:'₹12,000', method:'Cash',   status:'paid' },
    { id:'REC-2025-011', date:'01 Jan 2025', desc:'EMI #12 — Both plots',           amount:'₹12,000', method:'Cash',   status:'paid' },
    { id:'REC-2024-121', date:'01 Dec 2024', desc:'EMI #11 — Both plots',           amount:'₹12,000', method:'Cheque', status:'paid' },
    { id:'REC-2024-111', date:'01 Nov 2024', desc:'EMI #10 — Both plots',           amount:'₹12,000', method:'Cash',   status:'paid' },
  ];
}
