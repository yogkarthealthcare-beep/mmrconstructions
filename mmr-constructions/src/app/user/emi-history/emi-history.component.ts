import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-emi-history', standalone: true, imports: [CommonModule], templateUrl: './emi-history.component.html' })
export class EmiHistoryComponent {
  summaryStats = [
    { val:'₹1,80,000', lbl:'Total Paid',  icon:'fas fa-check-circle',  bg:'#dcfce7', clr:'#16a34a' },
    { val:'₹7,40,000', lbl:'Balance',     icon:'fas fa-rupee-sign',    bg:'#eaf4ee', clr:'#1a5c3a' },
    { val:'15',        lbl:'EMIs Paid',   icon:'fas fa-calendar-check', bg:'#fdf8ec', clr:'#a07c2a' },
    { val:'45',        lbl:'EMIs Left',   icon:'fas fa-hourglass-half', bg:'#eff6ff', clr:'#2563eb' },
  ];
  schedule = [
    { inst:1,  dueDate:'01 Feb 2024', paidDate:'02 Feb 2024', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:2,  dueDate:'01 Mar 2024', paidDate:'01 Mar 2024', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:3,  dueDate:'01 Apr 2024', paidDate:'03 Apr 2024', amount:'₹12,600', method:'Cash',   status:'paid',     late:true  },
    { inst:4,  dueDate:'01 May 2024', paidDate:'01 May 2024', amount:'₹12,000', method:'Cheque', status:'paid',     late:false },
    { inst:5,  dueDate:'01 Jun 2024', paidDate:'02 Jun 2024', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:6,  dueDate:'01 Jul 2024', paidDate:'01 Jul 2024', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:7,  dueDate:'01 Aug 2024', paidDate:'31 Jul 2024', amount:'₹12,000', method:'Online', status:'paid',     late:false },
    { inst:8,  dueDate:'01 Sep 2024', paidDate:'01 Sep 2024', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:9,  dueDate:'01 Oct 2024', paidDate:'01 Oct 2024', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:10, dueDate:'01 Nov 2024', paidDate:'02 Nov 2024', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:11, dueDate:'01 Dec 2024', paidDate:'01 Dec 2024', amount:'₹12,000', method:'Cheque', status:'paid',     late:false },
    { inst:12, dueDate:'01 Jan 2025', paidDate:'01 Jan 2025', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:13, dueDate:'01 Feb 2025', paidDate:'01 Feb 2025', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:14, dueDate:'01 Mar 2025', paidDate:'01 Mar 2025', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:15, dueDate:'01 Apr 2025', paidDate:'02 Apr 2025', amount:'₹12,000', method:'Cash',   status:'paid',     late:false },
    { inst:16, dueDate:'01 May 2025', paidDate:'',            amount:'₹12,000', method:'',       status:'upcoming', late:false },
  ];
}
