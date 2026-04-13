import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({ selector: 'app-customers', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './customers.component.html' })
export class CustomersComponent {
  search = '';
  customers = [
    { id:'C001', name:'Ramesh Kumar',  mobile:'9876543210', city:'Kanpur',  plots:2, totalAmt:'₹9,20,000', paid:'₹3,40,000', emi:'₹12,000', status:'active',  joinDate:'Jan 2024' },
    { id:'C002', name:'Sunita Devi',   mobile:'8765432109', city:'Unnao',   plots:1, totalAmt:'₹2,31,000', paid:'₹82,000',   emi:'₹3,000',  status:'active',  joinDate:'Feb 2024' },
    { id:'C003', name:'Ajay Verma',    mobile:'7654321098', city:'Lucknow', plots:1, totalAmt:'₹4,60,000', paid:'₹4,60,000', emi:'₹0',      status:'complete', joinDate:'Mar 2023' },
    { id:'C004', name:'Priya Singh',   mobile:'6543210987', city:'Kanpur',  plots:3, totalAmt:'₹13,80,000',paid:'₹4,20,000', emi:'₹18,000', status:'active',  joinDate:'Nov 2023' },
    { id:'C005', name:'Mohit Kumar',   mobile:'9988776655', city:'Unnao',   plots:1, totalAmt:'₹2,31,000', paid:'₹51,000',   emi:'₹3,000',  status:'overdue', joinDate:'Dec 2023' },
    { id:'C006', name:'Kavita Mishra', mobile:'8877665544', city:'Lucknow', plots:2, totalAmt:'₹9,20,000', paid:'₹1,20,000', emi:'₹12,000', status:'active',  joinDate:'Mar 2024' },
  ];
  get filtered() { return this.customers.filter(c => !this.search || c.name.toLowerCase().includes(this.search.toLowerCase()) || c.mobile.includes(this.search)); }
}
