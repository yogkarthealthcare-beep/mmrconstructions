import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './investor-dashboard.component.html',
  styleUrls: ['./investor-dashboard.component.css']
})
export class InvestorDashboardComponent implements OnInit {
  loading = true;
  errorMessage = '';
  dashboardData: any = null;
  copiedLink = false;

  get referralCode() {
    return this.dashboardData?.investor?.referral_code || this.dashboardData?.investor?.invitation_code || this.dashboardData?.investor?.member_id || '';
  }

  get referralLink() {
    const code = this.referralCode;
    return code ? `https://mmrconstructions.in/register?ref=${code}` : 'https://mmrconstructions.in/register';
  }

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.errorMessage = '';

    this.api.getInvestorDashboard().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.dashboardData = res.data;
        } else {
          this.errorMessage = res.message || 'Unable to load dashboard data.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to fetch dashboard data.';
      }
    });
  }

  copyReferralLink() {
    navigator.clipboard.writeText(this.referralLink);
    this.copiedLink = true;
    setTimeout(() => this.copiedLink = false, 2500);
  }

  shareOnWhatsapp() {
    const text = encodeURIComponent(`MMR Constructions में Invest / Plot Registration के लिए मेरा Referral Link: ${this.referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success-subtle text-success border-success';
      case 'rejected': return 'bg-danger-subtle text-danger border-danger';
      default: return 'bg-warning-subtle text-warning border-warning';
    }
  }
}
