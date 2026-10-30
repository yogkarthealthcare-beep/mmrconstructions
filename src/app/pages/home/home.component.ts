import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeroSliderComponent } from '../../sections/hero-slider/hero-slider.component';
import { SitesComponent } from '../../sections/sites/sites.component';
import { InvestorsComponent } from '../../sections/investors/investors.component';
import { EmiCalculatorComponent } from '../../sections/emi-calculator/emi-calculator.component';
import { BuybackComponent } from '../../sections/buyback/buyback.component';
import { EarnComponent } from '../../sections/earn/earn.component';
import { ContactComponent } from '../../sections/contact/contact.component';
import { HomeAdBannerComponent } from '../../shared/components/home-ad-banner/home-ad-banner.component';
import { ApiService } from '../../services/api.service';
import { SiteToggleService } from '../../services/site-toggle.service';
import { SeoService } from '../../services/seo.service';


interface BubbleParticle {
  x: number;
  y: number;
  radius: number;
  baseVx: number;
  baseVy: number;
  repelVx: number;
  repelVy: number;
  floatAngle: number;
  floatSpeed: number;
  colorType: 'forest' | 'mint' | 'gold' | 'teal';
}

const BUBBLE_COLORS = {
  forest: {
    start: 'rgba(255, 255, 255, 0.55)',
    mid: 'rgba(6, 78, 43, 0.22)',
    end: 'rgba(6, 43, 24, 0.08)',
    border: 'rgba(6, 78, 43, 0.35)',
    sheen: 'rgba(255, 255, 255, 0.45)'
  },
  mint: {
    start: 'rgba(255, 255, 255, 0.60)',
    mid: 'rgba(52, 211, 153, 0.24)',
    end: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(52, 211, 153, 0.40)',
    sheen: 'rgba(255, 255, 255, 0.50)'
  },
  gold: {
    start: 'rgba(255, 255, 255, 0.65)',
    mid: 'rgba(245, 208, 115, 0.28)',
    end: 'rgba(201, 168, 76, 0.10)',
    border: 'rgba(229, 185, 85, 0.45)',
    sheen: 'rgba(255, 248, 220, 0.55)'
  },
  teal: {
    start: 'rgba(255, 255, 255, 0.60)',
    mid: 'rgba(45, 212, 191, 0.24)',
    end: 'rgba(13, 148, 136, 0.08)',
    border: 'rgba(45, 212, 191, 0.38)',
    sheen: 'rgba(255, 255, 255, 0.50)'
  }
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TopbarComponent, NavbarComponent, FooterComponent,
    HeroSliderComponent, SitesComponent, InvestorsComponent, EmiCalculatorComponent, BuybackComponent, EarnComponent, ContactComponent, HomeAdBannerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  // Configurable bubble physics & interaction settings
  private readonly INTERACTION_RADIUS = 160;  // Proximity radius in px where cursor repels bubbles
  private readonly REPULSION_STRENGTH = 5.8;   // Force scaling for repulsion away from cursor
  private readonly RETURN_DAMPING = 0.92;      // Smooth decay factor towards natural trajectory
  private readonly BUBBLE_COUNT = 24;          // Total floating bubbles

  @ViewChild('bubblesCanvas') set bubblesCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.bubblesCanvasRef = ref;
    this.checkAndStartBubbles();
  }
  @ViewChild('regSection') set regSection(ref: ElementRef<HTMLElement> | undefined) {
    this.regSectionRef = ref;
    this.checkAndStartBubbles();
  }

  bubblesCanvasRef?: ElementRef<HTMLCanvasElement>;
  regSectionRef?: ElementRef<HTMLElement>;

  private bubbles: BubbleParticle[] = [];
  private animFrameId: number | null = null;
  private isSectionVisible = true;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private mouseX = -9999;
  private mouseY = -9999;
  private mouseActive = false;
  private isReducedMotion = false;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private dpr = 1;

  showEnquiryModal = false;
  sites: any[] = [];
  form = {
    name: '',
    mobile: '',
    email: '',
    site_id: null as number | null,
    interest: 'Plot Booking',
    message: ''
  };
  submitting = false;
  submitted = false;
  errorMessage = '';

  showHeroSlider = true;
  sectionVisibility: Record<string, boolean> = {
    investors: true,
    information: true,
    sites: true,
    why_choose: true,
    emi_calculator: true,
    buyback: true,
    earn: true,
    facilities: true,
    cta: true,
    contact: true
  };

      registrationCards = [
    {
      role: 'Customer',
      tag: 'PLOT BUYER',
      tagIcon: 'fas fa-home',
      icon: 'fas fa-house-chimney',
      title: 'Customer',
      desc: 'Explore approved residential & commercial plots, track EMI schedules, and book plot allocations.',
      perks: [
        'Verified clear-title approved plots',
        'Easy ₹3,000/mo EMI & bank loan'
      ],
      ctaText: 'Register as Customer',
      cardClass: 'card-customer',
      badgeClass: 'badge-customer',
      iconClass: 'icon-customer',
      ctaClass: 'cta-customer',
      route: '/register/customer'
    },
    {
      role: 'Investor',
      tag: 'HIGH RETURN',
      tagIcon: 'fas fa-chart-line',
      icon: 'fas fa-coins',
      title: 'Investor',
      desc: 'Invest in prime highway & development projects with legal security and high capital growth.',
      perks: [
        'Legally binding buyback assurance',
        'High ROI & fast wallet settlements'
      ],
      ctaText: 'Register as Investor',
      cardClass: 'card-investor',
      badgeClass: 'badge-investor',
      iconClass: 'icon-investor',
      ctaClass: 'cta-investor',
      route: '/register/investor'
    },
    {
      role: 'Associate',
      tag: 'EARN & GROW',
      tagIcon: 'fas fa-handshake',
      icon: 'fas fa-user-tie',
      title: 'Associate',
      desc: 'Partner as an official sales partner to build your associate network and earn recurring commissions.',
      perks: [
        '12-year progressive commission matrix',
        'Direct bank & wallet withdrawals'
      ],
      ctaText: 'Register as Associate',
      cardClass: 'card-associate',
      badgeClass: 'badge-associate',
      iconClass: 'icon-associate',
      ctaClass: 'cta-associate',
      route: '/register/associate'
    },
    {
      role: 'Team Member',
      tag: 'SPONSORED',
      tagIcon: 'fas fa-id-badge',
      icon: 'fas fa-user-friends',
      title: 'Team Member',
      desc: 'Join an active associate team using a verified Sponsor ID with full leadership guidance.',
      perks: [
        'Instant placement under sponsor',
        'Dedicated training & marketing tools'
      ],
      ctaText: 'Register as Team Member',
      cardClass: 'card-teammember',
      badgeClass: 'badge-teammember',
      iconClass: 'icon-teammember',
      ctaClass: 'cta-teammember',
      route: '/register/team-member'
    }
  ];

    whyCards = [
    { icon: 'fas fa-award', title: 'Trusted Developer', desc: 'ग्राहकों का अटूट विश्वास। सुरक्षित रियल एस्टेट निवेश एवं 100% पारदर्शी कार्य।' },
    { icon: 'fas fa-money-bill-wave', title: 'Easy EMI', desc: '₹51,000 down payment से शुरू। ₹3,000/month EMI। Bank finance भी available।' },
    { icon: 'fas fa-map-marked-alt', title: 'Prime Locations', desc: 'Highway, Airport, Station के नजदीक। High appreciation potential वाले plots।' },
    { icon: 'fas fa-building', title: 'Registered Company', desc: 'Govt. Registered Company (CIN: U68200UP2025PTC229203 | GSTIN: 09AATCM6753A1Z5)। Transparent paperwork एवं दाखिला-खारिज।' },
  ];
  facilities = [
    { icon: 'fas fa-road',         title: 'Paved Roads',     desc: 'Internal paved road network सभी sites पर।' },
    { icon: 'fas fa-water',        title: 'Drainage',        desc: 'Complete paved drainage system।' },
    { icon: 'fas fa-bolt',         title: '24×7 Electricity', desc: 'Uninterrupted power supply।' },
    { icon: 'fas fa-university',   title: 'Bank Finance',    desc: 'Bank loan facility available।' },
    { icon: 'fas fa-mobile-alt',   title: 'Android App',     desc: 'Plot tracking, EMI, payments।' },
    { icon: 'fas fa-file-invoice', title: 'PDF Vouchers',    desc: 'Downloadable receipt हर payment पर।' },
  ];

  constructor(
    private api: ApiService, 
    private siteToggle: SiteToggleService,
    private seo: SeoService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.seo.set({
      title: 'MMR Construction & Developers — Premium Plots | Kanpur · Unnao · Lucknow',
      description: 'Buy approved residential & commercial plots in Kanpur, Unnao & Lucknow with MMR Construction. Easy EMI, Buyback Guarantee. CIN: U68200UP2025PTC229203 | GSTIN: 09AATCM6753A1Z5.',
      canonical: '/',
      keywords: 'MMR Construction, plots in kanpur, plots in unnao, plots in lucknow, real estate developers uttar pradesh, buy plot on emi',
      schema: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': ['Organization', 'RealEstateAgent'],
            '@id': 'https://mmrconstructions.in/#organization',
            name: 'M.M.R. Construction & Developers Private Limited',
            url: 'https://mmrconstructions.in',
            logo: 'https://mmrconstructions.in/assets/mmr-logo.png',
            image: 'https://mmrconstructions.in/assets/mmr-logo.png',
            description: 'Leading real estate developer offering affordable & approved residential and commercial plots in Kanpur, Unnao, and Lucknow.',
            telephone: '+919511119879',
            email: 'official@mmrconstructions.in',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Tribhuvan Kheda, Sheshpur',
              addressLocality: 'Unnao',
              addressRegion: 'Uttar Pradesh',
              postalCode: '209801',
              addressCountry: 'IN'
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: 26.5393,
              longitude: 80.4878
            },
            sameAs: [
              'https://facebook.com/mmrconstructions',
              'https://instagram.com/mmrconstructions'
            ]
          }
        ]
      }
    });
    this.api.getHomePageSettings().subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.showHeroSlider = data.show_hero_slider !== false;
        this.sectionVisibility['information'] = data.show_information_section !== false;
        if (data.section_visibility && typeof data.section_visibility === 'object') {
          this.sectionVisibility = { ...this.sectionVisibility, ...data.section_visibility };
          
          // Sync global master property tools toggle from DB
          if (data.section_visibility.master_property_tools !== undefined) {
             this.siteToggle.syncMasterPropertyPlotEnabled(data.section_visibility.master_property_tools);
          }
        }
      },
      error: () => {}
    });

    this.api.getSiteGallery('Plot').subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        if (Array.isArray(raw) && raw.length > 0) {
          this.sites = raw.map((s: any) => ({
            site_id: Number(s.id),
            site_name: s.site_name || 'Project Site',
            city: s.site_address || 'Uttar Pradesh'
          }));
        }
      },
      error: () => {}
    });

    // Show popup after a short delay (temporarily disabled sessionStorage check for testing)
    setTimeout(() => {
      this.showEnquiryModal = true;
      // if (!sessionStorage.getItem('enquiryPopupShown')) {
      //   this.showEnquiryModal = true;
      //   sessionStorage.setItem('enquiryPopupShown', 'true');
      // }
    }, 1500);
  }

  onSubmitEnquiry() {
    this.errorMessage = '';
    const name = this.form.name.trim();
    const mobile = this.form.mobile.replace(/\D/g, '');
    if (name.length < 2) {
      this.errorMessage = 'Please enter your full name.';
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      this.errorMessage = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    const selectedSite = this.sites.find(s => Number(s.site_id) === Number(this.form.site_id));
    this.submitting = true;

    this.api.submitInquiry({
      full_name: name,
      mobile_no: mobile,
      email: this.form.email || null,
      site_id: selectedSite ? selectedSite.site_id : null,
      site_name: selectedSite ? selectedSite.site_name : null,
      inquiry_message: this.form.message || null,
      inquiry_type: this.form.interest || 'General Enquiry',
      source_page: 'Home Page Popup'
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.form = { name: '', mobile: '', email: '', site_id: null, interest: 'Plot Booking', message: '' };
        setTimeout(() => this.showEnquiryModal = false, 3000); // Close after 3s on success
      },
      error: (err: any) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'Unable to submit inquiry. Please try again.';
      }
    });
  }

  closeEnquiryModal() {
    this.showEnquiryModal = false;
  }

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.isReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.checkAndStartBubbles();
  }

  ngOnDestroy() {
    this.stopAnimation();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  onSectionMouseMove(event: MouseEvent) {
    if (!this.regSectionRef) return;
    const rect = this.regSectionRef.nativeElement.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
    this.mouseActive = true;
  }

  onSectionMouseLeave() {
    this.mouseActive = false;
    this.mouseX = -9999;
    this.mouseY = -9999;
  }

  private handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.stopAnimation();
    } else if (this.isSectionVisible && !this.isReducedMotion) {
      this.startAnimation();
    }
  };

  private checkAndStartBubbles() {
    if (typeof window === 'undefined' || !this.bubblesCanvasRef || !this.regSectionRef) {
      return;
    }

    this.setupCanvasAndBubbles();

    if (typeof ResizeObserver !== 'undefined' && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.setupCanvasAndBubbles(true);
      });
      this.resizeObserver.observe(this.regSectionRef.nativeElement);
    }

    if (typeof IntersectionObserver !== 'undefined' && !this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.isSectionVisible = entry.isIntersecting;
        if (this.isSectionVisible && !this.isReducedMotion) {
          this.startAnimation();
        } else {
          this.stopAnimation();
        }
      }, { threshold: 0.05 });
      this.intersectionObserver.observe(this.regSectionRef.nativeElement);
    }

    if (this.isReducedMotion) {
      this.updateAndDraw();
    } else {
      this.startAnimation();
    }
  }

  private setupCanvasAndBubbles(isResize = false) {
    if (!this.bubblesCanvasRef || !this.regSectionRef) return;
    const canvas = this.bubblesCanvasRef.nativeElement;
    const section = this.regSectionRef.nativeElement;
    const rect = section.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    canvas.width = Math.floor(rect.width * this.dpr);
    canvas.height = Math.floor(rect.height * this.dpr);

    if (!isResize || this.bubbles.length === 0) {
      this.createBubbles(rect.width, rect.height);
    }
  }

  private createBubbles(width: number, height: number) {
    this.bubbles = [];
    const colorTypes: ('forest' | 'mint' | 'gold' | 'teal')[] = ['forest', 'mint', 'gold', 'teal'];

    for (let i = 0; i < this.BUBBLE_COUNT; i++) {
      let radius: number;
      if (i < 5) {
        radius = 42 + Math.random() * 20; // 42px - 62px (large soft orbs)
      } else if (i < 13) {
        radius = 24 + Math.random() * 16; // 24px - 40px (medium bubbles)
      } else {
        radius = 12 + Math.random() * 12; // 12px - 24px (small delicate bubbles)
      }

      const speedMultiplier = 1 / Math.sqrt(radius / 20);
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.2 + Math.random() * 0.35) * speedMultiplier;

      this.bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        baseVx: Math.cos(angle) * speed,
        baseVy: Math.sin(angle) * speed - 0.15, // gentle natural upward buoyancy
        repelVx: 0,
        repelVy: 0,
        floatAngle: Math.random() * Math.PI * 2,
        floatSpeed: 0.01 + Math.random() * 0.015,
        colorType: colorTypes[i % colorTypes.length]
      });
    }
  }

  private startAnimation() {
    if (this.animFrameId !== null) return;
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        this.updateAndDraw();
        this.animFrameId = requestAnimationFrame(loop);
      };
      this.animFrameId = requestAnimationFrame(loop);
    });
  }

  private stopAnimation() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updateAndDraw() {
    if (!this.bubblesCanvasRef) return;
    const canvas = this.bubblesCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = this.canvasWidth;
    const height = this.canvasHeight;
    if (width <= 0 || height <= 0) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];

      // Ambient sinusoidal drift
      b.floatAngle += b.floatSpeed;
      const ambientDx = b.baseVx + Math.cos(b.floatAngle) * 0.18;
      const ambientDy = b.baseVy + Math.sin(b.floatAngle) * 0.14;

      // Mouse Proximity Repulsion
      if (this.mouseActive && this.mouseX > -500) {
        const dx = b.x - this.mouseX;
        const dy = b.y - this.mouseY;
        const dist = Math.hypot(dx, dy);

        if (dist < this.INTERACTION_RADIUS && dist > 0.001) {
          const normalizedDist = dist / this.INTERACTION_RADIUS;
          const repulsionFactor = Math.pow(1 - normalizedDist, 1.8);
          const massScale = 28 / (b.radius + 10);
          const pushForce = repulsionFactor * this.REPULSION_STRENGTH * massScale;

          const nx = dx / dist;
          const ny = dy / dist;

          b.repelVx += nx * pushForce;
          b.repelVy += ny * pushForce;
        }
      }

      // Smooth inertia return / damping
      b.repelVx *= this.RETURN_DAMPING;
      b.repelVy *= this.RETURN_DAMPING;

      // Position update
      b.x += ambientDx + b.repelVx;
      b.y += ambientDy + b.repelVy;

      // Toroidal wrapping with generous margin around bounds
      const pad = b.radius + 25;
      if (b.x < -pad) b.x = width + pad;
      if (b.x > width + pad) b.x = -pad;
      if (b.y < -pad) b.y = height + pad;
      if (b.y > height + pad) b.y = -pad;

      // Draw bubble
      this.drawSingleBubble(ctx, b);
    }

    ctx.restore();
  }

  private drawSingleBubble(ctx: CanvasRenderingContext2D, b: BubbleParticle) {
    const colors = BUBBLE_COLORS[b.colorType];
    const { x, y, radius } = b;

    const focalX = x - radius * 0.32;
    const focalY = y - radius * 0.32;

    const grad = ctx.createRadialGradient(
      focalX, focalY, Math.max(1, radius * 0.08),
      x, y, radius
    );
    grad.addColorStop(0, colors.start);
    grad.addColorStop(0.35, colors.mid);
    grad.addColorStop(0.85, colors.end);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');

    ctx.save();

    // 1. Fill bubble body
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Soft iridescent border rim
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = Math.max(1, radius * 0.035);
    ctx.stroke();

    // 3. Specular highlight reflection (soft sheen on top-left)
    const sheenRadius = radius * 0.22;
    const sheenGrad = ctx.createRadialGradient(
      focalX, focalY, 0,
      focalX, focalY, sheenRadius
    );
    sheenGrad.addColorStop(0, colors.sheen);
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(focalX, focalY, sheenRadius, 0, Math.PI * 2);
    ctx.fillStyle = sheenGrad;
    ctx.fill();

    // 4. Subtle secondary bottom-right bounce reflection
    const bounceX = x + radius * 0.35;
    const bounceY = y + radius * 0.35;
    const bounceRadius = radius * 0.28;
    const bounceGrad = ctx.createRadialGradient(
      bounceX, bounceY, 0,
      bounceX, bounceY, bounceRadius
    );
    bounceGrad.addColorStop(0, colors.mid);
    bounceGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(bounceX, bounceY, bounceRadius, 0, Math.PI * 2);
    ctx.fillStyle = bounceGrad;
    ctx.fill();

    ctx.restore();
  }

}
