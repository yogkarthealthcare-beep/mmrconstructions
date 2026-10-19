import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-referral',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-referral.component.html',
  styleUrls: ['./admin-referral.component.css']
})
export class AdminReferralComponent implements OnInit {
  adminReferralCode: string = 'MMR-ASC-0001';
  copiedAssociate = false;
  copiedCustomer = false;
  copiedCode = false;

  constructor(
    private auth: AuthService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user?.invitation_code) {
      this.adminReferralCode = user.invitation_code;
    } else if (user?.member_id) {
      this.adminReferralCode = user.member_id;
    }
  }

  get associateReferralUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mmrconstructions.in';
    return `${origin}/register/associate?ref=${encodeURIComponent(this.adminReferralCode)}`;
  }

  get customerReferralUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mmrconstructions.in';
    return `${origin}/register/customer?ref=${encodeURIComponent(this.adminReferralCode)}`;
  }

  copyAssociateLink(inputElem?: HTMLInputElement): void {
    if (inputElem) inputElem.select();
    navigator.clipboard.writeText(this.associateReferralUrl).then(() => {
      this.copiedAssociate = true;
      setTimeout(() => (this.copiedAssociate = false), 2500);
    });
  }

  copyCustomerLink(inputElem?: HTMLInputElement): void {
    if (inputElem) inputElem.select();
    navigator.clipboard.writeText(this.customerReferralUrl).then(() => {
      this.copiedCustomer = true;
      setTimeout(() => (this.copiedCustomer = false), 2500);
    });
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.adminReferralCode).then(() => {
      this.copiedCode = true;
      setTimeout(() => (this.copiedCode = false), 2500);
    });
  }

  shareAssociateWhatsApp(): void {
    const msg = encodeURIComponent(
      `नमस्ते! MMR Constructions & Developers में Associate Partner के रूप में जुड़ें और अपनी रियल-एस्टेट टीम बनाएं।\n\nAssociate Registration Link:\n${this.associateReferralUrl}\n(Corporate Sponsor: ${this.adminReferralCode})`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  }

  shareCustomerWhatsApp(): void {
    const msg = encodeURIComponent(
      `नमस्ते! MMR Constructions & Developers में Kanpur, Unnao और Lucknow में prime plots उपलब्ध हैं।\n\nCustomer Registration Link:\n${this.customerReferralUrl}\n(Corporate Sponsor: ${this.adminReferralCode})`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  }
}
