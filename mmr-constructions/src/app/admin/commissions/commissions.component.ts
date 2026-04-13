import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-commissions', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './commissions.component.html' })
export class CommissionsComponent {
  filterMonth = '2025-04';
  summaryStats = [
    { val:'₹45,600', lbl:'Total Payable Apr',  icon:'fas fa-rupee-sign',   bg:'#eaf4ee', clr:'#1a5c3a' },
    { val:'₹33,600', lbl:'Paid This Month',     icon:'fas fa-check-circle', bg:'#dcfce7', clr:'#16a34a' },
    { val:'₹12,000', lbl:'Pending',             icon:'fas fa-clock',        bg:'#fdf8ec', clr:'#a07c2a' },
    { val:'63',      lbl:'Active Associates',   icon:'fas fa-user-tie',     bg:'#eff6ff', clr:'#2563eb' },
  ];
  records = [
    { associate:'Deepak Tiwari',   code:'MMR-DT-001', gaj:2400, monthly:'₹14,400', status:'paid',    paidDate:'01 Apr 2025', ytd:'₹1,72,800' },
    { associate:'Anita Sharma',    code:'MMR-AS-004', gaj:3200, monthly:'₹19,200', status:'paid',    paidDate:'01 Apr 2025', ytd:'₹2,30,400' },
    { associate:'Neha Gupta',      code:'MMR-NG-002', gaj:1200, monthly:'₹7,200',  status:'pending', paidDate:'',            ytd:'₹79,200'   },
    { associate:'Suresh Yadav',    code:'MMR-SY-003', gaj:600,  monthly:'₹3,600',  status:'pending', paidDate:'',            ytd:'₹39,600'   },
    { associate:'Ravi Mishra',     code:'MMR-RM-005', gaj:200,  monthly:'₹1,200',  status:'hold',    paidDate:'',            ytd:'₹7,200'    },
  ];
  markPaid(r: any) { r.status = 'paid'; r.paidDate = 'Today'; }
}
