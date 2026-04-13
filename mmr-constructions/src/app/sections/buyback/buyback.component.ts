import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({ selector: 'app-buyback', standalone: true, imports: [CommonModule], templateUrl: './buyback.component.html' })
export class BuybackComponent {
  cards = [
    { icon: 'fas fa-clock', title: '2 Year Window', desc: 'Registration के 2 साल के अंदर buyback apply करें।' },
    { icon: 'fas fa-plus-circle', title: '+₹1,00,000 Extra', desc: 'Original price के ऊपर ₹1 lakh extra। Investment profitable।' },
    { icon: 'fas fa-wheelchair', title: 'Disability Clause', desc: 'Disability पर: remaining EMIs माफ + registry + possession।' },
    { icon: 'fas fa-file-contract', title: 'Registry Cost Free', desc: 'Full payment पर company registry cost खुद cover करती है।' },
  ];
}
