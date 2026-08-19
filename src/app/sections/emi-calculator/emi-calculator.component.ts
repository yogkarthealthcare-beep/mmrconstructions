import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

export interface EmiPlan {
  id?: number;
  plot_size: string;
  dp: string;
  emi: string;
  total: string;
  tenure: string;
  fileCharge?: string;
}

@Component({
  selector: 'app-emi-calculator',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './emi-calculator.component.html',
  styleUrls: ['./emi-calculator.component.css']
})
export class EmiCalculatorComponent implements OnInit {
  loading = true;
  plansList: EmiPlan[] = [];
  selectedPlanIndex = 0;

  // Fallback plans in case backend has no EMI plans yet
  fallbackPlans: EmiPlan[] = [
    { plot_size: '100 Gaj', dp: '₹1,00,000', emi: '₹6,000', total: '₹4,60,000', tenure: '60 months', fileCharge: '₹499' },
    { plot_size: '50 Gaj',  dp: '₹51,000',   emi: '₹3,000', total: '₹2,31,000', tenure: '60 months', fileCharge: '₹499' }
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.fetchEmiPlans();
  }

  fetchEmiPlans() {
    this.loading = true;
    this.api.getEmiCalculatorPlans().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (Array.isArray(data) && data.length > 0) {
          this.plansList = data.map((item: any) => this.formatPlan(item));
        } else {
          this.plansList = this.fallbackPlans;
        }
        this.loading = false;
      },
      error: () => {
        this.plansList = this.fallbackPlans;
        this.loading = false;
      }
    });
  }

  selectPlan(index: number) {
    this.selectedPlanIndex = index;
  }

  get activePlan(): EmiPlan {
    if (this.plansList && this.plansList.length > this.selectedPlanIndex) {
      return this.plansList[this.selectedPlanIndex];
    }
    return this.fallbackPlans[0];
  }

  private formatPlan(item: any): EmiPlan {
    const formatCurrency = (val: any) => {
      const num = Number(val) || 0;
      return '₹' + num.toLocaleString('en-IN');
    };

    const rawSize = item.plot_size || (item.size ? `${item.size} Gaj` : 'Plot Plan');
    const sizeStr = String(rawSize).toLowerCase().includes('gaj') ? String(rawSize) : `${rawSize} Gaj`;

    const dp = item.down_payment ? formatCurrency(item.down_payment) : (item.dp || '₹0');
    const emi = item.monthly_emi ? formatCurrency(item.monthly_emi) : (item.emi || '₹0');
    const total = item.plot_price ? formatCurrency(item.plot_price) : (item.total || '₹0');
    const tenure = item.tenure_months ? `${item.tenure_months} months` : (item.tenure || '60 months');
    const fileCharge = item.processing_fee ? formatCurrency(item.processing_fee) : '₹499';

    return {
      id: item.id,
      plot_size: sizeStr,
      dp,
      emi,
      total,
      tenure,
      fileCharge
    };
  }
}
