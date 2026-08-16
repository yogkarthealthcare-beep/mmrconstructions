import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { SeoService } from '../../services/seo.service';

interface ServiceCard {
  title: string;
  description: string;
  image: string;
  icon: string;
  features: string[];
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css'],
})
export class ServicesComponent implements OnInit {
  heroImage = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80';

  services: ServiceCard[] = [
    {
      title: 'Plot Buying & Selling',
      icon: 'fas fa-map-marked-alt',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1100&q=80',
      description: 'MMR Constructions assists customers in buying and selling residential, commercial, and investment plots with complete transparency and professional guidance. We help clients identify the right opportunities, verify property documents, evaluate market value, and complete transactions smoothly. Our goal is to ensure secure and profitable real estate investments while providing trusted support throughout the process.',
      features: [
        'Residential Plots',
        'Commercial Plots',
        'Investment Opportunities',
        'Property Verification',
        'Legal Documentation Assistance',
        'Market Value Assessment',
      ],
    },
    {
      title: 'Farmhouse Buying & Selling',
      icon: 'fas fa-tree',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=80',
      description: "We offer expert assistance in buying and selling farmhouses for personal use, weekend retreats, agricultural investments, and luxury living. Our team helps clients find premium farmhouse properties in desirable locations while ensuring clear ownership records and hassle-free transactions. Whether you're looking for a peaceful countryside escape or a valuable investment, MMR Constructions can help.",
      features: [
        'Luxury Farmhouses',
        'Agricultural Properties',
        'Weekend Retreats',
        'Investment Farmhouses',
        'Property Evaluation',
        'Secure Transactions',
      ],
    },
    {
      title: 'Plot with Construction',
      icon: 'fas fa-house-chimney',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1100&q=80',
      description: 'MMR Constructions offers complete solutions for customers who want ready-to-move homes or customized house construction. We provide plots along with professionally designed and constructed buildings, ensuring high-quality workmanship and modern architectural standards. From planning and design to construction and final handover, we manage every stage of the project.',
      features: [
        'Ready-to-Move Homes',
        'House Construction Services',
        'Modern Architecture',
        'Quality Construction Materials',
        'End-to-End Project Management',
        'Customized Building Solutions',
      ],
    },
    {
      title: 'Interior Design',
      icon: 'fas fa-couch',
      image: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1100&q=80',
      description: 'Transform your home, office, or commercial space with our professional interior design services. Our design experts create elegant, functional, and personalized interiors that reflect your style and requirements. From space planning and furniture selection to lighting, color schemes, and decor, we deliver complete interior solutions that enhance comfort and aesthetics.',
      features: [
        'Home Interior Design',
        'Office Interior Design',
        'Space Planning',
        'Furniture & Decor Selection',
        'Lighting Design',
        'Customized Interior Solutions',
      ],
    },
  ];

  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.set({
      title: 'Our Services | Real Estate, Construction & Interior Design | MMR Constructions',
      description: 'Explore MMR Constructions services for plot buying and selling, farmhouse deals, ready-to-move homes, construction, and interior design.',
      keywords: 'MMR Constructions services, plot buying, plot selling, farmhouse property, house construction, ready to move homes, interior design',
      canonical: '/services',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'MMR Constructions Real Estate and Construction Services',
        provider: {
          '@type': 'Organization',
          name: 'MMR Constructions & Developers Pvt. Ltd.',
          url: 'https://mmrconstructions.in',
        },
        areaServed: 'India',
        serviceType: this.services.map((service) => service.title),
      },
    });
  }
}
