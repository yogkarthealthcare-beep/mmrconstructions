import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-emi-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emi-calculator.component.html',
  styleUrls: ['./emi-calculator.component.css']
})
export class EmiCalculatorComponent implements OnInit {
  // Input models as string (text inputs)
  loanAmount: string = '300000';
  tenureMonths: string = '60';
  annualInterestRate: number = 0; // 0% standard installment

  // Calculated values
  monthlyEmi: number = 5000;
  totalPayable: number = 300000;
  fileCharge: string = '₹499';

  ngOnInit(): void {
    this.calculateEmi();
  }

  parseNumeric(val: any): number {
    if (val === null || val === undefined) return 0;
    const clean = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  calculateEmi(): void {
    const P = Math.max(0, this.parseNumeric(this.loanAmount));
    const N = Math.max(1, Math.round(this.parseNumeric(this.tenureMonths) || 1));
    const annualRate = Math.max(0, Number(this.annualInterestRate) || 0);

    if (P <= 0) {
      this.monthlyEmi = 0;
      this.totalPayable = 0;
      return;
    }

    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate > 0) {
      // Standard Reducing Balance EMI Formula: EMI = [P × R × (1 + R)^N] / [(1 + R)^N − 1]
      const factor = Math.pow(1 + monthlyRate, N);
      this.monthlyEmi = Math.round((P * monthlyRate * factor) / (factor - 1));
      this.totalPayable = Math.round(this.monthlyEmi * N);
    } else {
      // Direct installment calculation (0% interest)
      this.monthlyEmi = Math.round(P / N);
      this.totalPayable = P;
    }
  }

  get formattedLoanAmount(): string {
    const p = Math.max(0, this.parseNumeric(this.loanAmount));
    return '₹' + p.toLocaleString('en-IN');
  }

  get formattedMonthlyEmi(): string {
    return '₹' + (this.monthlyEmi || 0).toLocaleString('en-IN');
  }

  get formattedTotalPayable(): string {
    return '₹' + (this.totalPayable || 0).toLocaleString('en-IN');
  }

  get formattedTenure(): string {
    const n = Math.max(1, Math.round(this.parseNumeric(this.tenureMonths) || 1));
    return `${n} months`;
  }
}
