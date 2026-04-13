import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-commission-tracker', standalone: true, imports: [CommonModule], templateUrl: './commission-tracker.component.html' })
export class CommissionTrackerComponent {
  gajSold = 2400; targetGaj = 2000;
  commissions = [
    { month:'Apr 2025', gaj:2400, amount:'₹14,400', status:'pending', paidDate:'' },
    { month:'Mar 2025', gaj:2400, amount:'₹14,400', status:'paid',    paidDate:'01 Mar 2025' },
    { month:'Feb 2025', gaj:2400, amount:'₹14,400', status:'paid',    paidDate:'01 Feb 2025' },
    { month:'Jan 2025', gaj:2400, amount:'₹14,400', status:'paid',    paidDate:'01 Jan 2025' },
    { month:'Dec 2024', gaj:2400, amount:'₹14,400', status:'paid',    paidDate:'01 Dec 2024' },
    { month:'Nov 2024', gaj:1800, amount:'₹10,800', status:'paid',    paidDate:'01 Nov 2024' },
  ];
  customers = [
    { name:'Ramesh Kumar', mobile:'9876543210', gaj:200,  joinDate:'Jan 2024', emi:'active' },
    { name:'Sunita Devi',  mobile:'8765432109', gaj:100,  joinDate:'Feb 2024', emi:'active' },
    { name:'Ajay Verma',   mobile:'7654321098', gaj:200,  joinDate:'Mar 2024', emi:'complete' },
    { name:'Mohit Kumar',  mobile:'9988776655', gaj:300,  joinDate:'Apr 2024', emi:'active' },
    { name:'Kavita Mishra',mobile:'8877665544', gaj:200,  joinDate:'May 2024', emi:'active' },
  ];
  get monthlyComm() { return (this.gajSold / 100) * 600; }
  get pctToBonus() { return Math.min(100, Math.round((this.gajSold / this.targetGaj) * 100)); }
}
