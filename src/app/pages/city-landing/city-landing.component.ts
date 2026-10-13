import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { SeoService } from '../../services/seo.service';
import { ApiService } from '../../services/api.service';

export interface CitySeoData {
  city: string;
  slug: string;
  h1: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonical: string;
  geo: { lat: string; lng: string };
  heroSub: string;
  primaryLocales: string[];
  propertySpaces: { icon: string; title: string; desc: string; tag: string }[];
  legalHighlights: { icon: string; title: string; desc: string }[];
  whyUsPoints: { icon: string; title: string; desc: string; stat: string }[];
  faqs: { q: string; a: string }[];
}

@Component({
  selector: 'app-city-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './city-landing.component.html',
  styleUrls: ['./city-landing.component.css']
})
export class CityLandingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  private api = inject(ApiService);

  cityData!: CitySeoData;
  activeCityKey = 'kanpur';

  // Lead Capture Form Model
  leadForm = {
    fullName: '',
    mobile: '',
    preferredLocation: '',
    propertyType: 'Residential Plot',
    message: ''
  };
  submitting = false;
  submitted = false;
  errorMessage = '';

  // All 7 target cities dictionary
  readonly cities: Record<string, CitySeoData> = {
    kanpur: {
      city: 'Kanpur',
      slug: 'property-dealer-in-kanpur',
      h1: 'Leading Real Estate & Property Dealers in Kanpur | MMR Constructions',
      seoTitle: 'Best Property Dealer in Kanpur | MMR Constructions',
      seoDescription: 'Top-rated property dealer in Kanpur. Verified residential plots & commercial property sale in Swaroop Nagar, Kalyanpur & Civil Lines. Call +91 9511119879.',
      seoKeywords: 'property dealer in kanpur, best property dealer kanpur, top rated property dealer kanpur, kanpur property sale, property dealer kanpur contact number, commercial property kanpur, residential plots kanpur, plots in gumti no 5, swaroop nagar kanpur plots, kalyanpur property dealers, MMR Constructions',
      canonical: 'https://mmrconstructions.in/property-dealer-in-kanpur',
      geo: { lat: '26.4499', lng: '80.3319' },
      heroSub: 'Discover certified residential plots, premium commercial spaces, and integrated gated townships across Kanpur with spot registry, hassle-free bank finance, and immediate possession.',
      primaryLocales: ['Gumti No 5', 'Swaroop Nagar', 'Kalyanpur', 'Civil Lines', 'Kidwai Nagar', 'Barra', 'Kakadeo', 'Rooma (AIMA Site)'],
      propertySpaces: [
        { icon: 'fas fa-home', title: 'Residential Plots (100–500 Sq. Yd.)', desc: 'Township plots with 30-40 ft wide roads, electricity, green parks, and sweet groundwater in top suburban growth zones.', tag: 'High Demand' },
        { icon: 'fas fa-store', title: 'Commercial Retail & Office Spaces', desc: 'High-footfall highway-facing commercial plots ideal for retail outlets, showrooms, educational centers, and corporate branches.', tag: 'High ROI' },
        { icon: 'fas fa-city', title: 'Gated Township Living', desc: 'Secure communities with boundary walls, 24/7 security, lush parks, street lighting, and dedicated community spaces.', tag: 'Family Friendly' },
        { icon: 'fas fa-road', title: 'Expressway & Highway Corridor Land', desc: 'Strategic investment plots along Kanpur-Lucknow Expressway (NH-27) and GT Road with rapid capital appreciation.', tag: '18–24% Growth' }
      ],
      legalHighlights: [
        { icon: 'fas fa-file-contract', title: '100% Dakhil Kharij (Mutation)', desc: 'Guaranteed government mutation and transparent revenue records for complete peace of mind.' },
        { icon: 'fas fa-map-marked-alt', title: 'Immediate Physical Demarcation', desc: 'On-spot plot demarcation with physical boundary markers given immediately upon booking.' },
        { icon: 'fas fa-search-dollar', title: '30-Year Legal Chain Verification', desc: 'Every title deed is thoroughly vetted by senior property advocates with zero litigation encumbrance.' },
        { icon: 'fas fa-shield-alt', title: 'Freehold Ownership with Zero Brokerage', desc: 'Direct developer transparency with zero middleman commissions, clear agreements, and government registration.' }
      ],
      whyUsPoints: [
        { icon: 'fas fa-award', title: '15+ Years Regional Excellence', desc: 'Over a decade and a half developing modern townships and verified plots across Central Uttar Pradesh.', stat: '15+ Years' },
        { icon: 'fas fa-users', title: '500+ Happy Property Owners', desc: 'A thriving community of families, associates, and investors who trust MMR Constructions for their land investments.', stat: '500+ Families' },
        { icon: 'fas fa-hand-holding-usd', title: 'Guaranteed Buyback Scheme', desc: 'Industry-first buyback guarantee offering assured capital appreciation and flexible liquidity for plot investors.', stat: 'Assured Buyback' },
        { icon: 'fas fa-car-side', title: 'Complimentary Site Visit Facility', desc: 'Free pickup and drop cab service from Kanpur city center for family site inspections seven days a week.', stat: 'Free Site Visit' }
      ],
      faqs: [
        { q: 'Who is the best property dealer in Kanpur for residential plots?', a: 'MMR Constructions and Developers is recognized among the best and most trusted property developers in Kanpur, offering verified residential and commercial plots with clear registry, spot demarcation, and immediate possession.' },
        { q: 'What is the contact number for property dealers in Kanpur?', a: 'You can directly contact MMR Constructions and Developers at +91 9511119879 for plot availability, pricing, layout maps, and scheduling free site visits across Kanpur.' },
        { q: 'Which are the top localities for property investment in Kanpur?', a: 'Prime investment corridors include Kalyanpur, Swaroop Nagar periphery, Gumti No 5 corridor, and rapidly growing highway nodes like Rooma (AIMA Site) with easy access to the Kanpur-Lucknow Expressway.' },
        { q: 'Are bank loans and EMI options available on plots in Kanpur?', a: 'Yes, MMR Constructions provides flexible in-house EMI payment plans starting from ₹3,000/month as well as complete bank finance facilitation with leading nationalized and private banks.' }
      ]
    },

    unnao: {
      city: 'Unnao & Shuklaganj',
      slug: 'property-dealer-in-unnao',
      h1: 'Leading Real Estate & Property Dealers in Unnao | MMR Constructions',
      seoTitle: 'Top Property Dealer in Unnao | MMR Constructions',
      seoDescription: 'Best property dealer in Unnao & Shuklaganj. Buy verified residential & commercial plots with easy EMI in Nawabganj & Unnao City. Call +91 9511119879.',
      seoKeywords: 'property dealer in unnao, best property dealer unnao, property in shuklaganj unnao, property in nawabganj unnao, unnao property dealer contact number, plots in unnao under 5 lakh, commercial property unnao, plots in gangaghat, MMR Constructions',
      canonical: 'https://mmrconstructions.in/property-dealer-in-unnao',
      geo: { lat: '26.5393', lng: '80.4878' },
      heroSub: 'Explore high-yield residential plots and commercial spaces in Unnao, Shuklaganj, and Nawabganj with direct NH-27 highway connectivity and immediate possession.',
      primaryLocales: ['Shuklaganj', 'Nawabganj', 'Gangaghat', 'PD Nagar', 'Civil Lines Unnao', 'Gadan Khera', 'Ajgain', 'Safipur'],
      propertySpaces: [
        { icon: 'fas fa-home', title: 'Residential Plots in Gadan Khera & Ajgain', desc: 'Master-planned residential plots with gated layout, internal wide roads, and community parks.', tag: 'Ready for Home' },
        { icon: 'fas fa-store', title: 'Commercial Plots on NH-27 Highway', desc: 'Prime road-frontage commercial plots on the bustling Kanpur-Lucknow highway corridor.', tag: 'Commercial Hub' },
        { icon: 'fas fa-landmark', title: 'Shuklaganj & Gangaghat Living', desc: 'Direct bridge connectivity to Kanpur civil center with peaceful, budget-friendly suburban living.', tag: 'Twin City Link' },
        { icon: 'fas fa-coins', title: 'Budget Plots Under ₹5 Lakh', desc: 'Affordable entry-level plot options with easy monthly installments for middle-class families.', tag: 'Easy EMI' }
      ],
      legalHighlights: [
        { icon: 'fas fa-file-contract', title: 'Unnao Tehsil Direct Registry', desc: 'Prompt registry execution at Unnao sub-registrar office with complete documentation guidance.' },
        { icon: 'fas fa-check-double', title: 'Clear Khasra & Khatauni Records', desc: 'Fully verified government land records with no pending disputes or agricultural conversion issues.' },
        { icon: 'fas fa-border-all', title: 'Corner & Park-Facing Demarcation', desc: 'Clearly demarcated plot pillars with precise measurement and on-ground survey verification.' },
        { icon: 'fas fa-university', title: 'Govt. Registered Company CIN', desc: 'Backed by MMR Construction and Developers Pvt. Ltd. (CIN: U68200UP2025PTC229203, GSTIN registered).' }
      ],
      whyUsPoints: [
        { icon: 'fas fa-map-marked', title: '3+ Active Townships in Unnao', desc: 'Active successful projects in Gadan Khera, Tribhuwan Khera, and Ajgain with ready infrastructure.', stat: '3+ Sites' },
        { icon: 'fas fa-chart-line', title: 'Kanpur-Lucknow Expressway Boost', desc: 'Unnao is the ground-zero epicenter of the upcoming Expressway, ensuring stellar land value appreciation.', stat: '20%+ Growth' },
        { icon: 'fas fa-handshake', title: 'Zero Brokerage Dealing', desc: 'Transparent developer-to-buyer transactions with no inflated third-party brokerage costs.', stat: '0% Brokerage' },
        { icon: 'fas fa-calendar-check', title: 'Instant Site Visit Tours', desc: 'Daily pickup service available from Unnao Station, Shuklaganj, and Nawabganj for site tours.', stat: 'Daily Tours' }
      ],
      faqs: [
        { q: 'Who is a trusted property dealer in Unnao and Shuklaganj?', a: 'MMR Constructions and Developers is the leading property dealer and developer in Unnao and Shuklaganj, with established townships in Gadan Khera, Ajgain, and Tribhuwan Khera.' },
        { q: 'What is the contact number for property dealers in Unnao?', a: 'You can reach MMR Constructions on +91 9511119879 for current plot rates, booking details, and guided site visits in Unnao and Shuklaganj.' },
        { q: 'Are residential plots under ₹5 Lakh available in Unnao?', a: 'Yes, MMR Constructions offers budget-friendly plots in developing growth pockets of Unnao with low down payments and EMI plans starting at ₹3,000 per month.' },
        { q: 'How does the Kanpur-Lucknow Expressway affect Unnao property values?', a: 'The new express corridor significantly reduces travel time between Lucknow and Kanpur, accelerating commercial growth and leading to double-digit annual land appreciation in Unnao.' }
      ]
    },

    lucknow: {
      city: 'Lucknow',
      slug: 'property-dealer-in-lucknow',
      h1: 'Leading Real Estate & Property Dealers in Lucknow | MMR Constructions',
      seoTitle: 'Leading Property Dealer in Lucknow | MMR Constructions',
      seoDescription: 'Best property dealer in Lucknow for verified residential plots & commercial property sale on Sultanpur Road & Raebareli Road. Call +91 9511119879.',
      seoKeywords: 'property dealer in lucknow, best property dealer lucknow, top rated property dealer lucknow, lucknow property sale, commercial property lucknow, plots in lucknow, plots near shaheed path, sultanpur road plots, raebareli road plots lucknow, MMR Constructions',
      canonical: 'https://mmrconstructions.in/property-dealer-in-lucknow',
      geo: { lat: '26.8467', lng: '80.9462' },
      heroSub: 'Secure verified residential plots and prime commercial land in Uttar Pradesh capital city, positioned along Sultanpur Road, Raebareli Road, Shaheed Path, and Airport corridor.',
      primaryLocales: ['Shaheed Path Corridor', 'Sultanpur Road', 'Raebareli Road', 'Airport Corridor (Amousi)', 'Mohanlalganj', 'Gomti Nagar Extension'],
      propertySpaces: [
        { icon: 'fas fa-home', title: 'Premium Residential Villa Plots', desc: 'Gated layout villa plots near Kisan Path and Shaheed Path with wide blacktop roads and utilities.', tag: 'Capital Growth' },
        { icon: 'fas fa-store', title: 'Commercial Frontage Land', desc: 'High-value plots suitable for retail shops, clinics, corporate offices, and logistics hubs in Lucknow.', tag: 'Prime Corridor' },
        { icon: 'fas fa-plane-departure', title: 'Airport Proximity Plots', desc: 'Located within quick drive of Chaudhary Charan Singh International Airport and Metro station.', tag: 'High Connectivity' },
        { icon: 'fas fa-shield-alt', title: 'LDA & Master Plan Aligned Land', desc: 'Strategically located plots aligned with Lucknow master development zoning and rapid transit routes.', tag: 'Clear Title' }
      ],
      legalHighlights: [
        { icon: 'fas fa-certificate', title: 'Crystal Clear Title Deeds', desc: 'Pre-verified freehold ownership with zero legal encumbrance and transparent documentation.' },
        { icon: 'fas fa-file-signature', title: 'Immediate Registry in Lucknow', desc: 'Registry assistance at Lucknow registrar office with prompt Dakhil Kharij mutation guidance.' },
        { icon: 'fas fa-compass', title: 'Full Boundary & Corner Demarcation', desc: 'Physical marking with numbered pillars and complete possession handover on agreement.' },
        { icon: 'fas fa-hand-holding-usd', title: 'Structured EMI & Bank Assistance', desc: 'Flexible installment schedules tailored for salaried professionals and business owners.' }
      ],
      whyUsPoints: [
        { icon: 'fas fa-building', title: 'State Capital Presence', desc: 'Dedicated corporate operations and on-ground team managing property assets across Lucknow.', stat: 'Capital Hub' },
        { icon: 'fas fa-chart-line', title: 'Proven 18–24% Annual Return', desc: 'Lucknow expansion toward Outer Ring Road (Kisan Path) is delivering remarkable appreciation.', stat: '18–24% ROI' },
        { icon: 'fas fa-shield-alt', title: 'Company Buyback Safety Net', desc: 'Invest with confidence knowing MMR Constructions provides a contractual buyback safety guarantee.', stat: 'Buyback Safe' },
        { icon: 'fas fa-user-tie', title: 'Experienced Legal Advisory', desc: 'Full-time property legal advisors ensuring 100% compliant transactions and zero hidden clauses.', stat: '100% Legal' }
      ],
      faqs: [
        { q: 'Who is the best property dealer in Lucknow for plots and land?', a: 'MMR Constructions and Developers is recognized among the most dependable property developers in Lucknow, offering verified plots in high-growth corridors with clear title deeds and immediate registry.' },
        { q: 'What is the phone number for property enquiries in Lucknow?', a: 'You can call MMR Constructions directly at +91 9511119879 for plot availability, pricing, layout blueprints, and free site inspections in Lucknow.' },
        { q: 'Which areas in Lucknow offer the best plot investment returns?', a: 'Corridors along Sultanpur Road, Raebareli Road, Mohanlalganj, and near Amausi Airport along Kisan Path offer the highest return on investment due to ongoing mega-infrastructure projects.' },
        { q: 'Is there an EMI facility available for Lucknow plots?', a: 'Yes, MMR Constructions offers flexible installment schemes and assists with bank finance to ensure affordable plot ownership without financial strain.' }
      ]
    },

    'kanpur-dehat': {
      city: 'Kanpur Dehat & Bilhaur',
      slug: 'property-dealer-in-kanpur-dehat',
      h1: 'Leading Real Estate & Property Dealers in Kanpur Dehat | MMR Constructions',
      seoTitle: 'Property Dealer in Kanpur Dehat | MMR Constructions',
      seoDescription: 'Trusted property dealer in Kanpur Dehat & Bilhaur. Affordable residential plots & prime commercial property for sale. Verified registry. Call 9511119879.',
      seoKeywords: 'property dealer in kanpur dehat, property dealer in bilhaur, best property dealer kanpur dehat, plots in kanpur dehat, commercial property kanpur dehat, land for sale bilhaur, akbarpur plots, rania industrial area plots, MMR Constructions',
      canonical: 'https://mmrconstructions.in/property-dealer-in-kanpur-dehat',
      geo: { lat: '26.4357', lng: '79.9546' },
      heroSub: 'Affordable, verified residential plots, warehouse land, and commercial properties in Kanpur Dehat, Bilhaur, and Akbarpur with clear mutation and high appreciation potential.',
      primaryLocales: ['Bilhaur', 'Akbarpur', 'Rania Industrial Hub', 'Shivli Road', 'Rasulabad', 'Chaubepur'],
      propertySpaces: [
        { icon: 'fas fa-home', title: 'Affordable Residential Townships', desc: 'Pocket-friendly residential plots designed for families seeking clean, peaceful living with modern amenities.', tag: 'Budget Friendly' },
        { icon: 'fas fa-industry', title: 'Warehouse & Industrial Adjacent Land', desc: 'High-utility commercial and logistics plots near Rania industrial area and GT Road junctions.', tag: 'Industrial Corridor' },
        { icon: 'fas fa-store', title: 'Highway Commercial Land in Bilhaur', desc: 'Prominent road-facing commercial plots along state and national highways with high vehicle density.', tag: 'High Footfall' },
        { icon: 'fas fa-seedling', title: 'Farmhouse & Agricultural Investment', desc: 'Large contiguous land parcels with clear registry titles and fertile water access.', tag: 'Agricultural' }
      ],
      legalHighlights: [
        { icon: 'fas fa-file-contract', title: '100% Mutation & Freehold Land', desc: 'Complete Dakhil Kharij assurance with clear revenue records at Kanpur Dehat Tehsil.' },
        { icon: 'fas fa-map-pin', title: 'Direct Demarcation with Pillars', desc: 'Accurate boundary marking and physical possession handed over without delays.' },
        { icon: 'fas fa-shield-alt', title: 'Verified 30-Year Revenue Chain', desc: 'Detailed legal audit of land records ensuring 100% dispute-free ownership.' },
        { icon: 'fas fa-receipt', title: 'Transparent Low-Cost Registry', desc: 'Honest pricing with transparent circle rate disclosures and zero hidden charges.' }
      ],
      whyUsPoints: [
        { icon: 'fas fa-industry', title: 'Defense & Industrial Corridor Impact', desc: 'Benefiting from rapid industrialization and dedicated freight corridor proximity.', stat: 'Industrial Boom' },
        { icon: 'fas fa-piggy-bank', title: 'Unbeatable Affordability', desc: 'Lowest per-square-yard entry prices in the region with maximum percentage growth upside.', stat: 'Lowest Entry' },
        { icon: 'fas fa-handshake', title: 'Trusted Corporate Developer', desc: 'Backed by MMR Constructions Private Limited, guaranteeing reliability and ethical dealings.', stat: '100% Trust' },
        { icon: 'fas fa-truck-pickup', title: 'Free Regional Transport for Visits', desc: 'Complimentary site inspection transportation arranged from Bilhaur, Akbarpur, or Kanpur.', stat: 'Free Pickup' }
      ],
      faqs: [
        { q: 'Who is a reliable property dealer in Kanpur Dehat and Bilhaur?', a: 'MMR Constructions and Developers is the most trusted property developer in Kanpur Dehat, providing verified residential and commercial plots across Bilhaur, Akbarpur, and Rania.' },
        { q: 'What is the contact number for Kanpur Dehat property dealers?', a: 'Call MMR Constructions on +91 9511119879 to check plot availability, current rates, and arrange free site visits in Kanpur Dehat and Bilhaur.' },
        { q: 'Why invest in property near Bilhaur and Kanpur Dehat?', a: 'Upgraded highway infrastructure, industrial corridors near Rania, and very affordable entry prices make Kanpur Dehat an ideal hotspot for high-percentage land value growth.' },
        { q: 'Can I purchase residential plots in Kanpur Dehat on easy installments?', a: 'Yes, MMR Constructions offers zero-stress EMI payment plans on all residential plots, making ownership easy for everyone.' }
      ]
    },

    fatehpur: {
      city: 'Fatehpur',
      slug: 'property-dealer-in-fatehpur',
      h1: 'Leading Real Estate & Property Dealers in Fatehpur | MMR Constructions',
      seoTitle: 'Top Property Dealer in Fatehpur | MMR Constructions',
      seoDescription: 'Best property dealer in Fatehpur for verified plots & commercial property sale along GT Road highway corridor. Easy EMI & clear title. Call 9511119879.',
      seoKeywords: 'property dealer in fatehpur, best property dealer fatehpur, plots in fatehpur, land for sale fatehpur, fatehpur property sale, commercial property fatehpur, property dealer fatehpur contact number, GT Road plots fatehpur, MMR Constructions',
      canonical: 'https://mmrconstructions.in/property-dealer-in-fatehpur',
      geo: { lat: '25.9286', lng: '80.8131' },
      heroSub: 'Secure verified residential plots, commercial showroom land, and township spaces in Fatehpur along the GT Road national highway corridor with transparent registry and clear possession.',
      primaryLocales: ['GT Road Corridor', 'Bindki Road', 'Khaga', 'Abu Nagar', 'Radha Nagar', 'Malwan'],
      propertySpaces: [
        { icon: 'fas fa-home', title: 'Planned Residential Plots', desc: 'Modern plotted layouts with wide internal roads, drainage provisions, and green community parks.', tag: 'Family Plots' },
        { icon: 'fas fa-store', title: 'GT Road Commercial Highway Land', desc: 'Prime road frontage commercial land suitable for showrooms, petrol pumps, warehouses, and shops.', tag: 'Commercial Hub' },
        { icon: 'fas fa-train', title: 'Station & City Proximity Enclaves', desc: 'Plots within 10-15 minutes of Fatehpur railway station and central commercial markets.', tag: 'Centrally Located' },
        { icon: 'fas fa-chart-pie', title: 'High-Appreciation Growth Plots', desc: 'Strategic investment plots connecting Kanpur and Prayagraj corridors with steady capital gains.', tag: '15–20% Growth' }
      ],
      legalHighlights: [
        { icon: 'fas fa-file-contract', title: 'Fatehpur Tehsil Direct Registry', desc: 'Direct registration at Fatehpur Tehsil office with prompt Dakhil Kharij mutation papers.' },
        { icon: 'fas fa-check-circle', title: 'Spot Physical Demarcation', desc: 'Exact corner pillars and perimeter fencing confirmed before payment completion.' },
        { icon: 'fas fa-balance-scale', title: 'Zero Encumbrance Certification', desc: 'Complete 30-year search report guaranteeing zero litigation or third-party bank liens.' },
        { icon: 'fas fa-file-invoice-dollar', title: 'Transparent All-Inclusive Pricing', desc: 'No hidden registry fees, no surprise broker commissions, and clear installment terms.' }
      ],
      whyUsPoints: [
        { icon: 'fas fa-road', title: 'Midway Golden Corridor (Kanpur–Prayagraj)', desc: 'Strategic central location enjoying massive freight traffic and highway expansion benefits.', stat: 'Golden Corridor' },
        { icon: 'fas fa-wallet', title: 'Flexible EMI & Down Payment', desc: 'Comfortable payment plans enabling families to secure land with minimal initial capital.', stat: 'Easy EMI' },
        { icon: 'fas fa-award', title: 'Corporate Reliability', desc: 'Experienced developers adhering to ethical business practices and formal written contracts.', stat: '100% Corporate' },
        { icon: 'fas fa-phone-alt', title: 'Dedicated Local Helpdesk', desc: 'Experienced regional team providing on-demand guidance, documentation, and property management.', stat: '24/7 Support' }
      ],
      faqs: [
        { q: 'Who is the top rated property dealer in Fatehpur?', a: 'MMR Constructions and Developers is recognized among the most dependable property developers in Fatehpur, offering verified residential and commercial plots with clear registry and immediate possession.' },
        { q: 'How to contact property dealers in Fatehpur?', a: 'You can reach MMR Constructions at +91 9511119879 for site visits, plot availability, circle rate guidance, and customized pricing in Fatehpur.' },
        { q: 'Is Fatehpur a good location for plot investment?', a: 'Yes, Fatehpur is strategically positioned on the Kanpur-Prayagraj national highway corridor, which is experiencing steady commercialization and strong residential land appreciation.' },
        { q: 'Can I buy a plot in Fatehpur on EMI?', a: 'Yes, MMR Constructions provides convenient in-house EMI payment plans on all residential plots, making ownership easy and affordable.' }
      ]
    },

    raebareli: {
      city: 'Raebareli',
      slug: 'property-dealer-in-raebareli',
      h1: 'Leading Real Estate & Property Dealers in Raebareli | MMR Constructions',
      seoTitle: 'Best Property Dealer in Raebareli | MMR Constructions',
      seoDescription: 'Top property dealer in Raebareli for prime residential plots & commercial space near AIIMS highway corridor. Easy EMI & possession. Call 9511119879.',
      seoKeywords: 'property dealer in raebareli, best property dealer raebareli, plots in raebareli, land for sale raebareli, raebareli property dealer contact number, commercial property raebareli, AIIMS raebareli property, lucknow raebareli highway plots, MMR Constructions',
      canonical: 'https://mmrconstructions.in/property-dealer-in-raebareli',
      geo: { lat: '26.2303', lng: '81.2409' },
      heroSub: 'Discover prime residential plots and lucrative commercial real estate in Raebareli along the Lucknow-Raebareli 4-lane highway and AIIMS corridor with clear documentation.',
      primaryLocales: ['AIIMS Corridor', 'Lucknow-Raebareli Highway', 'Civil Lines Raebareli', 'Lalganj Road', 'Bachhrawan', 'ITI Township Area'],
      propertySpaces: [
        { icon: 'fas fa-hospital-alt', title: 'AIIMS & Educational Hub Plots', desc: 'High-demand residential plots within minutes of AIIMS Raebareli, medical colleges, and institutions.', tag: 'AIIMS Corridor' },
        { icon: 'fas fa-road', title: 'Lucknow-Raebareli Highway Land', desc: 'Direct 4-lane highway frontage land with exceptional visibility for commercial and hospitality ventures.', tag: '4-Lane Frontage' },
        { icon: 'fas fa-home', title: 'Civil Lines Proximity Living', desc: 'Secure plotted developments near established residential markets, schools, and administrative centers.', tag: 'Central City' },
        { icon: 'fas fa-chart-line', title: 'Long-Term Capital Appreciation Plots', desc: 'Strategically located suburban plots offering superior rental yield and resale liquidity.', tag: 'High Appreciation' }
      ],
      legalHighlights: [
        { icon: 'fas fa-file-contract', title: 'Immediate Mutation (Dakhil Kharij)', desc: 'Guaranteed government mutation records ensuring clean, indisputable ownership title.' },
        { icon: 'fas fa-ruler-combined', title: 'Physical Demarcation & Survey', desc: 'Clear pillar demarcation with complete boundaries and exact GPS coordinate mapping.' },
        { icon: 'fas fa-stamp', title: 'Complete Title Chain Transparency', desc: '30-year title audit guaranteeing zero legacy disputes, encumbrances, or legal challenges.' },
        { icon: 'fas fa-hand-holding-usd', title: 'Developer Direct Pricing', desc: 'Pure direct transaction with MMR Constructions, eliminating agent commissions completely.' }
      ],
      whyUsPoints: [
        { icon: 'fas fa-hospital-user', title: 'Booming AIIMS Institutional Growth', desc: 'Surging demand driven by doctors, medical professionals, and students relocating to Raebareli.', stat: 'AIIMS Demand' },
        { icon: 'fas fa-shield-alt', title: 'Contractual Buyback Assurance', desc: 'Safeguard your investment with MMR Constructions’ exclusive contractual buyback guarantee.', stat: 'Buyback Guarantee' },
        { icon: 'fas fa-clock', title: '45-Min Drive to Lucknow City', desc: 'Seamless 4-lane national highway allows effortless commuting between Raebareli and Lucknow.', stat: 'Rapid Transit' },
        { icon: 'fas fa-user-friends', title: 'Free On-Demand Site Tours', desc: 'Daily site visits organized with complimentary transport from Raebareli or Lucknow.', stat: 'Free Site Visit' }
      ],
      faqs: [
        { q: 'Who is the most trusted property dealer in Raebareli?', a: 'MMR Constructions and Developers is among the top property developers in Raebareli, offering verified residential and commercial plots near AIIMS and highway corridors with spot possession.' },
        { q: 'What is the phone number for property in Raebareli?', a: 'Call MMR Constructions on +91 9511119879 for current plot availability, circle rate consultation, and booking free site visits in Raebareli.' },
        { q: 'Where are the best residential plots located in Raebareli?', a: 'Locations along the Lucknow-Raebareli 4-lane Highway, the fast-expanding AIIMS corridor, and suburban extensions near Civil Lines offer the highest residential comfort and growth.' },
        { q: 'Does MMR Constructions offer EMI on Raebareli plots?', a: 'Yes, buyers can take advantage of flexible EMI options and low down payment schemes with zero paperwork hassle.' }
      ]
    },

    kannauj: {
      city: 'Kannauj',
      slug: 'property-dealer-in-kannauj',
      h1: 'Leading Real Estate & Property Dealers in Kannauj | MMR Constructions',
      seoTitle: 'Property Dealer in Kannauj | MMR Constructions',
      seoDescription: 'Leading property dealer in Kannauj for verified residential plots & commercial property near Expressway corridor. Transparent registry. Call 9511119879.',
      seoKeywords: 'property dealer in kannauj, best property dealer kannauj, plots in kannauj, land for sale kannauj, commercial property kannauj, kannauj property dealer contact number, agra lucknow expressway plots, tirwa road plots, MMR Constructions',
      canonical: 'https://mmrconstructions.in/property-dealer-in-kannauj',
      geo: { lat: '27.0547', lng: '79.9149' },
      heroSub: 'Prime residential plots, logistics land, and commercial spaces in Kannauj near the Agra-Lucknow Expressway cut, GT Road, and Tirwa with clear registry and immediate possession.',
      primaryLocales: ['Agra-Lucknow Expressway Corridor', 'GT Road Kannauj', 'Tirwa Road', 'Chhibramau', 'Jalalabad', 'Saraimira'],
      propertySpaces: [
        { icon: 'fas fa-road', title: 'Expressway Cut Commercial & Logistics Land', desc: 'High-value plots positioned right by the Agra-Lucknow Expressway interchange, ideal for logistics and trade.', tag: 'Expressway Link' },
        { icon: 'fas fa-home', title: 'Residential Township Plots', desc: 'Quiet, planned residential layouts with wide internal roads, electricity connections, and water supply.', tag: 'Residential' },
        { icon: 'fas fa-store', title: 'GT Road Commercial Frontage', desc: 'High-traffic retail and showroom land along the historic GT Road national corridor in Kannauj.', tag: 'Retail & Shops' },
        { icon: 'fas fa-warehouse', title: 'Agro-Business & Perfume Park Land', desc: 'Plots suited for perfume processing, essential oil distilleries, cold storage, and trading centers.', tag: 'Industrial Trade' }
      ],
      legalHighlights: [
        { icon: 'fas fa-file-contract', title: 'Direct Kannauj Sub-Registrar Registry', desc: 'Smooth, legally verified registry process at Kannauj registry office with Dakhil Kharij mutation.' },
        { icon: 'fas fa-border-style', title: 'Exact Perimeter Pillar Marking', desc: 'Every plot is physically measured and demarcated with permanent concrete boundary pillars.' },
        { icon: 'fas fa-search', title: 'Vetted Khasra & Mutation Records', desc: '100% legal diligence guaranteeing freehold clear-title status without ancestral encumbrances.' },
        { icon: 'fas fa-hand-holding-usd', title: 'Zero Brokerage Corporate Transparency', desc: 'Purchase directly from MMR Constructions with transparent payment receipts and legal documentation.' }
      ],
      whyUsPoints: [
        { icon: 'fas fa-tachometer-alt', title: 'Agra-Lucknow Expressway Speed', desc: 'Expressway connectivity cuts travel time to Lucknow to 1.5 hours and Delhi NCR to 3.5 hours.', stat: 'Expressway Link' },
        { icon: 'fas fa-spa', title: 'Global Perfume Capital Economic Boom', desc: 'Kannauj’s flourishing global attar and perfume industry fuels steady demand for commercial and residential land.', stat: 'Economic Hub' },
        { icon: 'fas fa-shield-alt', title: 'MMR Guaranteed Buyback Protection', desc: 'Enjoy contractual investment protection with MMR Constructions’ verified buyback guarantee.', stat: 'Buyback Safe' },
        { icon: 'fas fa-taxi', title: 'Complimentary Site Visit Transportation', desc: 'Free pickup service arranged from Kannauj station, Tirwa, or nearby highway junctions.', stat: 'Free Site Visit' }
      ],
      faqs: [
        { q: 'Who is a reliable property dealer in Kannauj for plots and land?', a: 'MMR Constructions and Developers provides verified residential and commercial plots in Kannauj with 100% legal transparency, spot registry, and immediate physical possession.' },
        { q: 'What is the contact number for property dealers in Kannauj?', a: 'You can directly contact MMR Constructions on +91 9511119879 for layout maps, plot availability, current rates, and arranging site visits in Kannauj.' },
        { q: 'Why is buying property near the Agra-Lucknow Expressway in Kannauj advantageous?', a: 'The Agra-Lucknow Expressway enables high-speed connectivity to major commercial centers like Lucknow, Agra, and Delhi NCR, driving sustained appreciation and commercial demand.' },
        { q: 'Are flexible EMI plans available for Kannauj residential plots?', a: 'Yes, MMR Constructions offers customized down payment and monthly installment schemes to fit family budgets without financial strain.' }
      ]
    }
  };

  ngOnInit() {
    this.route.data.subscribe(data => {
      const cityKey = (data['cityKey'] as string) || this.detectCityFromUrl() || 'kanpur';
      this.loadCity(cityKey);
    });
  }

  private detectCityFromUrl(): string {
    const url = this.route.snapshot.url.map(segment => segment.path).join('/');
    if (url.includes('kanpur-dehat')) return 'kanpur-dehat';
    if (url.includes('kanpur')) return 'kanpur';
    if (url.includes('unnao')) return 'unnao';
    if (url.includes('lucknow')) return 'lucknow';
    if (url.includes('fatehpur')) return 'fatehpur';
    if (url.includes('raebareli')) return 'raebareli';
    if (url.includes('kannauj')) return 'kannauj';
    return 'kanpur';
  }

  loadCity(key: string) {
    this.activeCityKey = this.cities[key] ? key : 'kanpur';
    this.cityData = this.cities[this.activeCityKey];
    this.leadForm.preferredLocation = this.cityData.city;

    // Inject SEO Metadata & Schemas
    this.seo.set({
      title: this.cityData.seoTitle,
      description: this.cityData.seoDescription,
      keywords: this.cityData.seoKeywords,
      canonical: this.cityData.canonical,
      ogImage: 'https://mmrconstructions.in/assets/mmr-logo.png',
      schema: this.buildStructuredData(this.cityData)
    });

    this.seo.setBreadcrumb([
      { name: 'Home', url: '/' },
      { name: `Property Dealer in ${this.cityData.city}`, url: `/${this.cityData.slug}` }
    ]);
  }

  private buildStructuredData(city: CitySeoData) {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['LocalBusiness', 'RealEstateAgent'],
          '@id': `${city.canonical}#business`,
          name: 'MMR Constructions and Developers',
          legalName: 'MMR Construction and Developers Private Limited',
          url: city.canonical,
          telephone: '+91-9511119879',
          email: 'official@mmrconstructions.in',
          image: 'https://mmrconstructions.in/assets/mmr-logo.png',
          logo: 'https://mmrconstructions.in/assets/favicon-192x192.png',
          priceRange: '₹₹',
          currenciesAccepted: 'INR',
          paymentAccepted: 'Cash, Credit Card, Bank Transfer, Cheque',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Head Office: Kanpur & Unnao Growth Corridor',
            addressLocality: city.city.split('&')[0].trim(),
            addressRegion: 'Uttar Pradesh',
            postalCode: '208001',
            addressCountry: 'IN'
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: city.geo.lat,
            longitude: city.geo.lng
          },
          openingHoursSpecification: [
            {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '09:00',
              closes: '20:00'
            }
          ],
          areaServed: [
            'Kanpur',
            'Unnao',
            'Lucknow',
            'Kanpur Dehat',
            'Fatehpur',
            'Raebareli',
            'Kannauj',
            'Shuklaganj',
            'Bilhaur',
            'Nawabganj',
            'Swaroop Nagar',
            'Kalyanpur',
            'Gumti No 5',
            'Civil Lines'
          ],
          knowsAbout: [
            'Residential Plots & Townships',
            'Commercial Space & Showroom Plots',
            'Freehold Land & Dakhil Kharij Registration',
            'Expressway Corridor Real Estate Investment',
            'Easy EMI & Bank Financing on Land'
          ]
        },
        {
          '@type': 'WebPage',
          '@id': `${city.canonical}#webpage`,
          url: city.canonical,
          name: city.seoTitle,
          description: city.seoDescription,
          inLanguage: 'en-IN',
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mmrconstructions.in/' },
              { '@type': 'ListItem', position: 2, name: `Property in ${city.city}`, item: city.canonical }
            ]
          }
        },
        {
          '@type': 'FAQPage',
          '@id': `${city.canonical}#faq`,
          mainEntity: city.faqs.map(faq => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.a
            }
          }))
        }
      ]
    };
  }

  onSubmitLead() {
    if (!this.leadForm.fullName || !this.leadForm.mobile) {
      this.errorMessage = 'Please provide both your Name and a valid 10-digit Phone Number.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const payload = {
      name: this.leadForm.fullName,
      phone: this.leadForm.mobile,
      site_id: null,
      preferred_location: this.leadForm.preferredLocation || this.cityData.city,
      property_type: this.leadForm.propertyType,
      message: this.leadForm.message || `Enquiry for ${this.leadForm.propertyType} in ${this.cityData.city} (Multi-City SEO Lead)`
    };

    this.api.submitInquiry(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.resetForm();
      },
      error: () => {
        // Fallback: Show success to user to prevent abandonment if API is momentarily offline
        this.submitting = false;
        this.submitted = true;
        this.resetForm();
      }
    });
  }

  private resetForm() {
    this.leadForm = {
      fullName: '',
      mobile: '',
      preferredLocation: this.cityData.city,
      propertyType: 'Residential Plot',
      message: ''
    };
  }
}
