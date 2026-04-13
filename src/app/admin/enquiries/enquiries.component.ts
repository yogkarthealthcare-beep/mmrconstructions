import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-enquiries', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './enquiries.component.html' })
export class EnquiriesComponent implements OnInit {
  loading = true; search = ''; filter = 'all';
  // Static enquiries (enquiry API not in spec, using static with local state)
  enquiries = [
    { id:1, name:'Mohit Yadav',   mobile:'9988776655', interest:'Plot Booking — 100 Gaj', message:'100 gaj plot chahiye AIMA site mein', date:'2025-04-08', status:'open',   priority:'high' },
    { id:2, name:'Geeta Sharma',  mobile:'8877665544', interest:'Site Visit Request',      message:'Site visit karni hai Unnao mein',     date:'2025-04-08', status:'open',   priority:'medium' },
    { id:3, name:'Vikas Gupta',   mobile:'7766554433', interest:'Associate Program',       message:'Commission earn karna chahta hoon',   date:'2025-04-07', status:'called', priority:'medium' },
    { id:4, name:'Ritu Pandey',   mobile:'6655443322', interest:'Plot Booking — 50 Gaj',  message:'EMI kitna hoga 50 gaj ka?',            date:'2025-04-06', status:'closed', priority:'low' },
    { id:5, name:'Amit Saxena',   mobile:'9944332211', interest:'General Enquiry',         message:'Buyback policy details chahiye',       date:'2025-04-06', status:'open',   priority:'low' },
    { id:6, name:'Pooja Verma',   mobile:'8833221100', interest:'Plot Booking — 100 Gaj', message:'Lucknow site mein plot lena hai',      date:'2025-04-05', status:'called', priority:'high' },
  ];
  constructor(private api: ApiService) {}
  ngOnInit() { this.loading = false; }
  get filtered() { return this.enquiries.filter(e => (this.filter==='all'||e.status===this.filter) && (!this.search||e.name.toLowerCase().includes(this.search.toLowerCase())||e.mobile.includes(this.search))); }
  updateStatus(e: any, s: string) { e.status = s; }
  notify(userId: number) {
    this.api.adminSendNotif({ user_id: userId, title: 'Follow Up', message: 'Thank you for your enquiry. Our team will contact you shortly.', channel: 'Push' }).subscribe();
  }
}
