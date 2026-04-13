import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-referral', standalone: true, imports: [CommonModule], templateUrl: './referral.component.html' })
export class ReferralComponent {
  inviteCode = 'MMR-DT-001';
  referralLink = 'https://mmrconstructions.in/register?ref=MMR-DT-001';
  copied = false;
  copyCode() { navigator.clipboard.writeText(this.inviteCode).then(() => { this.copied = true; setTimeout(() => this.copied = false, 2000); }); }
  copyLink() { navigator.clipboard.writeText(this.referralLink); }
  shareWhatsApp() { window.open(`https://wa.me/?text=MMR Constructions में plot book करें! मेरा invitation code use करें: ${this.inviteCode} — ${this.referralLink}`); }

  referrals = [
    { name:'Ramesh Kumar',  mobile:'9876543210', type:'Customer',  joinDate:'Jan 2024', gaj:200, status:'active' },
    { name:'Sunita Devi',   mobile:'8765432109', type:'Customer',  joinDate:'Feb 2024', gaj:100, status:'active' },
    { name:'Ajay Verma',    mobile:'7654321098', type:'Customer',  joinDate:'Mar 2024', gaj:200, status:'complete' },
    { name:'Priya Singh',   mobile:'6543210987', type:'Associate', joinDate:'Apr 2024', gaj:300, status:'active' },
    { name:'Mohit Kumar',   mobile:'9988776655', type:'Customer',  joinDate:'May 2024', gaj:200, status:'active' },
  ];
}
