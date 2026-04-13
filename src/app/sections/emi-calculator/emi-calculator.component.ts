import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-emi-calculator', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './emi-calculator.component.html' })
export class EmiCalculatorComponent {
  selectedSize = 100;
  plans: any = {
    100: { dp: '₹1,00,000', emi: '₹6,000', total: '₹4,60,000', tenure: '60 months' },
    50:  { dp: '₹51,000',   emi: '₹3,000', total: '₹2,31,000', tenure: '60 months' }
  };
  get plan() { return this.plans[this.selectedSize]; }
}
