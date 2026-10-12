import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-team-member-referral',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './referral.component.html',
  styleUrls: ['./referral.component.css']
})
export class TeamMemberReferralComponent implements OnInit {
  currentUser: any = null;
  inviteCode: string = '';
  referralUrl: string = '';
  whatsappUrl: string = '';
  copied = false;

  constructor(
    private auth: AuthService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();
    this.initReferralDetails();

    // Also fetch updated profile to guarantee fresh invitation_code and referral_link
    this.api.getProfile().subscribe({
      next: (res: any) => {
        const p = res?.data || res?.user || {};
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mmrconstructions.in';
        if (p.invitation_code) {
          this.inviteCode = p.invitation_code;
        } else if (p.member_id) {
          this.inviteCode = p.member_id;
        }

        if (p.referral_link) {
          // Adapt backend domain to active origin (e.g. localhost or live domain)
          this.referralUrl = p.referral_link.replace(/^https?:\/\/[^/]+/i, origin);
        } else if (this.inviteCode) {
          this.referralUrl = `${origin}/register?ref=${encodeURIComponent(this.inviteCode)}`;
        }
        this.buildWhatsappUrl();
      },
      error: () => {}
    });
  }

  private initReferralDetails(): void {
    const code = this.currentUser?.invitation_code || this.currentUser?.member_id || this.currentUser?.team_member_uid || '';
    this.inviteCode = code;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mmrconstructions.in';
    this.referralUrl = code ? `${origin}/register?ref=${encodeURIComponent(code)}` : `${origin}/register`;
    this.buildWhatsappUrl();
  }

  private buildWhatsappUrl(): void {
    const msg = `नमस्ते! MMR Constructions & Developers me Kanpur, Unnao aur Lucknow me prime verified plots available hain.\n\nMere referral link se signup karein aur shandar offers payein:\n${this.referralUrl}\n(Referral Code: ${this.inviteCode})`;
    this.whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  copyLink(inputElem: HTMLInputElement): void {
    inputElem.select();
    navigator.clipboard.writeText(this.referralUrl).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2500);
    });
  }
}
