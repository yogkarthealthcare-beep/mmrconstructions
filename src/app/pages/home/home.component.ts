import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink, TopbarComponent, NavbarComponent, FooterComponent,
    HeroSliderComponent, SitesComponent, InvestorsComponent, EmiCalculatorComponent, BuybackComponent, EarnComponent, ContactComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
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
  }
}
