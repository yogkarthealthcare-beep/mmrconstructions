import { Component, OnInit } from '@angular/core';
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
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TopbarComponent, NavbarComponent, FooterComponent,
    HeroSliderComponent, SitesComponent, InvestorsComponent, EmiCalculatorComponent, BuybackComponent, EarnComponent, ContactComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  showEnquiryModal = false;
  sites: any[] = [];
  form = {
    name: '',
    mobile: '',
    email: '',
    site_id: null as number | null,
    interest: 'Plot Booking — 100 Gaj',
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

  whyCards = [
    { icon: 'fas fa-award', title: '10 Years of Trust', desc: '10 वर्षों से ग्राहकों का अटूट विश्वास। सुरक्षित रियल एस्टेट निवेश एवं 100% पारदर्शी कार्य।' },
    { icon: 'fas fa-money-bill-wave', title: 'Easy EMI', desc: '₹51,000 down payment से शुरू। ₹3,000/month EMI। Bank finance भी available।' },
    { icon: 'fas fa-map-marked-alt', title: 'Prime Locations', desc: 'Highway, Airport, Station के नजदीक। High appreciation potential वाले plots।' },
    { icon: 'fas fa-building', title: 'Registered Company', desc: 'Govt. Registered Company (CIN: U68200UP2025PTC229203)। Transparent paperwork एवं दाखिला-खारिज।' },
  ];
  facilities = [
    { icon: 'fas fa-road',         title: 'Paved Roads',     desc: 'Internal paved road network सभी sites पर।' },
    { icon: 'fas fa-water',        title: 'Drainage',        desc: 'Complete paved drainage system।' },
    { icon: 'fas fa-bolt',         title: '24×7 Electricity', desc: 'Uninterrupted power supply।' },
    { icon: 'fas fa-university',   title: 'Bank Finance',    desc: 'Bank loan facility available।' },
    { icon: 'fas fa-mobile-alt',   title: 'Android App',     desc: 'Plot tracking, EMI, payments।' },
    { icon: 'fas fa-file-invoice', title: 'PDF Vouchers',    desc: 'Downloadable receipt हर payment पर।' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getHomePageSettings().subscribe({
      next: (res: any) => {
        const data = res?.data || {};
        this.showHeroSlider = data.show_hero_slider !== false;
        this.sectionVisibility['information'] = data.show_information_section !== false;
        if (data.section_visibility && typeof data.section_visibility === 'object') {
          this.sectionVisibility = { ...this.sectionVisibility, ...data.section_visibility };
        }
      },
      error: () => {}
    });

    this.api.getSites().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        this.sites = raw.map((s: any) => ({
          site_id: Number(s.site_id || s.id),
          site_name: s.site_name || s.name || 'Project Site',
          city: s.city || 'Uttar Pradesh'
        }));
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
        this.form = { name: '', mobile: '', email: '', site_id: null, interest: 'Plot Booking — 100 Gaj', message: '' };
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
}
