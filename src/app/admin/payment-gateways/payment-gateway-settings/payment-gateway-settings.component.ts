import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminPaymentGatewayService } from '../../../services/admin-payment-gateway.service';
import { PaymentGatewayAdmin, PaymentSettings } from '../../../services/payment.types';
import { PaymentGatewayListComponent } from '../payment-gateway-list/payment-gateway-list.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { LoadingButtonComponent } from '../../../shared/components/loading-button/loading-button.component';

@Component({
  selector: 'app-payment-gateway-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PaymentGatewayListComponent,
    ConfirmationDialogComponent,
    LoadingButtonComponent
  ],
  templateUrl: './payment-gateway-settings.component.html',
  styleUrls: ['./payment-gateway-settings.component.css']
})
export class PaymentGatewaySettingsComponent implements OnInit {
  gateways: PaymentGatewayAdmin[] = [];
  globalForm!: FormGroup;
  gatewayForms: Record<'razorpay' | 'cashfree' | 'payu', FormGroup> = {} as Record<'razorpay' | 'cashfree' | 'payu', FormGroup>;
  supportedGateways: Array<'razorpay' | 'cashfree' | 'payu'> = ['razorpay', 'cashfree', 'payu'];
  savingGateway: Record<'razorpay' | 'cashfree' | 'payu', boolean> = { razorpay: false, cashfree: false, payu: false };
  secretVisible: Record<'razorpay' | 'cashfree' | 'payu', boolean> = { razorpay: false, cashfree: false, payu: false };
  
  loading = false;
  savingGlobal = false;
  errorMessage = '';
  successMessage = '';

  // Confirmation Modal state
  dialogOpen = false;
  dialogTitle = '';
  dialogMessage = '';
  pendingAction: (() => void) | null = null;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminPaymentGatewayService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadData();
  }

  private initForm() {
    this.globalForm = this.fb.group({
      user_gateway_selection: [false],
      default_gateway: [''],
      fallback_gateway: [false]
    });

    this.gatewayForms = {
      razorpay: this.fb.group({
        gateway_name: ['razorpay'],
        display_name: ['Razorpay', [Validators.required]],
        public_key: ['', [Validators.required]],
        secret_key: ['', [Validators.required]],
        callback_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
        webhook_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
        status: ['inactive', [Validators.required]],
        environment_mode: ['test'],
        priority: [1],
      }),
      cashfree: this.fb.group({
        gateway_name: ['cashfree'],
        display_name: ['Cashfree', [Validators.required]],
        public_key: ['', [Validators.required]],
        client_secret: ['', [Validators.required]],
        callback_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
        webhook_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
        environment_mode: ['sandbox', [Validators.required]],
        status: ['inactive', [Validators.required]],
        priority: [2],
      }),
      payu: this.fb.group({
        gateway_name: ['payu'],
        display_name: ['PayU', [Validators.required]],
        public_key: ['', [Validators.required]],
        secret_key: ['', [Validators.required]],
        callback_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
        webhook_url: [''],
        environment_mode: ['test', [Validators.required]],
        status: ['inactive', [Validators.required]],
        priority: [3],
      })
    };
  }

  loadData() {
    this.loading = true;
    this.errorMessage = '';

    // Fetch gateways list
    this.adminService.getGateways().subscribe({
      next: (gwRes) => {
        if (gwRes.success) {
          this.gateways = this.mergeSupportedGateways(gwRes.data || []);
          this.patchGatewayForms();
        }
        this.loadGlobalSettings();
      },
      error: (err) => {
        console.error('Failed to load gateways', err);
        this.errorMessage = 'Failed to load payment gateways. Please try again.';
        this.loadGlobalSettings();
      }
    });
  }

  private mergeSupportedGateways(rows: PaymentGatewayAdmin[]): PaymentGatewayAdmin[] {
    const defaults: PaymentGatewayAdmin[] = [
      {
        gateway_name: 'razorpay',
        display_name: 'Razorpay',
        status: 'inactive',
        mode: 'test',
        environment_mode: 'test',
        logo: 'https://razorpay.com/favicon.ico',
        priority: 1,
      },
      {
        gateway_name: 'cashfree',
        display_name: 'Cashfree',
        status: 'inactive',
        mode: 'sandbox',
        environment_mode: 'sandbox',
        logo: 'https://www.cashfree.com/favicon.ico',
        priority: 2,
      },
      {
        gateway_name: 'payu',
        display_name: 'PayU',
        status: 'inactive',
        mode: 'test',
        environment_mode: 'test',
        logo: 'https://payu.in/favicon.ico',
        priority: 3,
      }
    ];

    return defaults.map((fallback) => {
      const existing = rows.find((gw) => gw.gateway_name === fallback.gateway_name);
      return existing ? { ...fallback, ...existing } : fallback;
    });
  }

  private patchGatewayForms() {
    this.supportedGateways.forEach((name) => {
      const gateway = this.gateways.find((gw) => gw.gateway_name === name);
      if (!gateway) return;

      const form = this.gatewayForms[name];
      form.patchValue({
        gateway_name: name,
        display_name: gateway.display_name || this.getGatewayLabel(name),
        public_key: gateway.public_key || gateway.key_id || gateway.client_id || '',
        secret_key: gateway.secret_key || gateway.key_secret || '',
        client_secret: gateway.client_secret || '',
        callback_url: gateway.callback_url || '',
        webhook_url: gateway.webhook_url || '',
        environment_mode: gateway.environment_mode || gateway.mode || (name === 'cashfree' ? 'sandbox' : 'test'),
        status: gateway.status || 'inactive',
        priority: gateway.priority || (name === 'razorpay' ? 1 : name === 'cashfree' ? 2 : 3),
      });
    });
  }

  getGatewayLabel(name: 'razorpay' | 'cashfree' | 'payu') {
    if (name === 'razorpay') return 'Razorpay';
    if (name === 'cashfree') return 'Cashfree';
    return 'PayU';
  }

  gatewayExists(name: 'razorpay' | 'cashfree' | 'payu') {
    return Boolean(this.gateways.find((gw) => gw.gateway_name === name && gw.id));
  }

  toggleSecret(name: 'razorpay' | 'cashfree' | 'payu') {
    this.secretVisible[name] = !this.secretVisible[name];
  }

  saveGatewayConfig(name: 'razorpay' | 'cashfree' | 'payu') {
    const form = this.gatewayForms[name];
    if (form.invalid) {
      form.markAllAsTouched();
      this.errorMessage = `Please complete required ${this.getGatewayLabel(name)} fields before saving.`;
      return;
    }

    this.savingGateway[name] = true;
    this.errorMessage = '';
    this.successMessage = '';

    const raw = form.value;
    const payload: Partial<PaymentGatewayAdmin> = {
      gateway_name: name,
      display_name: raw.display_name,
      public_key: raw.public_key,
      callback_url: raw.callback_url,
      webhook_url: raw.webhook_url,
      environment_mode: raw.environment_mode,
      status: raw.status,
      priority: raw.priority,
      is_enabled: raw.status === 'active',
      allow_user_selection: this.globalForm.get('user_gateway_selection')?.value,
      fallback_enabled: this.globalForm.get('fallback_gateway')?.value,
    };

    if (name === 'razorpay' || name === 'payu') {
      payload.secret_key = raw.secret_key;
    } else {
      payload.client_secret = raw.client_secret;
    }

    const request$ = this.gatewayExists(name)
      ? this.adminService.updateGateway(name, payload)
      : this.adminService.createGateway(payload);

    request$.subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = `${this.getGatewayLabel(name)} configuration saved successfully.`;
          this.loadData();
          this.showToast();
        } else {
          this.errorMessage = res.message || `Failed to save ${this.getGatewayLabel(name)} configuration.`;
        }
        this.savingGateway[name] = false;
      },
      error: (err) => {
        console.error(`Failed to save ${name}`, err);
        this.errorMessage = err?.error?.message || `Failed to save ${this.getGatewayLabel(name)} configuration.`;
        this.savingGateway[name] = false;
      }
    });
  }

  private loadGlobalSettings() {
    this.adminService.getSettings().subscribe({
      next: (settingsRes) => {
        if (settingsRes.success && settingsRes.data) {
          this.globalForm.patchValue(settingsRes.data);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load settings', err);
        this.loading = false;
      }
    });
  }

  saveGlobalSettings() {
    this.savingGlobal = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: PaymentSettings = this.globalForm.value;

    this.adminService.updateSettings(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage = 'Global payment configurations updated successfully.';
          this.showToast();
        } else {
          this.errorMessage = res.message || 'Failed to update settings.';
        }
        this.savingGlobal = false;
      },
      error: (err) => {
        console.error('Update settings failed', err);
        this.errorMessage = err?.error?.message || 'Error occurred saving settings.';
        this.savingGlobal = false;
      }
    });
  }

  handleToggleStatus(gateway: PaymentGatewayAdmin) {
    // Determine next status in cycle: active -> maintenance -> inactive -> active
    let nextStatus: 'active' | 'inactive' | 'maintenance';
    if (gateway.status === 'active') {
      nextStatus = 'maintenance';
    } else if (gateway.status === 'maintenance') {
      nextStatus = 'inactive';
    } else {
      nextStatus = 'active';
    }

    const triggerUpdate = () => {
      this.adminService.updateGateway(gateway.gateway_name, { status: nextStatus }).subscribe({
        next: (res) => {
          if (res.success) {
            gateway.status = nextStatus;
            this.successMessage = `${gateway.display_name} status updated to ${nextStatus}.`;
            this.showToast();
            
            // If we deactivated the default gateway, we must clear it or resolve settings
            if (nextStatus !== 'active' && this.globalForm.get('default_gateway')?.value === gateway.gateway_name) {
              this.globalForm.patchValue({ default_gateway: '' });
              this.saveGlobalSettings();
            }
          } else {
            this.errorMessage = res.message;
          }
        },
        error: (err) => {
          console.error('Failed to toggle status', err);
          this.errorMessage = 'Failed to update gateway status.';
        }
      });
    };

    // Warn if disabling active gateway
    if (gateway.status === 'active') {
      this.dialogTitle = 'Change Gateway Status';
      this.dialogMessage = `Are you sure you want to shift ${gateway.display_name} into maintenance mode? Active checkouts for this gateway will fail.`;
      this.pendingAction = triggerUpdate;
      this.dialogOpen = true;
    } else {
      triggerUpdate();
    }
  }

  handleSetDefault(gateway: PaymentGatewayAdmin) {
    if (this.globalForm.get('default_gateway')?.value === gateway.gateway_name) {
      return;
    }

    const triggerDefault = () => {
      this.globalForm.patchValue({ default_gateway: gateway.gateway_name });
      this.saveGlobalSettings();
    };

    this.dialogTitle = 'Change Default Gateway';
    this.dialogMessage = `Do you want to set ${gateway.display_name} as the primary/default payment gateway?`;
    this.pendingAction = triggerDefault;
    this.dialogOpen = true;
  }

  handleUpdatePriority(event: { gateway: PaymentGatewayAdmin, priority: number }) {
    this.adminService.updateGateway(event.gateway.gateway_name, { priority: event.priority }).subscribe({
      next: (res) => {
        if (res.success) {
          event.gateway.priority = event.priority;
          this.successMessage = `Priority for ${event.gateway.display_name} updated successfully.`;
          this.showToast();
        }
      },
      error: (err) => {
        console.error('Failed to update priority', err);
        this.errorMessage = 'Unable to save priority number.';
      }
    });
  }

  confirmAction() {
    if (this.pendingAction) {
      this.pendingAction();
    }
    this.closeDialog();
  }

  closeDialog() {
    this.dialogOpen = false;
    this.pendingAction = null;
  }

  private showToast() {
    setTimeout(() => {
      this.successMessage = '';
    }, 4000);
  }
}
