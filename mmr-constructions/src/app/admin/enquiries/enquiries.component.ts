import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-enquiries', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './enquiries.component.html' })
export class EnquiriesComponent {
  search = ''; filter = 'all';
  enquiries = [
    { id:'ENQ001', name:'Mohit Yadav',    mobile:'9988776655', interest:'Plot Booking — 100 Gaj', message:'100 gaj plot chahiye AIMA site mein', date:'08 Apr 2025', status:'open',   priority:'high' },
    { id:'ENQ002', name:'Geeta Sharma',   mobile:'8877665544', interest:'Site Visit Request',      message:'Site visit karni hai Unnao mein',     date:'08 Apr 2025', status:'open',   priority:'medium' },
    { id:'ENQ003', name:'Vikas Gupta',    mobile:'7766554433', interest:'Associate Program',       message:'Commission earn karna chahta hoon',   date:'07 Apr 2025', status:'called', priority:'medium' },
    { id:'ENQ004', name:'Ritu Pandey',    mobile:'6655443322', interest:'Plot Booking — 50 Gaj',  message:'EMI kitna hoga 50 gaj ka?',            date:'06 Apr 2025', status:'closed', priority:'low' },
    { id:'ENQ005', name:'Amit Saxena',    mobile:'9944332211', interest:'General Enquiry',         message:'Buyback policy details chahiye',       date:'06 Apr 2025', status:'open',   priority:'low' },
    { id:'ENQ006', name:'Pooja Verma',    mobile:'8833221100', interest:'Plot Booking — 100 Gaj', message:'Lucknow site mein plot lena hai',      date:'05 Apr 2025', status:'called', priority:'high' },
  ];
  get filtered() {
    return this.enquiries.filter(e =>
      (this.filter === 'all' || e.status === this.filter) &&
      (!this.search || e.name.toLowerCase().includes(this.search.toLowerCase()) || e.mobile.includes(this.search))
    );
  }
  updateStatus(e: any, s: string) { e.status = s; }
}
