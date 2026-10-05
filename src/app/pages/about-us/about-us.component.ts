import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { SeoService } from '../../services/seo.service';

interface StatItem {
  icon: string;
  value: string;
  label: string;
  sub: string;
}

interface ServiceCard {
  icon: string;
  title: string;
  description: string;
  linkText: string;
}

interface StrengthCard {
  icon: string;
  title: string;
  description: string;
}

interface DirectorItem {
  name: string;
  designation: string;
  description: string;
  avatar: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
}

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.css'],
})
export class AboutUsComponent implements OnInit {
  companyName = 'MMR Constructions and Developers Private Limited';
  cinNumber = 'U68200UP2025PTC229203';
  gstNumber = '09AATCM6753A1Z5';
  phone = '+91 95111 19879';
  email = 'official@mmrconstructions.in';
  regdOffice = 'Meerut / Unnao, Uttar Pradesh';

  // Hero & Showcase Imagery
  heroBg = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80';
  townshipEntranceImg = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80';
  ctaBg = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80';

  // Statistics
  statistics: StatItem[] = [
    {
      icon: 'fas fa-calendar-alt',
      value: '15+',
      label: 'Saalon Ka Experience',
      sub: '2009 se nirantar vishwas',
    },
    {
      icon: 'fas fa-users',
      value: '10,000+',
      label: 'Khushaal Parivaar',
      sub: 'Plots aur homes delivered',
    },
    {
      icon: 'fas fa-shield-alt',
      value: '100%',
      label: 'Dispute-Free Land',
      sub: 'Clear titles aur legal security',
    },
    {
      icon: 'fas fa-map-marker-alt',
      value: '6+',
      label: 'Prime Project Sites',
      sub: 'Kanpur, Unnao aur Lucknow mein',
    },
  ];

  // 6 Services
  services: ServiceCard[] = [
    {
      icon: 'fas fa-home',
      title: 'Residential Plots & Gated Townships',
      description: 'Well-planned plots, pakki sadkein, drainage aur 24×7 electricity ke saath surakshit society.',
      linkText: 'Sites Dekhein',
    },
    {
      icon: 'fas fa-building',
      title: 'Commercial Shops & Hubs',
      description: 'Highway aur prime locations par shops, showrooms aur business ke liye high-return spaces.',
      linkText: 'Explore Karein',
    },
    {
      icon: 'fas fa-map-marked-alt',
      title: 'Master-Planned Townships',
      description: 'Parks, boundary wall, grand entrance gate aur modern amenities se lais townships.',
      linkText: 'Janiye Aur',
    },
    {
      icon: 'fas fa-shield-alt',
      title: '100% Legal & Registry Support',
      description: 'Dispute-free zameen, clear registry, dakhil kharij aur bank verification ki complete suvidha.',
      linkText: 'Janiye Aur',
    },
    {
      icon: 'fas fa-hand-holding-usd',
      title: '2-Year Buyback Guarantee',
      description: 'Aapka paisa 100% safe — 2 saal mein investment + ₹1,00,000 extra return ki guarantee.',
      linkText: 'Buyback Terms',
    },
    {
      icon: 'fas fa-user-tie',
      title: 'Associate Earning Program',
      description: 'Associate banein aur plot sales par 12 saal tak monthly commission aur target bonus kamayein.',
      linkText: 'Join Karein',
    },
  ];

  // 4 Strengths / Why Choose Us
  strengths: StrengthCard[] = [
    {
      icon: 'fas fa-shield-alt',
      title: '100% Legal & Transparent',
      description: 'Har plot ki legal scrutiny, clear registry aur transparent paperwork.',
    },
    {
      icon: 'fas fa-calculator',
      title: 'Aasan EMI & Bank Finance',
      description: 'Sirf ₹51,000 down payment aur aasan maasik kishton par apna plot payein.',
    },
    {
      icon: 'fas fa-city',
      title: 'Highway & Prime Locations',
      description: 'Airports, highways aur railway stations se sirf kuch hi minutes ki doori.',
    },
    {
      icon: 'fas fa-clock',
      title: 'Samay Par Possession',
      description: 'Paved roads, electric poles aur boundary ke saath waqt par direct possession.',
    },
  ];

  // Directors / Leadership
  directors: DirectorItem[] = [
    {
      name: 'Suraj Kumar Verma',
      designation: 'Director',
      description: 'Strategic planning, project execution aur business expansion ko lead karte hain, jisse har grahak ko mile behtar vishwas.',
      avatar: 'assets/suraj-kumar-verma.jpg',
      linkedinUrl: '#',
      youtubeUrl: '#',
    },
    {
      name: 'Sangeet Rajput',
      designation: 'Managing Director',
      description: 'Ground operations, site planning aur customer relations mein vishesh anubhav ke saath best quality deliver karte hain.',
      avatar: 'assets/sangeet-rajput.jpg',
      linkedinUrl: '#',
      youtubeUrl: '#',
    },
  ];

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'About Us | MMR Constructions and Developers Private Limited',
      description:
        'Learn about MMR Constructions and Developers Private Limited — 15+ years of trust, 10,000+ happy clients, master-planned society development, custom villa & mall construction, and clear-title plots in Kanpur, Unnao & Lucknow.',
      keywords:
        'About MMR Constructions, MMR Constructions and Developers Private Limited, Suraj Kumar Verma, Sangeet Rajput, plots in Kanpur, plots in Unnao, custom villas Lucknow, real estate developer UP',
      canonical: '/about-us',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: 'MMR Constructions and Developers Private Limited',
        legalName: 'M.M.R. Construction & Developers Private Limited',
        telephone: '+91-9511119879',
        email: 'official@mmrconstructions.in',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Tribhuvan Kheda, Sheshpur',
          addressLocality: 'Unnao',
          addressRegion: 'Uttar Pradesh',
          postalCode: '209801',
          addressCountry: 'IN',
        },
        founder: [
          { '@type': 'Person', name: 'Suraj Kumar Verma', jobTitle: 'Director' },
          { '@type': 'Person', name: 'Sangeet Rajput', jobTitle: 'Managing Director' },
        ],
        numberOfEmployees: '100+',
        foundingDate: '2009',
        areaServed: ['Unnao', 'Kanpur', 'Lucknow', 'Meerut'],
        url: 'https://mmrconstructions.in/about-us',
      },
    });
  }
}
