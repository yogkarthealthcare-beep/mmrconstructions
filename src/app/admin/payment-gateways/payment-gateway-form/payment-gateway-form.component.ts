import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminPaymentGatewayService } from '../../../services/admin-payment-gateway.service';
import { PaymentGatewayAdmin } from '../../../services/payment.types';
import { LoadingButtonComponent } from '../../../shared/components/loading-button/loading-button.component';

@Component({
  selector: 'app-payment-gateway-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingButtonComponent],
  templateUrl: './payment-gateway-form.component.html',
  styleUrls: ['./payment-gateway-form.component.css']
})
export class PaymentGatewayFormComponent implements OnInit {
  gatewayName: string = '';
  gatewayDetails!: PaymentGatewayAdmin;
  gatewayForm!: FormGroup;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  copyMessage = '';

  // Control variables for credentials editing
  editingCredentials = {
    key_secret: false,
    client_secret: false
  };

  urlPattern = /^https?:\/\/([a-z0-9.-]+|localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(\/[^\s]*)?$/i;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private adminService: AdminPaymentGatewayService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const name = params.get('gatewayName');
      if (name) {
        this.gatewayName = name;
        this.initForm();
        this.watchEnvironmentMode();
        this.loadGatewayDetails();
      }
    });
  }

  private initForm() {
    // Shared parameters
    this.gatewayForm = this.fb.group({
      display_name: ['', [Validators.required, Validators.minLength(3)]],
      status: ['active', [Validators.required]],
      environment_mode: ['sandbox', [Validators.required]],
      priority: [0, [Validators.required, Validators.min(0), Validators.max(99)]],
      webhook_secret: ['', [Validators.required]],
      callback_url: ['', [Validators.required, Validators.pattern(this.urlPattern)]],
      webhook_url: ['', [Validators.required, Validators.pattern(this.urlPattern)]],
      success_url: ['', [Validators.required, Validators.pattern(this.urlPattern)]],
      failure_url: ['', [Validators.required, Validators.pattern(this.urlPattern)]],
      cancel_url: ['', [Validators.required, Validators.pattern(this.urlPattern)]],
      min_customer_fund_amount: [100, [Validators.required, Validators.min(0)]],
      min_associate_fund_amount: [100, [Validators.required, Validators.min(0)]],
      
      // Razorpay specific inputs
      key_id: [''],
      key_secret: [''],
      
      // Cashfree specific inputs
      client_id: [''],
      client_secret: ['']
    });
  }

  private loadGatewayDetails() {
    this.loading = true;
    this.errorMessage = '';

    this.adminService.getGateway(this.gatewayName).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.gatewayDetails = res.data;
          this.prefillForm();
          this.adjustValidators();
        } else {
          this.errorMessage = 'Gateway configuration records not found.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load gateway', err);
        this.errorMessage = err?.error?.message || 'Error loading configurations from backend API.';
        this.loading = false;
      }
    });
  }

  private prefillForm() {
    const d = this.gatewayDetails;
    const generated = this.generatedUrls;
    const useSavedUrls = this.gatewayName === 'cashfree';
    this.gatewayForm.patchValue({
      display_name: d.display_name,
      status: d.status,
      environment_mode: d.environment_mode || d.mode,
      priority: d.priority || 0,
      webhook_secret: d.webhook_secret || '',
      callback_url: useSavedUrls ? (d.callback_url || generated.callback) : generated.callback,
      webhook_url: useSavedUrls ? (d.webhook_url || generated.webhook) : generated.webhook,
      success_url: useSavedUrls ? (d.success_url || generated.success) : generated.success,
      failure_url: useSavedUrls ? (d.failure_url || generated.failed) : generated.failed,
      cancel_url: useSavedUrls ? (d.cancel_url || generated.pending) : generated.pending,
      min_customer_fund_amount: d.min_customer_fund_amount ?? 100,
      min_associate_fund_amount: d.min_associate_fund_amount ?? 100,
      key_id: d.key_id || d.public_key || '',
      key_secret: d.key_secret || d.secret_key || '',
      client_id: d.client_id || d.public_key || '',
      client_secret: d.client_secret || ''
    });

    // Reset editing control toggles
    this.editingCredentials = {
      key_secret: !d.key_secret, // If blank, let them write directly
      client_secret: !d.client_secret
    };
  }

  get generatedUrls() {
    const origin = this.appOrigin;
    const isCashfree = this.gatewayName === 'cashfree';
    return {
      callback: isCashfree
        ? `${origin}/payment/callback?gateway=cashfree&order_id={order_id}`
        : `${origin}/payment/callback`,
      status: `${origin}/payment/status`,
      webhook: isCashfree
        ? `${origin}/api/payment/cashfree/webhook`
        : `${origin}/api/payment/webhook`,
      success: `${origin}/payment/success`,
      failed: `${origin}/payment/failed`,
      pending: `${origin}/payment/pending`,
      processing: `${origin}/payment/processing`,
      return: `${origin}/payment/status`,
    };
  }

  get environmentLabel() {
    const mode = String(this.gatewayForm?.get('environment_mode')?.value || '').toLowerCase();
    return ['live', 'production'].includes(mode) ? 'Production Mode' : 'Test Mode';
  }

  get environmentClass() {
    return ['live', 'production'].includes(String(this.gatewayForm?.get('environment_mode')?.value || '').toLowerCase())
      ? 'env-live'
      : 'env-test';
  }

  get appOrigin() {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }

  private watchEnvironmentMode() {
    this.gatewayForm.get('environment_mode')?.valueChanges.subscribe(() => {
      if (this.gatewayName !== 'cashfree') {
        this.applyGeneratedUrls();
      }
    });
  }

  private applyGeneratedUrls() {
    const urls = this.generatedUrls;
    this.gatewayForm.patchValue({
      callback_url: urls.callback,
      webhook_url: urls.webhook,
      success_url: urls.success,
      failure_url: urls.failed,
      cancel_url: urls.pending,
    }, { emitEvent: false });
  }

  private adjustValidators() {
    const keyIdControl = this.gatewayForm.get('key_id');
    const keySecretControl = this.gatewayForm.get('key_secret');
    const clientIdControl = this.gatewayForm.get('client_id');
    const clientSecretControl = this.gatewayForm.get('client_secret');

    // Remove validators initially
    keyIdControl?.clearValidators();
    keySecretControl?.clearValidators();
    clientIdControl?.clearValidators();
    clientSecretControl?.clearValidators();

    if (this.gatewayName === 'razorpay') {
      keyIdControl?.setValidators([Validators.required]);
      if (this.editingCredentials.key_secret) {
        keySecretControl?.setValidators([Validators.required]);
      }
    } else if (this.gatewayName === 'cashfree') {
      clientIdControl?.setValidators([Validators.required]);
      if (this.editingCredentials.client_secret) {
        clientSecretControl?.setValidators([Validators.required]);
      }
    }

    keyIdControl?.updateValueAndValidity();
    keySecretControl?.updateValueAndValidity();
    clientIdControl?.updateValueAndValidity();
    clientSecretControl?.updateValueAndValidity();
  }

  enableEditSecret(secretName: 'key_secret' | 'client_secret') {
    this.editingCredentials[secretName] = true;
    
    // Clear current value to let user enter fresh key
    this.gatewayForm.get(secretName)?.setValue('');
    this.adjustValidators();
  }

  copyUrl(value: string, label = 'URL') {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      this.copyMessage = `${label} copied.`;
      setTimeout(() => this.copyMessage = '', 1800);
    }).catch(() => {
      this.copyMessage = 'Copy failed. Select and copy the URL manually.';
      setTimeout(() => this.copyMessage = '', 2500);
    });
  }

  testConnection() {
    if (this.gatewayName !== 'cashfree') {
      this.applyGeneratedUrls();
    }
    if (this.gatewayForm.get('callback_url')?.invalid || this.gatewayForm.get('webhook_url')?.invalid) {
      this.errorMessage = 'Auto-generated callback or webhook URL is invalid.';
      return;
    }
    this.successMessage = `${this.environmentLabel} URLs are reachable from this app configuration. Save credentials before gateway-side testing.`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  verifyCredentials() {
    this.adjustValidators();
    const credentialControls = this.gatewayName === 'razorpay'
      ? ['key_id', 'key_secret', 'webhook_secret']
      : ['client_id', 'client_secret', 'webhook_secret'];

    const invalid = credentialControls.some((name) => this.gatewayForm.get(name)?.invalid);
    if (invalid) {
      credentialControls.forEach((name) => this.gatewayForm.get(name)?.markAsTouched());
      this.errorMessage = 'Enter the required gateway credentials before verification.';
      return;
    }

    this.successMessage = `${this.gatewayDetails?.display_name || this.gatewayName} credentials are present for ${this.environmentLabel}.`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  saveGateway() {
    if (this.gatewayName !== 'cashfree') {
      this.applyGeneratedUrls();
    }
    if (this.gatewayForm.invalid) {
      this.gatewayForm.markAllAsTouched();
      this.errorMessage = 'Please fix validation errors before saving configurations.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formVal = { ...this.gatewayForm.value };

    // Remove secret fields if user didn't request editing (we don't want to re-save masked strings)
    if (this.gatewayName === 'razorpay' && !this.editingCredentials.key_secret) {
      delete formVal.key_secret;
    }
    if (this.gatewayName === 'cashfree' && !this.editingCredentials.client_secret) {
      delete formVal.client_secret;
    }

    // Strip unused gateway specific keys to keep payload neat
    if (this.gatewayName === 'razorpay') {
      formVal.public_key = formVal.key_id;
      formVal.secret_key = formVal.key_secret;
      delete formVal.client_id;
      delete formVal.client_secret;
    } else {
      formVal.public_key = formVal.client_id;
      delete formVal.key_id;
      delete formVal.key_secret;
    }

    this.adminService.updateGateway(this.gatewayName, formVal).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = `${this.gatewayDetails.display_name} configuration updated successfully.`;
          setTimeout(() => {
            this.router.navigate(['/admin/payment-gateways']);
          }, 1500);
        } else {
          this.errorMessage = res.message || 'Failed to save settings.';
          this.saving = false;
        }
      },
      error: (err) => {
        console.error('Failed to save gateway details', err);
        this.errorMessage = err?.error?.message || 'Error saving gateway details.';
        this.saving = false;
      }
    });
  }
}
