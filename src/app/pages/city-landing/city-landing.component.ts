import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { SeoService } from '../../services/seo.service';

interface CityData {
  city: string;
  slug: string;
  description: string;
  highlights: string[];
  faqs: { q: string; a: string }[];
  schema: object;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonical?: string;
  tags?: string[];
}

interface PageIntent {
  key: string;
  label: string;
  h1: (city: string) => string;
  title: (city: string) => string;
  description: (city: string) => string;
  keywords: (city: string) => string;
  contentLead: (city: string) => string;
}

@Component({
  selector: 'app-city-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './city-landing.component.html',
  styleUrls: ['./city-landing.component.css']
})
export class CityLandingComponent implements OnInit {
  cityData!: CityData;
  pageIntent!: PageIntent;

  readonly unnaoAreas = [
    { area: 'Unnao City', profile: 'Central residential and mixed-use demand', rate: 'Varies by road, colony and plot size' },
    { area: 'Shuklaganj', profile: 'Kanpur-connected residential market', rate: 'Generally higher near developed corridors' },
    { area: 'Gangaghat', profile: 'Residential and commercial opportunity', rate: 'Depends on access and approved development' },
    { area: 'Safipur', profile: 'Budget plots and agricultural land', rate: 'Usually location and frontage dependent' },
    { area: 'Bangarmau', profile: 'Local housing, shops and land investment', rate: 'Confirm current locality-wise quotation' },
    { area: 'PD Nagar', profile: 'Established urban residential demand', rate: 'Premium varies by street and construction' },
    { area: 'Civil Lines', profile: 'Central housing and commercial demand', rate: 'Typically influenced by central location' },
  ];

  readonly unnaoInternalLinks = [
    { label: 'Plots in Unnao', route: '/plots-in-unnao' },
    { label: 'Residential Plots in Unnao', route: '/residential-plots-unnao' },
    { label: 'Property in Unnao, Uttar Pradesh', route: '/property-in-unnao-uttar-pradesh' },
    { label: 'Buy Property in Unnao', route: '/buy-property-in-unnao' },
    { label: 'Property Rates in Unnao', route: '/property-rate-in-unnao' },
    { label: 'Property in Shuklaganj Unnao', route: '/property-in-shuklaganj-unnao' },
  ];

  readonly googleBusinessProfile = {
    title: 'Property Dealer in Unnao – MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED',
    description: 'MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED helps buyers explore residential plots, commercial plots, houses and land in Unnao, Uttar Pradesh. We assist with local site visits, current availability, payment guidance and property documentation across Unnao City, Shuklaganj, Gangaghat, Safipur, Bangarmau, PD Nagar and Civil Lines. Call 9511119879 to discuss your property requirement.',
    services: ['Residential plots', 'Commercial plots', 'Land investment', 'House enquiries', 'Site visits', 'Property documentation guidance'],
  };

  private cities: Record<string, CityData> = {
    barabanki: {
      city: 'Barabanki', slug: 'barabanki',
      description: 'MMR Constructions Private Limited helps buyers compare plots, land and real estate investment opportunities around Barabanki and nearby Uttar Pradesh growth corridors.',
      highlights: ['Residential plot guidance', 'Commercial land enquiries', 'Investment consultation', 'Site visit coordination', 'Documentation support', 'Uttar Pradesh market knowledge'],
      faqs: [
        { q: 'Can MMR help with property in Barabanki?', a: 'Yes. The team can guide buyers for plots, land and investment consultation based on current availability and budget.' },
        { q: 'Is Barabanki suitable for plot investment?', a: 'Barabanki can be considered for long-term property investment when title, access road, location and development scope are verified.' }
      ],
      schema: { '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'MMR Constructions - Barabanki', areaServed: 'Barabanki' }
    },
    raebareli: {
      city: 'Raebareli', slug: 'raebareli',
      description: 'Explore property consultation for plots, houses and land around Raebareli with MMR Constructions Private Limited.',
      highlights: ['Plot buying support', 'House enquiry assistance', 'Land investment guidance', 'Local market comparison', 'Site visit support', 'Transparent documentation guidance'],
      faqs: [
        { q: 'Does MMR provide property dealer services in Raebareli?', a: 'MMR assists buyers with property enquiries, site visits and consultation for Raebareli and nearby areas.' },
        { q: 'How do I compare land for sale in Raebareli?', a: 'Check title, road access, land use, locality demand, payment terms and current market rates before booking.' }
      ],
      schema: { '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'MMR Constructions - Raebareli', areaServed: 'Raebareli' }
    },
    achalganj: {
      city: 'Achalganj', slug: 'achalganj',
      description: 'Find residential plot, land and local property guidance in Achalganj, Unnao with MMR Constructions Private Limited.',
      highlights: ['Achalganj local guidance', 'Residential plot enquiries', 'Land development consultation', 'Budget property options', 'Site visit coordination', 'Documentation assistance'],
      faqs: [
        { q: 'Is Achalganj good for residential plots?', a: 'Achalganj can be suitable for buyers seeking budget-focused plots near Unnao, subject to current inventory and document verification.' },
        { q: 'Can I schedule a site visit in Achalganj?', a: 'Yes. Contact MMR Constructions for current availability and site visit support.' }
      ],
      schema: { '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'MMR Constructions - Achalganj', areaServed: 'Achalganj' }
    },
    lucknow: {
      city: 'Lucknow', slug: 'lucknow',
      description: 'Explore affordable residential plots in Lucknow with highway connectivity, transparent guidance and flexible payment options.',
      highlights: ['Highway-connected locations', 'Flexible payment options', 'Registered projects', 'Site visit support', 'Transparent pricing', 'Customer assistance'],
      faqs: [
        { q: 'Where are plots available near Lucknow?', a: 'Availability changes by project. Contact the team for current highway-connected locations and site visits.' },
        { q: 'Are payment plans available?', a: 'Payment options depend on the selected plot and current project configuration.' }
      ],
      schema: { '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'MMR Constructions – Lucknow', areaServed: 'Lucknow' }
    },
    kanpur: {
      city: 'Kanpur', slug: 'kanpur',
      description: 'Explore residential plot opportunities around Kanpur with local site visits, documentation guidance and flexible payment options.',
      highlights: ['Kanpur corridor locations', 'Site visit assistance', 'Flexible payments', 'Registered projects', 'Local guidance', 'Customer support'],
      faqs: [
        { q: 'Are residential plots available near Kanpur?', a: 'Yes, subject to current project inventory. Contact the team for available plot sizes and locations.' },
        { q: 'Can I schedule a site visit?', a: 'Yes. Contact the property team to arrange a suitable visit.' }
      ],
      schema: { '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: 'MMR Constructions – Kanpur', areaServed: 'Kanpur' }
    },
    unnao: {
      city: 'Unnao', slug: 'unnao',
      description: 'MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED is a local property business helping buyers explore plots, land, houses and investment opportunities across Unnao, Uttar Pradesh.',
      highlights: [
        'Local guidance for Unnao City, Shuklaganj and Gangaghat',
        'Residential and commercial plot options',
        'House and agricultural land enquiries',
        'Site visits and documentation guidance',
        'Budget-focused plot availability',
        'Call 9511119879 for current inventory'
      ],
      faqs: [
        { q: 'Who is a trusted Unnao Property Dealer?', a: 'MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED assists buyers with residential plots, commercial plots, houses, land and documentation guidance in Unnao. Call 9511119879 for current availability.' },
        { q: 'How can I find the Unnao Best Property Dealer for my budget?', a: 'Compare verified inventory, title documents, location, road access, payment schedule and after-sale support. A reliable Unnao Best Property Dealer should explain costs and documentation before booking.' },
        { q: 'Where can I get an Unnao Property Dealer Contact Number?', a: 'The MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED contact number is 9511119879 for property enquiries and site visits in Unnao.' },
        { q: 'Is a Plot in Unnao Under 5 Lakh available?', a: 'Budget inventory changes frequently. Selected developing locations may have a Plot in Unnao Under 5 Lakh, subject to plot size, location, development and current availability.' },
        { q: 'What are current Unnao Property Rates?', a: 'Unnao Property Rates vary across Unnao City, Shuklaganj, Gangaghat, Safipur, Bangarmau, PD Nagar and Civil Lines. Ask for a current location-wise quotation before deciding.' },
        { q: 'Can I find a House for Sale in Unnao through MMR?', a: 'Depending on current listings, the team can help you explore a House for Sale in Unnao along with residential plots and land options.' },
        { q: 'Is Land for Sale in Unnao suitable for investment?', a: 'Land for Sale in Unnao may suit long-term investors when title, land use, access road, surrounding development and resale demand are carefully checked.' },
        { q: 'Should I use Magicbricks Unnao or contact a local dealer?', a: 'Magicbricks Unnao and other portals can support initial research. Local Unnao Property Brokers can additionally arrange site visits and explain ground-level details and documentation.' }
      ],
      schema: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': ['Organization', 'RealEstateAgent'],
            '@id': 'https://mmrconstructions.in/#unnao-property-dealer',
            name: 'MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED',
            url: 'https://mmrconstructions.in/property-dealer-in-unnao',
            telephone: '+91-9511119879',
            image: 'https://mmrconstructions.in/assets/mmr-og-image.jpg',
            logo: 'https://mmrconstructions.in/assets/favicon-512x512.png',
            priceRange: '₹₹',
            areaServed: ['Unnao City', 'Shuklaganj', 'Gangaghat', 'Safipur', 'Bangarmau', 'PD Nagar', 'Civil Lines'],
            address: { '@type': 'PostalAddress', addressLocality: 'Unnao', addressRegion: 'Uttar Pradesh', addressCountry: 'IN' }
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'Who is a trusted Unnao Property Dealer?', acceptedAnswer: { '@type': 'Answer', text: 'MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED assists buyers with plots, houses, land, site visits and documentation guidance in Unnao. Contact 9511119879.' } },
              { '@type': 'Question', name: 'Where can I get an Unnao Property Dealer Contact Number?', acceptedAnswer: { '@type': 'Answer', text: 'Call MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED on 9511119879 for current property availability and site visits.' } },
              { '@type': 'Question', name: 'Is a Plot in Unnao Under 5 Lakh available?', acceptedAnswer: { '@type': 'Answer', text: 'Availability depends on location, plot size and development. Contact the property team for current budget inventory.' } },
              { '@type': 'Question', name: 'What are current Unnao Property Rates?', acceptedAnswer: { '@type': 'Answer', text: 'Rates vary by locality, road width, land use, plot size and development. Request a current location-wise quotation before booking.' } }
            ]
          }
        ]
      },
      seoTitle: 'Unnao Property Dealer | MMR Construction',
      seoDescription: 'Trusted Unnao property dealer for plots, houses and land. Explore Shuklaganj, Gangaghat, Safipur and Unnao City. Call 9511119879.',
      seoKeywords: 'property in unnao, property in unnao uttar pradesh, property dealer in unnao, property in shuklaganj unnao, property dealer in unnao uttar pradesh, property rate in unnao, property in nawabganj unnao, commercial property in unnao, buy property in unnao, rent property in unnao, Unnao Property Dealer, Unnao Best Property Dealer, Unnao Top Property Dealer, Unnao Property Dealers List, Unnao Property Dealer Contact Number, House for Sale in Unnao, Land for Sale in Unnao, Plot in Unnao Under 5 Lakh, Unnao Property Rates, Unnao Property Brokers, Unnao Property, Magicbricks Unnao',
      canonical: 'https://mmrconstructions.in/property-dealer-in-unnao',
      tags: [
        'property in unnao', 'property in unnao uttar pradesh', 'property dealer in unnao',
        'property in shuklaganj unnao', 'property dealer in unnao uttar pradesh',
        'property rate in unnao', 'property in nawabganj unnao', 'commercial property in unnao',
        'buy property in unnao', 'rent property in unnao',
        'Unnao Property Dealer', 'Unnao Real Estate', 'Plots in Unnao',
        'Land for Sale in Unnao', 'House for Sale in Unnao', 'Unnao Property Rates',
        'Unnao Property Brokers', 'Shuklaganj Property', 'Gangaghat Property',
        'Safipur Property', 'Bangarmau Property', 'PD Nagar Property',
        'Civil Lines Unnao Property', 'Unnao City Plots', 'Commercial Plots Unnao',
        'Residential Plots Unnao', 'Agricultural Land Unnao',
        'Plot Under 5 Lakh Unnao', 'Unnao Property Investment'
      ]
    }
  };

  private intents: Record<string, PageIntent> = {
    property: {
      key: 'property',
      label: 'Property',
      h1: city => `Property Dealer in ${city} for Plots, Land & Houses`,
      title: city => `Property Dealer in ${city} | MMR Constructions Private Limited`,
      description: city => `MMR Constructions Private Limited is a real estate company and property dealer in ${city} for residential plots, commercial plots, land, houses and investment consultation.`,
      keywords: city => `Property Dealer in ${city}, Real Estate Company in ${city}, Real Estate Agent in ${city}, Property for Sale in ${city}, Land for Sale in ${city}, MMR Constructions Private Limited`,
      contentLead: city => `If you are searching for a reliable Property Dealer in ${city}, MMR Constructions Private Limited supports residential plot buying and selling, commercial plot enquiries, house buying and selling, land development, plotting and real estate brokerage services.`
    },
    plot: {
      key: 'plot',
      label: 'Plot for Sale',
      h1: city => `Plot for Sale in ${city} - Residential & Commercial Plots`,
      title: city => `Plot for Sale in ${city} | Residential Plots | MMR Constructions`,
      description: city => `Explore plot for sale in ${city} with MMR Constructions Private Limited. Get help for residential plots, commercial plots, land for sale and site visits.`,
      keywords: city => `Plot for Sale in ${city}, Residential Plot in ${city}, Commercial Plot in ${city}, Land for Sale in ${city}, Property for Sale in ${city}`,
      contentLead: city => `MMR Constructions Private Limited helps buyers compare plot for sale in ${city} by location, road access, plot size, payment plan, registry status and long-term investment suitability.`
    },
    house: {
      key: 'house',
      label: 'House for Sale',
      h1: city => `House for Sale in ${city} with Property Consultation`,
      title: city => `House for Sale in ${city} | Property Dealer | MMR Constructions`,
      description: city => `Find house for sale in ${city}, property for sale and real estate consultation with MMR Constructions Private Limited.`,
      keywords: city => `House for Sale in ${city}, Property for Sale in ${city}, Property Dealer in ${city}, Real Estate Agent in ${city}`,
      contentLead: city => `For house for sale in ${city}, buyers should compare location, construction condition, registry documents, nearby facilities, resale demand and total cost before final decision.`
    },
    residential: {
      key: 'residential',
      label: 'Residential Plot',
      h1: city => `Residential Plot in ${city} for Home Buyers`,
      title: city => `Residential Plot in ${city} | MMR Constructions Private Limited`,
      description: city => `Explore residential plot in ${city} with site visit support, transparent guidance and real estate consultation from MMR Constructions Private Limited.`,
      keywords: city => `Residential Plot in ${city}, Plot for Sale in ${city}, Property Dealer in ${city}, Land for Sale in ${city}`,
      contentLead: city => `Residential plot buyers in ${city} should evaluate family needs, connectivity, future development, documentation and payment comfort before choosing a plot.`
    },
    rate: {
      key: 'rate',
      label: 'Property Rate',
      h1: city => `Property Rate in ${city} - Local Real Estate Guidance`,
      title: city => `Property Rate in ${city} | Plot & Land Price Guidance`,
      description: city => `Understand property rate in ${city}, plot price factors, locality comparison and land investment guidance with MMR Constructions Private Limited.`,
      keywords: city => `Property Rate in ${city}, Plot Rate in ${city}, Land Rate in ${city}, Property Dealer in ${city}`,
      contentLead: city => `Property rates in ${city} vary by road width, land use, registry status, market access, frontage, plot size and surrounding development. Always verify current quotations before payment.`
    }
  };

  constructor(private route: ActivatedRoute, private seo: SeoService) {}

  get isUnnao() { return this.cityData?.slug === 'unnao'; }

  ngOnInit() {
    const slug = this.route.snapshot.data['city'] as string;
    const type = (this.route.snapshot.data['type'] as string) || 'property';
    this.cityData = this.cities[slug];
    if (!this.cityData) return;
    this.pageIntent = this.intents[type] || this.intents['property'];
    const city = this.cityData.city;
    const schema = this.isUnnao
      ? {
          ...(this.cityData.schema as any),
          '@graph': (this.cityData.schema as any)['@graph'].map((item: any) =>
            item['@type'] === 'FAQPage'
              ? {
                  ...item,
                  mainEntity: this.cityData.faqs.map(faq => ({
                    '@type': 'Question',
                    name: faq.q,
                    acceptedAnswer: { '@type': 'Answer', text: faq.a },
                  })),
                }
              : item
          ),
        }
      : this.cityData.schema;
    this.seo.set({
      title: this.isUnnao && type === 'property' ? (this.cityData.seoTitle || this.pageIntent.title(city)) : this.pageIntent.title(city),
      description: this.isUnnao && type === 'property' ? (this.cityData.seoDescription || this.pageIntent.description(city)) : this.pageIntent.description(city),
      keywords: this.isUnnao && type === 'property' ? (this.cityData.seoKeywords || this.pageIntent.keywords(city)) : this.pageIntent.keywords(city),
      canonical: `https://mmrconstructions.in${this.route.snapshot.routeConfig?.path ? '/' + this.route.snapshot.routeConfig.path : '/property-in-' + slug}`,
      schema: this.localSchema(schema, city, slug, type),
    });
    this.seo.setBreadcrumb([
      { name: 'Home', url: '/' },
      { name: this.pageIntent.h1(city), url: `/${this.route.snapshot.routeConfig?.path || `property-in-${slug}`}` }
    ]);
  }

  private localSchema(existingSchema: any, city: string, slug: string, type: string) {
    const pageUrl = `https://mmrconstructions.in/${this.route.snapshot.routeConfig?.path || `property-in-${slug}`}`;
    const localBusiness = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['Organization', 'LocalBusiness', 'RealEstateAgent'],
          '@id': 'https://mmrconstructions.in/#organization',
          name: 'MMR Constructions Private Limited',
          alternateName: ['MMR Constructions', 'MMRCONSTRUCTION AND DEVELOPERS PRIVATE LIMITED'],
          url: 'https://mmrconstructions.in/',
          telephone: '+91-9511119879',
          image: 'https://mmrconstructions.in/assets/mmr-og-image.jpg',
          logo: 'https://mmrconstructions.in/assets/favicon-512x512.png',
          priceRange: 'INR',
          address: { '@type': 'PostalAddress', addressLocality: 'Unnao', addressRegion: 'Uttar Pradesh', addressCountry: 'IN' },
          areaServed: ['Unnao', 'Kanpur', 'Lucknow', 'Barabanki', 'Raebareli', 'Achalganj', 'Uttar Pradesh'],
          knowsAbout: ['Residential Plot Buying & Selling', 'Commercial Plot Buying & Selling', 'House Buying & Selling', 'Property Investment Consultation', 'Land Development & Plotting', 'Real Estate Brokerage Services'],
        },
        {
          '@type': 'WebPage',
          '@id': `${pageUrl}#webpage`,
          url: pageUrl,
          name: this.pageIntent.title(city),
          description: this.pageIntent.description(city),
          about: { '@id': 'https://mmrconstructions.in/#organization' },
          primaryImageOfPage: 'https://mmrconstructions.in/assets/mmr-og-image.jpg',
        },
        {
          '@type': 'Service',
          name: this.pageIntent.label + ' in ' + city,
          provider: { '@id': 'https://mmrconstructions.in/#organization' },
          areaServed: city,
          serviceType: type,
        },
        {
          '@type': 'FAQPage',
          mainEntity: this.cityData.faqs.map(faq => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
          })),
        }
      ]
    };
    return localBusiness;
  }
}
