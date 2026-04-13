import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-documents', standalone: true, imports: [CommonModule], templateUrl: './documents.component.html' })
export class DocumentsComponent {
  myDocs = [
    { name:'Aadhar Card',         type:'KYC',       status:'verified', date:'Jan 2024', icon:'fas fa-id-card',          color:'#eaf4ee;color:#16a34a' },
    { name:'PAN Card',            type:'KYC',       status:'verified', date:'Jan 2024', icon:'fas fa-credit-card',      color:'#eaf4ee;color:#16a34a' },
    { name:'Passport Photo',      type:'KYC',       status:'verified', date:'Jan 2024', icon:'fas fa-camera',           color:'#eaf4ee;color:#16a34a' },
    { name:'Plot Agreement A12',  type:'Agreement', status:'issued',   date:'Jan 2024', icon:'fas fa-file-contract',    color:'#eff6ff;color:#2563eb' },
    { name:'Plot Agreement A18',  type:'Agreement', status:'issued',   date:'Jan 2024', icon:'fas fa-file-contract',    color:'#eff6ff;color:#2563eb' },
    { name:'EMI Schedule PDF',    type:'Finance',   status:'download', date:'Jan 2024', icon:'fas fa-file-invoice',     color:'#fdf8ec;color:#a07c2a' },
  ];
}
