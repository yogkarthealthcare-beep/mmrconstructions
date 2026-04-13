import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
@Component({ selector: 'app-earn', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './earn.component.html' })
export class EarnComponent {
  timeline = [
    { label: 'Per 100 Gaj Sold', value: '₹600 / month', desc: 'Net commission for 12 years continuously' },
    { label: 'Target: 2000 Gaj', value: '₹12,000 / month', desc: 'Monthly net income for 12 years after target' },
    { label: 'After 12 Years', value: '₹3,00,000 Bonus', desc: 'One-time lump sum after 12-year income period' },
  ];
  steps = [
    { num: '1', title: 'Register as Associate', desc: 'Free registration। Admin approval के बाद unique ID & invitation code मिलता है।', gold: false },
    { num: '2', title: 'Share & Invite', desc: 'WhatsApp, SMS से invitation code share करें। Network बनाएं।', gold: false },
    { num: '3', title: 'Earn Monthly', desc: 'हर बिके plot पर 12 साल तक monthly commission। Upline भी कमाता है।', gold: false },
    { num: '🏆', title: 'Hit Target & Win', desc: '2000 gaj पर ₹12,000/month + ₹3 lakh bonus after 12 years।', gold: true },
  ];
}
