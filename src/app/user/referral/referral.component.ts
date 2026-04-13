import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-referral', standalone: true, imports: [CommonModule], templateUrl: './referral.component.html' })
export class ReferralComponent implements OnInit {
  loading = true; inviteData: any = {}; network: any[] = []; copied = false;

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getInviteCode().subscribe({
      next: (res: any) => { if (res.success) this.inviteData = res.data || {}; this.loading = false; },
      error: () => { this.loading = false; }
    });
    this.api.getAssocNetwork().subscribe({
      next: (res: any) => { if (res.success) this.network = res.data || []; }
    });
  }

  get referralLink() { return `https://mmrconstructions.in/register?ref=${this.inviteData.invitation_code}`; }

  copyCode() {
    navigator.clipboard.writeText(this.inviteData.invitation_code || '');
    this.copied = true; setTimeout(() => this.copied = false, 2000);
  }
  shareWhatsApp() {
    const msg = encodeURIComponent(`MMR Constructions में plot book करें! मेरा code: ${this.inviteData.invitation_code} — ${this.referralLink}`);
    window.open(`https://wa.me/?text=${msg}`);
  }
}
