import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeroSliderComponent } from '../../sections/hero-slider/hero-slider.component';
import { SitesComponent } from '../../sections/sites/sites.component';
import { EmiCalculatorComponent } from '../../sections/emi-calculator/emi-calculator.component';
import { BuybackComponent } from '../../sections/buyback/buyback.component';
import { EarnComponent } from '../../sections/earn/earn.component';
import { ContactComponent } from '../../sections/contact/contact.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TopbarComponent, NavbarComponent, FooterComponent,
    HeroSliderComponent, SitesComponent, EmiCalculatorComponent, BuybackComponent, EarnComponent, ContactComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  whyCards = [
    { icon: 'fas fa-shield-alt', title: 'Buyback Guarantee', desc: '2 साल में buyback। Original price + ₹1 lakh वापस। निवेश पूरी तरह सुरक्षित।' },
    { icon: 'fas fa-money-bill-wave', title: 'Easy EMI', desc: '₹51,000 down payment से शुरू। ₹3,000/month EMI। Bank finance भी available।' },
    { icon: 'fas fa-map-marked-alt', title: 'Prime Locations', desc: 'Highway, Airport, Station के नजदीक। High appreciation potential वाले plots।' },
    { icon: 'fas fa-certificate', title: 'Govt. Registered', desc: 'CIN: U68200UP2025PTC229203। Transparent paperwork। Daakhil Kharij company करती है।' },
  ];
  facilities = [
    { icon: 'fas fa-road',         title: 'Paved Roads',     desc: 'Internal paved road network सभी sites पर।' },
    { icon: 'fas fa-water',        title: 'Drainage',        desc: 'Complete paved drainage system।' },
    { icon: 'fas fa-bolt',         title: '24×7 Electricity', desc: 'Uninterrupted power supply।' },
    { icon: 'fas fa-university',   title: 'Bank Finance',    desc: 'Bank loan facility available।' },
    { icon: 'fas fa-mobile-alt',   title: 'Android App',     desc: 'Plot tracking, EMI, payments।' },
    { icon: 'fas fa-file-invoice', title: 'PDF Vouchers',    desc: 'Downloadable receipt हर payment पर।' },
  ];
}
