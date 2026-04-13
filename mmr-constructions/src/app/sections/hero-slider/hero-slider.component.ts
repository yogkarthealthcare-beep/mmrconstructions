import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface SlideBtn { text: string; icon: string; scroll?: string; link?: string; }

@Component({ selector: 'app-hero-slider', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './hero-slider.component.html', styleUrls: ['./hero-slider.component.css'] })
export class HeroSliderComponent implements OnInit, OnDestroy {
  currentSlide = 0;
  private timer: any;

  slides: { bg:string; tagIcon:string; tagTxt:string; title:string; titleHl:string; desc:string; btn1:SlideBtn; btn2:SlideBtn; stats:{num:string;lbl:string}[]; thumb:string; thumbTitle:string; thumbSub:string }[] = [
    { bg:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80', tagIcon:'fas fa-star', tagTxt:'Premium Affordable Plots', title:'अपना सपनों का', titleHl:'प्लॉट बुक करें', desc:'Kanpur, Unnao & Lucknow में सस्ती दरों पर प्रीमियम plots। आसान EMI, बायबैक गारंटी और prime location।', btn1:{text:'Explore Plots', icon:'fas fa-map-marked-alt', scroll:'sites'}, btn2:{text:'Register Free', icon:'fas fa-user-plus', link:'/register'}, stats:[{num:'5+',lbl:'Active Sites'},{num:'500+',lbl:'Happy Customers'},{num:'2019',lbl:'Established'}], thumb:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=120&q=70', thumbTitle:'Explore Plots', thumbSub:'5 Sites Available' },
    { bg:'https://images.unsplash.com/photo-1582407947304-fd86f28320ad?w=1600&q=80', tagIcon:'fas fa-shield-alt', tagTxt:'100% Secure Investment', title:'Buyback', titleHl:'Guarantee', desc:'2 साल में buyback की गारंटी। Original price + ₹1,00,000 वापस। आपका investment 100% सुरक्षित।', btn1:{text:'Learn More', icon:'fas fa-shield-alt', scroll:'buyback'}, btn2:{text:'EMI Calculator', icon:'fas fa-calculator', scroll:'emi'}, stats:[{num:'₹1L',lbl:'Extra on Buyback'},{num:'2 Yr',lbl:'Buyback Window'},{num:'100%',lbl:'Safe Investment'}], thumb:'https://images.unsplash.com/photo-1582407947304-fd86f28320ad?w=120&q=70', thumbTitle:'Buyback Guarantee', thumbSub:'100% Secure' },
    { bg:'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80', tagIcon:'fas fa-rupee-sign', tagTxt:'Associate Commission Program', title:'12 साल तक', titleHl:'₹12,000/माह कमाएं', desc:'Associate बनें, plot बेचें और 12 साल तक monthly commission पाएं। 2000 gaj पर ₹3 lakh bonus भी।', btn1:{text:'Earn With Us', icon:'fas fa-hand-holding-usd', scroll:'earn'}, btn2:{text:'Join as Associate', icon:'fas fa-user-tie', link:'/register'}, stats:[{num:'₹600',lbl:'per 100 gaj/month'},{num:'12 Yr',lbl:'Income Duration'},{num:'₹3L',lbl:'Target Bonus'}], thumb:'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=120&q=70', thumbTitle:'Earn Commission', thumbSub:'12 Year Income' },
    { bg:'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=80', tagIcon:'fas fa-map-pin', tagTxt:'Prime Highway Locations', title:'5 Sites —', titleHl:'Highway के नजदीक', desc:'Airport, Highway, Railway Station से minutes दूर। Paved roads, Drainage, 24×7 Electricity के साथ।', btn1:{text:'View All Sites', icon:'fas fa-map', scroll:'sites'}, btn2:{text:'Our Facilities', icon:'fas fa-list-check', scroll:'facilities'}, stats:[{num:'5',lbl:'Active Sites'},{num:'3',lbl:'Cities'},{num:'50+',lbl:'Nearby Landmarks'}], thumb:'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=120&q=70', thumbTitle:'Prime Locations', thumbSub:'3 Cities' },
    { bg:'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&q=80', tagIcon:'fas fa-money-bill-wave', tagTxt:'Affordable Payment Plans', title:'₹51,000 से', titleHl:'अपना Plot शुरू करें', desc:'Minimum down payment और ₹3,000/month EMI से plot book करें। Bank finance भी available।', btn1:{text:'Calculate EMI', icon:'fas fa-calculator', scroll:'emi'}, btn2:{text:'Book a Plot', icon:'fas fa-home', link:'/register'}, stats:[{num:'₹51K',lbl:'Min Down Payment'},{num:'₹3K',lbl:'Monthly EMI'},{num:'5 Yr',lbl:'Tenure'}], thumb:'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=120&q=70', thumbTitle:'Easy EMI', thumbSub:'₹51K Down Payment' },
  ];

  ngOnInit() { this.startTimer(); }
  ngOnDestroy() { clearInterval(this.timer); }
  startTimer() { this.timer = setInterval(() => this.next(), 5500); }
  resetTimer() { clearInterval(this.timer); this.startTimer(); }
  goTo(i: number) { this.currentSlide = i; this.resetTimer(); }
  prev() { this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length; this.resetTimer(); }
  next() { this.currentSlide = (this.currentSlide + 1) % this.slides.length; this.resetTimer(); }
  scrollTo(id: string) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
  padNum(n: number) { return String(n + 1).padStart(2, '0'); }
}
