import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-whatsapp-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-admin.component.html',
  styleUrls: ['./whatsapp-admin.component.css'],
})
export class WhatsappAdminComponent implements OnInit {
  activeTab: 'settings' | 'templates' | 'queue' | 'logs' = 'settings';
  loading = false;
  saving = false;
  processing = false;
  message = '';
  error = '';

  settings: any = {
    is_enabled: false,
    api_version: 'v20.0',
    default_country_code: '91',
    otp_length: 6,
    otp_expiry_minutes: 10,
    resend_limit: 3,
    max_attempts: 5,
    queue_max_attempts: 3,
  };
  dashboard: any = {};
  templates: any[] = [];
  logs: any[] = [];
  queue: any[] = [];
  test = { mobile_no: '', template_key: 'general_notification', message: 'MMR WhatsApp integration test message' };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.api.adminWhatsappDashboard().subscribe({ next: (r: any) => this.dashboard = r.data || {} });
    this.api.adminWhatsappSettings().subscribe({
      next: (res: any) => {
        if (res?.data) this.settings = { ...this.settings, ...res.data };
        this.loading = false;
      },
      error: (e: any) => this.fail(e, 'WhatsApp settings load nahi ho paayi.'),
    });
    this.loadTemplates();
    this.loadQueue();
    this.loadLogs();
  }

  loadTemplates() {
    this.api.adminWhatsappTemplates().subscribe({ next: (res: any) => this.templates = res.data || [] });
  }

  loadQueue() {
    this.api.adminWhatsappQueue().subscribe({ next: (res: any) => this.queue = res.data || [] });
  }

  loadLogs() {
    this.api.adminWhatsappLogs().subscribe({ next: (res: any) => this.logs = res.data || [] });
  }

  saveSettings() {
    this.saving = true;
    this.clear();
    this.api.adminSaveWhatsappSettings(this.settings).subscribe({
      next: (res: any) => {
        this.settings = { ...this.settings, ...(res.data || {}) };
        this.done('WhatsApp settings saved.');
      },
      error: (e: any) => this.fail(e, 'Settings save failed.'),
    });
  }

  saveTemplate(template: any) {
    template.saving = true;
    this.clear();
    this.api.adminUpdateWhatsappTemplate(template.template_id, {
      ...template,
      template_variables: this.parseVariables(template.template_variables),
    }).subscribe({
      next: (res: any) => {
        Object.assign(template, res.data || {});
        template.saving = false;
        this.message = 'Template saved.';
      },
      error: (e: any) => {
        template.saving = false;
        this.fail(e, 'Template save failed.');
      },
    });
  }

  toggleTemplate(template: any) {
    this.api.adminToggleWhatsappTemplate(template.template_id, !template.is_active).subscribe({
      next: () => {
        template.is_active = !template.is_active;
        template.status = template.is_active ? 'Active' : 'Inactive';
      },
      error: (e: any) => this.fail(e, 'Template status update failed.'),
    });
  }

  sendTestMessage() {
    this.processing = true;
    this.clear();
    this.api.adminSendWhatsappTest(this.test).subscribe({
      next: () => {
        this.processing = false;
        this.message = 'Test message sent.';
        this.loadLogs();
      },
      error: (e: any) => {
        this.processing = false;
        this.fail(e, 'Test message failed.');
      },
    });
  }

  processQueue() {
    this.processing = true;
    this.api.adminProcessWhatsappQueue(25).subscribe({
      next: () => {
        this.processing = false;
        this.message = 'Queue processed.';
        this.loadQueue();
        this.loadLogs();
      },
      error: (e: any) => {
        this.processing = false;
        this.fail(e, 'Queue process failed.');
      },
    });
  }

  variableText(template: any) {
    return Array.isArray(template.template_variables) ? template.template_variables.join(', ') : template.template_variables;
  }

  setVariableText(template: any, value: string) {
    template.template_variables = value;
  }

  private parseVariables(value: any) {
    if (Array.isArray(value)) return value;
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  private clear() {
    this.message = '';
    this.error = '';
  }

  private done(msg: string) {
    this.saving = false;
    this.message = msg;
  }

  private fail(e: any, fallback: string) {
    this.loading = false;
    this.saving = false;
    this.error = e?.error?.message || fallback;
  }
}
