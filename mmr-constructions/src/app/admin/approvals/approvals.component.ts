import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-approvals', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './approvals.component.html' })
export class ApprovalsComponent {
  filter = 'all'; search = '';
  registrations = [
    { id:'REG001', name:'Ramesh Kumar Sharma', mobile:'9876543210', email:'ramesh@gmail.com', type:'Customer', city:'Kanpur', date:'08 Apr 2025', status:'pending', aadhar:'XXXX-XXXX-1234' },
    { id:'REG002', name:'Sunita Devi Yadav',   mobile:'8765432109', email:'',                type:'Associate',city:'Unnao',  date:'07 Apr 2025', status:'pending', aadhar:'XXXX-XXXX-5678' },
    { id:'REG003', name:'Ajay Verma',          mobile:'7654321098', email:'ajay@gmail.com',  type:'Customer', city:'Lucknow',date:'07 Apr 2025', status:'approved',aadhar:'XXXX-XXXX-9012' },
    { id:'REG004', name:'Priya Singh',         mobile:'6543210987', email:'',                type:'Associate',city:'Kanpur', date:'06 Apr 2025', status:'pending', aadhar:'XXXX-XXXX-3456' },
    { id:'REG005', name:'Mohit Kumar',         mobile:'9988776655', email:'mohit@gmail.com', type:'Customer', city:'Unnao',  date:'05 Apr 2025', status:'rejected',aadhar:'XXXX-XXXX-7890' },
    { id:'REG006', name:'Kavita Mishra',       mobile:'8877665544', email:'',                type:'Customer', city:'Lucknow',date:'05 Apr 2025', status:'pending', aadhar:'XXXX-XXXX-2345' },
    { id:'REG007', name:'Deepak Tiwari',       mobile:'7766554433', email:'deep@gmail.com',  type:'Associate',city:'Kanpur', date:'04 Apr 2025', status:'approved',aadhar:'XXXX-XXXX-6789' },
  ];
  get filtered() {
    return this.registrations.filter(r =>
      (this.filter === 'all' || r.status === this.filter || r.type.toLowerCase() === this.filter) &&
      (!this.search || r.name.toLowerCase().includes(this.search.toLowerCase()) || r.mobile.includes(this.search))
    );
  }
  approve(r: any) { r.status = 'approved'; }
  reject(r: any)  { r.status = 'rejected'; }
}
