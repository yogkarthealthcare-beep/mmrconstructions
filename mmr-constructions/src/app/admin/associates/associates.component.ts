import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-associates', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './associates.component.html' })
export class AssociatesComponent {
  search = '';
  associates = [
    { id:'A001', name:'Deepak Tiwari',   mobile:'7766554433', city:'Kanpur',  code:'MMR-DT-001', gajSold:2400, monthly:'₹14,400', bonus:'₹3L due in 2031', customers:18, status:'active'   },
    { id:'A002', name:'Neha Gupta',      mobile:'6655443322', city:'Unnao',   code:'MMR-NG-002', gajSold:1200, monthly:'₹7,200',  bonus:'—',               customers:9,  status:'active'   },
    { id:'A003', name:'Suresh Yadav',    mobile:'9944332211', city:'Lucknow', code:'MMR-SY-003', gajSold:600,  monthly:'₹3,600',  bonus:'—',               customers:5,  status:'active'   },
    { id:'A004', name:'Anita Sharma',    mobile:'8833221100', city:'Kanpur',  code:'MMR-AS-004', gajSold:3200, monthly:'₹19,200', bonus:'₹3L due in 2030', customers:24, status:'active'   },
    { id:'A005', name:'Ravi Mishra',     mobile:'7722110099', city:'Unnao',   code:'MMR-RM-005', gajSold:200,  monthly:'₹1,200',  bonus:'—',               customers:2,  status:'inactive' },
  ];
  get filtered() { return this.associates.filter(a => !this.search || a.name.toLowerCase().includes(this.search.toLowerCase()) || a.mobile.includes(this.search)); }
}
