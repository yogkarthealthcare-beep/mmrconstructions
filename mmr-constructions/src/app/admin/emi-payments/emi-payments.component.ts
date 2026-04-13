import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-emi-payments', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './emi-payments.component.html' })
export class EmiPaymentsComponent {
  filterMonth = '2025-04'; search = '';
  summaryStats = [
    { val:'₹38.4L', lbl:'Total Due',       icon:'fas fa-rupee-sign',           bg:'#eaf4ee', clr:'#1a5c3a' },
    { val:'₹24.1L', lbl:'Collected',        icon:'fas fa-check-circle',         bg:'#dcfce7', clr:'#16a34a' },
    { val:'₹2.1L',  lbl:'Overdue',          icon:'fas fa-exclamation-triangle',  bg:'#fee2e2', clr:'#dc2626' },
    { val:'42',     lbl:'Payments Due',     icon:'fas fa-calendar',             bg:'#fdf8ec', clr:'#a07c2a' },
  ];
  payments = [
    { id:'PAY001', customer:'Ramesh Kumar',  mobile:'9876543210', plot:'AIMA-A12', emi:'₹6,000',  dueDate:'01 Apr 2025', paidDate:'02 Apr 2025', status:'paid',    method:'Cash' },
    { id:'PAY002', customer:'Sunita Devi',   mobile:'8765432109', plot:'TK-B04',   emi:'₹3,000',  dueDate:'01 Apr 2025', paidDate:'',            status:'overdue', method:'' },
    { id:'PAY003', customer:'Priya Singh',   mobile:'6543210987', plot:'AIMA-C08', emi:'₹18,000', dueDate:'05 Apr 2025', paidDate:'05 Apr 2025', status:'paid',    method:'Cheque' },
    { id:'PAY004', customer:'Mohit Kumar',   mobile:'9988776655', plot:'GK-D02',   emi:'₹3,000',  dueDate:'10 Apr 2025', paidDate:'',            status:'pending', method:'' },
    { id:'PAY005', customer:'Kavita Mishra', mobile:'8877665544', plot:'LKO-E15',  emi:'₹12,000', dueDate:'15 Apr 2025', paidDate:'14 Apr 2025', status:'paid',    method:'Online' },
    { id:'PAY006', customer:'Deepak Tiwari', mobile:'7766554433', plot:'AJ-F01',   emi:'₹6,000',  dueDate:'20 Apr 2025', paidDate:'',            status:'pending', method:'' },
  ];
  get filtered() { return this.payments.filter(p => !this.search || p.customer.toLowerCase().includes(this.search.toLowerCase()) || p.mobile.includes(this.search)); }
  markPaid(p: any) { p.status = 'paid'; p.paidDate = 'Today'; p.method = 'Cash'; }
}
