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
      label: 'Years of Experience',
      sub: 'Excellence since 2009',
    },
    {
      icon: 'fas fa-users',
      value: '10,000+',
      label: 'Happy Families & Clients',
      sub: 'Plots & homes delivered',
    },
    {
      icon: 'fas fa-shield-alt',
      value: '100%',
      label: 'Dispute-Free Land',
      sub: 'Clear titles & legal security',
    },
    {
      icon: 'fas fa-map-marker-alt',
      value: '6+',
      label: 'Prime Project Sites',
      sub: 'Kanpur, Unnao, Lucknow',
    },
  ];

  // 6 Services
  services: ServiceCard[] = [
    {
      icon: 'fas fa-home',
      title: 'Residential Plots & Homes',
      description: 'Well-planned plots, modern homes and secure communities.',
      linkText: 'Learn More',
    },
    {
      icon: 'fas fa-building',
      title: 'Commercial Spaces',
      description: 'Shops, offices, malls and business hubs for growth.',
      linkText: 'Learn More',
    },
    {
      icon: 'fas fa-map-marked-alt',
      title: 'Township Development',
      description: 'Modern infrastructure with parks, roads and premium amenities.',
      linkText: 'Learn More',
    },
    {
      icon: 'fas fa-hard-hat',
      title: 'Custom Construction',
      description: 'Tailored construction solutions for homes and businesses.',
      linkText: 'Learn More',
    },
    {
      icon: 'fas fa-tools',
      title: 'Renovation & Upgradation',
      description: 'Enhance your existing spaces with modern designs.',
      linkText: 'Learn More',
    },
    {
      icon: 'fas fa-award',
      title: '12+ Year Expertise',
      description: 'Trusted by thousands for quality and commitment.',
      linkText: 'Learn More',
    },
  ];

  // 4 Strengths / Why Choose Us
  strengths: StrengthCard[] = [
    {
      icon: 'fas fa-shield-alt',
      title: 'Trusted & Transparent',
      description: 'Clear titles, legal security and honest dealings.',
    },
    {
      icon: 'fas fa-users',
      title: 'Customer Focused',
      description: 'Your satisfaction is our priority.',
    },
    {
      icon: 'fas fa-city',
      title: 'Modern Infrastructure',
      description: 'Well-planned, sustainable and future-ready.',
    },
    {
      icon: 'fas fa-clock',
      title: 'On-Time Delivery',
      description: 'Commitment to deliver as promised.',
    },
  ];

  // Directors / Leadership
  directors: DirectorItem[] = [
    {
      name: 'Suraj Kumar Verma',
      designation: 'Director',
      description: 'Leads strategic planning, project execution and business expansion with a focus on sustainable growth.',
      avatar: 'assets/suraj-kumar-verma.jpg',
      linkedinUrl: '#',
      youtubeUrl: '#',
    },
    {
      name: 'Sangeet Rajput',
      designation: 'Managing Director',
      description: 'Brings expertise in operations, project management and customer relations to ensure excellence.',
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
