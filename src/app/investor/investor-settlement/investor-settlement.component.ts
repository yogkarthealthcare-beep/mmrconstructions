import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-settlement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-settlement.component.html',
  styleUrls: ['./investor-settlement.component.css']
})
export class InvestorSettlementComponent implements OnInit {
  preference: any;
  requests: any[] = [];
  frequency = 'monthly';
  requested_frequency = 'monthly';
  reason = '';
  loading = true;
  saving = false;
  message = '';
  error = '';

  options = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'half_yearly', label: 'Half-Yearly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.getInvestorSettlementPreference().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.preference = res.data?.preference;
        this.requests = res.data?.requests || [];
        this.requested_frequency = this.preference?.frequency || 'monthly';
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to load settlement settings.';
      }
    });
  }

  saveFirstChoice() {
    this.saving = true;
    this.clearMessages();
    this.api.setInvestorSettlementPreference(this.frequency).subscribe({
      next: (res: any) => {
        this.saving = false;
        res.success ? (this.message = res.message || 'Saved.', this.load()) : this.error = res.message;
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err.error?.message || 'Save failed.';
      }
    });
  }

  requestChange() {
    this.saving = true;
    this.clearMessages();
    this.api.requestInvestorSettlementChange({ requested_frequency: this.requested_frequency, reason: this.reason }).subscribe({
      next: (res: any) => {
        this.saving = false;
        res.success ? (this.message = res.message || 'Request submitted.', this.reason = '', this.load()) : this.error = res.message;
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err.error?.message || 'Request failed.';
      }
    });
  }

  clearMessages() {
    this.message = '';
    this.error = '';
  }
}
