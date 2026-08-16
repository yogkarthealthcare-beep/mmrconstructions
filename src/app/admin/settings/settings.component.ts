import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewEncapsulation } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AdminSettingsComponent implements OnInit {
  activeTab: 'email' | 'registration' = 'email';

  // ── Email Config ─────────────────────────────────────────────
  emailCfg = {
    active_provider:   'brevo',
    sender_name:       'MMR Constructions',
    sender_email:      '',
    brevo_api_key:     '',
    gmail_email:       '',
    gmail_app_password:'',
    smtp_host:         'smtp.gmail.com',
    smtp_port:         '587',
  };
  cfgLoading  = false;
  cfgSaving   = false;
  cfgError    = '';
  cfgSuccess  = '';

  // ── Test email ───────────────────────────────────────────────
  testEmail    = '';
  testLoading  = false;
  testResult   = '';
  testError    = '';

  // ── Registration toggle ──────────────────────────────────────
  regEnabled   = true;
  regLoading   = false;
  regSaving    = false;
  regError     = '';
  regSuccess   = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadEmailConfig();
    this.loadRegistrationToggle();
  }

  // ── Load email config ────────────────────────────────────────
  loadEmailConfig() {
    this.cfgLoading = true;
    this.api.getEmailConfig().subscribe({
      next: (res: any) => {
        this.cfgLoading = false;
        if (res.success) Object.assign(this.emailCfg, res.config);
      },
      error: () => { this.cfgLoading = false; }
    });
  }

  saveEmailConfig() {
    this.cfgSaving = true; this.cfgError = ''; this.cfgSuccess = '';
    this.api.saveEmailConfig(this.emailCfg).subscribe({
      next: (res: any) => {
        this.cfgSaving = false;
        if (res.success) this.cfgSuccess = res.message;
        else this.cfgError = res.message;
      },
      error: (e: any) => {
        this.cfgSaving = false;
        this.cfgError = e?.error?.message || 'Save failed';
      }
    });
  }

  sendTestEmail() {
    if (!this.testEmail) { this.testError = 'Test email enter karein'; return; }
    this.testLoading = true; this.testResult = ''; this.testError = '';
    this.api.testEmail(this.testEmail).subscribe({
      next: (res: any) => {
        this.testLoading = false;
        if (res.success) this.testResult = res.message;
        else this.testError = res.message;
      },
      error: (e: any) => {
        this.testLoading = false;
        this.testError = e?.error?.message || 'Test failed';
      }
    });
  }

  // ── Registration toggle ──────────────────────────────────────
  loadRegistrationToggle() {
    this.regLoading = true;
    this.api.getRegistrationToggle().subscribe({
      next: (res: any) => { this.regLoading = false; this.regEnabled = res.enabled; },
      error: () => { this.regLoading = false; }
    });
  }

  saveRegistrationToggle() {
    this.regSaving = true; this.regError = ''; this.regSuccess = '';
    this.api.setRegistrationToggle(this.regEnabled).subscribe({
      next: (res: any) => {
        this.regSaving = false;
        if (res.success) this.regSuccess = `Registration ${this.regEnabled ? 'enabled' : 'disabled'} ho gaya`;
        else this.regError = res.message;
      },
      error: (e: any) => {
        this.regSaving = false;
        this.regError = e?.error?.message || 'Toggle failed';
      }
    });
  }
}
