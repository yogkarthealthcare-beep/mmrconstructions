import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-buyback', standalone: true, imports: [CommonModule], templateUrl: './buyback.component.html' })
export class BuybackComponent {
  cards = [
    { icon: 'fas fa-award', title: '10+ Years Legacy', desc: '10 से अधिक वर्षों का रियल एस्टेट अनुभव और हजारों ग्राहकों का अटूट भरोसा।' },
    { icon: 'fas fa-file-contract', title: '100% Legal Transparency', desc: 'सभी प्लॉट पूरी तरह से सत्यापित, पारदर्शी कागजात और सरकारी मानकों के अनुरूप।' },
    { icon: 'fas fa-users-cog', title: '500+ Happy Families', desc: 'सैकड़ों संतुष्ट ग्राहक जिन्होंने अपने सपनों का घर व प्लॉट MMR Constructions के साथ पाया।' },
    { icon: 'fas fa-gem', title: 'Prime Growth Locations', desc: 'हाईवे, कनेक्टिविटी व आगामी विकास गलियारों के समीप उच्च रिटर्न वाले प्रीमियम प्लॉट।' },
  ];

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}
