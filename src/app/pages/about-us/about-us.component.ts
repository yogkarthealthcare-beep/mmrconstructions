import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { SeoService } from '../../services/seo.service';

interface LeadershipMember {
  name: string;
  role: string;
  designation: string;
  badge: string;
  bio: string;
  icon: string;
}

interface ServiceHighlight {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  points: string[];
}

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.css'],
})
export class AboutUsComponent implements OnInit {
  heroImage = 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1920&q=80';

  companyName = 'MMR Constructions and Developers Private Limited';
  cinNumber = 'U68200UP2025PTC229203';
  gstNumber = '09AATCM6753A1Z5';
  phone = '+91 95111 19879';
  email = 'official@mmrconstructions.in';
  address = 'Tribhuvan Kheda, Sheshpur, Unnao, Uttar Pradesh, India - 209801';

  milestones = [
    { value: '15+', label: 'Years of Experience', sub: 'Excellence since 2009' },
    { value: '10,000+', label: 'Happy Families & Clients', sub: 'Plots & homes delivered' },
    { value: '100%', label: 'Dispute-Free Land', sub: 'Clear legal title & registry' },
    { value: '6+', label: 'Prime Project Sites', sub: 'Kanpur, Unnao, Lucknow' },
  ];

  leadership: LeadershipMember[] = [
    {
      name: 'Suraj Kumar Verma',
      role: 'Director',
      designation: 'Director — Land Acquisition & Strategic Planning',
      badge: 'Board of Directors',
      bio: 'Visionary real estate developer with extensive expertise in bulk land acquisition, legal due-diligence, master-planning, and high-growth infrastructure corridors across Uttar Pradesh.',
      icon: 'fas fa-user-tie'
    },
    {
      name: 'Sangeet Rajput',
      role: 'Managing Director',
      designation: 'Managing Director — Operations & Project Execution',
      badge: 'Executive Leadership',
      bio: 'Dynamic leader spearheading society development, custom turnkey construction execution (villas, malls, commercial hubs), customer trust programs, and operational excellence.',
      icon: 'fas fa-building-user'
    }
  ];

  services: ServiceHighlight[] = [
    {
      icon: 'fas fa-layer-group',
      title: 'Bulk Land Acquisition from Trusted Owners',
      subtitle: '100% Verified Legal Titles',
      description: 'We acquire large parcels of prime agricultural and commercial land directly from verified field owners and trusted sellers with complete government documentation and clear registry.',
      points: ['Direct purchase from original landowners', 'Zero legal dispute guarantee', 'Verified revenue & mutation records']
    },
    {
      icon: 'fas fa-city',
      title: 'Integrated Society & Infrastructure Planning',
      subtitle: 'Modern Gated Communities',
      description: 'We engineer master-planned residential and commercial societies equipped with wide concrete roads, electricity networks, drainage lines, green parks, and commercial zones.',
      points: ['Wide planned road networks', 'Electricity, water & street lighting', 'Gated security & open green parks']
    },
    {
      icon: 'fas fa-map-marked-alt',
      title: 'Residential & Commercial Plot Allotment',
      subtitle: 'Flexible Plot Dimensions',
      description: 'Choose your desired plot size (50, 100, 150, 200+ Gaj / Sq.Ft.) with immediate possession, clear registry, and easy EMI installment payment facilities.',
      points: ['Immediate on-spot registry assistance', 'Flexible monthly EMI plans', 'High return on investment (ROI)']
    },
    {
      icon: 'fas fa-hammer',
      title: 'Custom Construction on Pre-Order',
      subtitle: 'Turnkey Architectural Delivery',
      description: 'We construct customized apartments, luxury villas, multi-storey commercial malls, restaurants, and educational institutions based on customer pre-orders and architectural requirements.',
      points: ['Custom villas & modern apartments', 'Commercial malls & restaurants', 'High-grade building materials & timely delivery']
    },
    {
      icon: 'fas fa-home',
      title: 'Ready-to-Move Houses & Luxury Villas',
      subtitle: 'Immediate Possession Available',
      description: 'For buyers seeking instant move-in ready homes, we offer premium constructed houses and independent duplex villas built with superior craftsmanship at fair, transparent market prices.',
      points: ['Premium finishing & modern fittings', 'Immediate possession & legal clearance', 'Fair, transparent and competitive pricing']
    },
    {
      icon: 'fas fa-hand-holding-dollar',
      title: '12-Year Trust & Buyback Security',
      subtitle: 'Long-term Financial Security',
      description: 'Every plot investment with MMR is backed by our signature buyback and customer loyalty assistance program, ensuring peace of mind for every investor and homeowner.',
      points: ['Buyback policy security', 'Transparent documentation & allotment', 'Dedicated relationship manager support']
    }
  ];

  trustPillars = [
    {
      icon: 'fas fa-award',
      title: '15+ Years Industry Experience',
      text: 'Over 15 years of continuous excellence in land development, construction engineering, and property advisory across Uttar Pradesh.'
    },
    {
      icon: 'fas fa-shield-halved',
      title: '10,000+ Satisfied Property Owners',
      text: 'More than 10,000 families have bought plots and built their dream homes through MMR with zero disputes and 100% satisfaction.'
    },
    {
      icon: 'fas fa-scale-balanced',
      title: 'Zero Legal Issues / 100% Clean Records',
      text: 'Every single square yard sold by MMR has clear title deeds, mutation records, and full compliance with local authorities.'
    },
    {
      icon: 'fas fa-handshake-angle',
      title: 'Transparent & Fair Pricing Policy',
      text: 'No hidden charges, fair market rates, flexible payment plans, and honest guidance from our dedicated advisory team.'
    }
  ];

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.set({
      title: 'About Us | MMR Constructions and Developers Private Limited',
      description: 'Learn about MMR Constructions and Developers Private Limited — 15+ years of trust, 10,000+ happy clients, master-planned society development, custom villa & mall construction, and clear-title plots in Kanpur, Unnao & Lucknow.',
      keywords: 'About MMR Constructions, MMR Constructions and Developers Private Limited, Suraj Kumar Verma, Sangeet Rajput, plots in Kanpur, plots in Unnao, custom villas Lucknow, real estate developer UP',
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
          { '@type': 'Person', name: 'Sangeet Rajput', jobTitle: 'Managing Director' }
        ],
        numberOfEmployees: '100+',
        foundingDate: '2009',
        areaServed: ['Unnao', 'Kanpur', 'Lucknow'],
        url: 'https://mmrconstructions.in/about-us',
      },
    });
  }
}
