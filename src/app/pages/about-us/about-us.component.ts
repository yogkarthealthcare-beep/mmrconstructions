import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.css'],
})
export class AboutUsComponent implements OnInit {
  heroImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80';

  highlights = [
    { value: '2019', label: 'Established' },
    { value: 'U68200UP2025PTC229203', label: 'CIN No.' },
    { value: '3+', label: 'Core Cities' },
    { value: '360°', label: 'Property Support' },
  ];

  details = [
    { icon: 'fas fa-building', label: 'Company Name', value: 'M.M.R. Constructions & Developers Pvt. Ltd.' },
    { icon: 'fas fa-map-marker-alt', label: 'Registered Office', value: 'Tribhuvan Khera, Unnao, Uttar Pradesh - 209862' },
    { icon: 'fas fa-phone-alt', label: 'Contact Number', value: '+91 95111 19879' },
    { icon: 'fas fa-map-marked-alt', label: 'Service Areas', value: 'Unnao, Kanpur, Lucknow and nearby growth corridors' },
  ];

  services = [
    'Residential plot planning and sales',
    'Commercial and investment plot assistance',
    'Site visits and customer guidance',
    'Documentation and verification support',
    'Easy EMI and payment guidance',
    'Buyback policy support for eligible customers',
  ];

  values = [
    { icon: 'fas fa-shield-alt', title: 'Transparency', text: 'Clear project information, documented processes, and practical guidance before customers make a decision.' },
    { icon: 'fas fa-handshake', title: 'Customer Trust', text: 'A relationship-first approach for site visits, bookings, payment support, and after-sales assistance.' },
    { icon: 'fas fa-road', title: 'Location Focus', text: 'Projects and opportunities near developing highways, city edges, and accessible residential corridors.' },
  ];

  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.set({
      title: 'About Us | MMR Constructions & Developers Pvt. Ltd.',
      description: 'Learn about MMR Constructions & Developers Pvt. Ltd., a property and plot development company serving Unnao, Kanpur and Lucknow with transparent real estate guidance.',
      keywords: 'About MMR Constructions, MMR Constructions company details, MMR Developers Unnao, property dealer Unnao, plots Kanpur Lucknow',
      canonical: '/about-us',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: 'M.M.R. Constructions & Developers Pvt. Ltd.',
        telephone: '+91-9511119879',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Tribhuvan Khera',
          addressLocality: 'Unnao',
          addressRegion: 'Uttar Pradesh',
          postalCode: '209862',
          addressCountry: 'IN',
        },
        areaServed: ['Unnao', 'Kanpur', 'Lucknow'],
        url: 'https://mmrconstructions.in/about-us',
      },
    });
  }
}
