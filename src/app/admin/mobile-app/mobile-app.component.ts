import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MobileAppService } from '../../services/mobile-app.service';

type MobileAppForm = {
  platform: string;
  app_name: string;
  app_logo_url: string;
  play_store_url: string;
  package_name: string;
  current_version: string;
  latest_version: string;
  version_code: string;
  release_notes: string;
  download_mode: 'apk' | 'play_store';
  apk_url: string;
  apk_file_name: string;
  apk_file_size_bytes: number | null;
  apk_uploaded_at: string;
  release_date: string;
  description: string;
  button_text: string;
  badge_text: string;
  is_enabled: boolean;
  is_coming_soon: boolean;
  force_download: boolean;
  open_target: '_blank' | '_self';
  display_order: number;
};

@Component({
  selector: 'app-mobile-app',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mobile-app.component.html',
  styleUrls: ['./mobile-app.component.css'],
})
export class MobileAppComponent implements OnInit {
  loading = true;
  saving = false;
  uploading = false;
  uploadingApk = false;
  deletingLogo = false;
  toast = '';
  toastType: 'success' | 'error' = 'success';
  selectedLogo: File | null = null;
  selectedApk: File | null = null;
  previewUrl = '';
  settingsId: number | null = null;
  apkUploadProgress = 0;

  form: MobileAppForm = this.emptyForm();

  constructor(private api: ApiService, private mobileApp: MobileAppService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.adminGetMobileAppSettings().subscribe({
      next: (res: any) => {
        this.applySettings(res?.data || {});
        this.loading = false;
      },
      error: (error: any) => {
        this.loading = false;
        this.showToast(error?.error?.message || 'Unable to load mobile app settings.', 'error');
      },
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      input.value = '';
      this.showToast('Only PNG, SVG, JPG, JPEG and WEBP logos are allowed.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      input.value = '';
      this.showToast('Logo must be 2 MB or smaller.', 'error');
      return;
    }

    this.selectedLogo = file;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl = String(reader.result || '');
    reader.readAsDataURL(file);
  }

  uploadLogo(): void {
    if (!this.selectedLogo) {
      this.showToast('Choose a logo before uploading.', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('logo', this.selectedLogo);
    this.uploading = true;
    this.api.adminUploadMobileAppLogo(formData).subscribe({
      next: (res: any) => {
        this.uploading = false;
        this.selectedLogo = null;
        this.applySettings(res?.data || {});
        this.mobileApp.getHeaderInfo(true).subscribe();
        this.showToast(res?.message || 'App logo uploaded.');
      },
      error: (error: any) => {
        this.uploading = false;
        this.showToast(error?.error?.message || 'Unable to upload app logo.', 'error');
      },
    });
  }

  onApkSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.apk')) {
      input.value = '';
      this.showToast('Only .apk files are allowed.', 'error');
      return;
    }
    if (file.size > 120 * 1024 * 1024) {
      input.value = '';
      this.showToast('APK must be 120 MB or smaller.', 'error');
      return;
    }
    this.selectedApk = file;
  }

  uploadApk(): void {
    if (!this.selectedApk) {
      this.showToast('Choose an APK before uploading.', 'error');
      return;
    }
    const apkFile = this.selectedApk;
    const formData = new FormData();
    formData.append('apk', apkFile);
    formData.append('current_version', this.form.current_version.trim());
    formData.append('latest_version', (this.form.latest_version || this.form.current_version).trim());
    formData.append('version_code', this.form.version_code.trim());
    formData.append('release_notes', this.form.release_notes.trim());
    this.uploadingApk = true;
    this.apkUploadProgress = 25;
    this.api.adminUploadMobileAppApk(formData).subscribe({
      next: (res: any) => {
        this.uploadingApk = false;
        this.apkUploadProgress = 100;
        this.selectedApk = null;
        this.applySettings(res?.data || {});
        this.mobileApp.getHeaderInfo(true).subscribe();
        this.showToast(res?.message || 'APK uploaded.');
      },
      error: (error: any) => {
        this.uploadingApk = false;
        this.apkUploadProgress = 0;
        this.showToast(error?.error?.message || 'Unable to upload APK. Check server upload limit or APK size.', 'error');
      },
    });
  }

  deleteLogo(): void {
    if (!this.form.app_logo_url || !confirm('Remove the current app logo?')) return;
    this.deletingLogo = true;
    this.api.adminDeleteMobileAppLogo().subscribe({
      next: (res: any) => {
        this.deletingLogo = false;
        this.selectedLogo = null;
        this.applySettings(res?.data || {});
        this.mobileApp.getHeaderInfo(true).subscribe();
        this.showToast(res?.message || 'App logo removed.');
      },
      error: (error: any) => {
        this.deletingLogo = false;
        this.showToast(error?.error?.message || 'Unable to delete app logo.', 'error');
      },
    });
  }

  save(): void {
    if (!this.form.app_name.trim()) {
      this.showToast('App name is required.', 'error');
      return;
    }
    if (this.form.play_store_url.trim() && !/^https:\/\/play\.google\.com\/store\/apps\/details\?/i.test(this.form.play_store_url.trim())) {
      this.showToast('Play Store URL must be a valid Google Play app link.', 'error');
      return;
    }

    this.saving = true;
    this.api.adminUpdateMobileAppSettings({
      ...this.form,
      app_logo_url: undefined,
      play_store_url: this.form.play_store_url.trim(),
      package_name: this.form.package_name.trim(),
      version_code: this.form.version_code.trim(),
      release_notes: this.form.release_notes.trim(),
      download_mode: this.form.download_mode,
      release_date: this.form.release_date || null,
      display_order: Number(this.form.display_order || 1),
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.applySettings(res?.data || {});
        this.mobileApp.getHeaderInfo(true).subscribe();
        this.showToast(res?.message || 'Mobile app settings saved.');
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message || 'Unable to save mobile app settings.', 'error');
      },
    });
  }

  toggleVisibility(): void {
    this.api.adminToggleMobileAppVisibility(!this.form.is_enabled).subscribe({
      next: (res: any) => {
        this.applySettings(res?.data || {});
        this.mobileApp.getHeaderInfo(true).subscribe();
        this.showToast(res?.message || 'Visibility updated.');
      },
      error: (error: any) => this.showToast(error?.error?.message || 'Unable to update visibility.', 'error'),
    });
  }

  private applySettings(data: any): void {
    this.settingsId = data?.id || null;
    this.form = {
      platform: data?.platform || 'google_play',
      app_name: data?.app_name || 'MMR Constructions',
      app_logo_url: data?.app_logo_url || '',
      play_store_url: data?.play_store_url || '',
      package_name: data?.package_name || '',
      current_version: data?.current_version || '',
      latest_version: data?.latest_version || '',
      version_code: data?.version_code || '',
      release_notes: data?.release_notes || '',
      download_mode: data?.download_mode === 'play_store' ? 'play_store' : 'apk',
      apk_url: data?.apk_url || '',
      apk_file_name: data?.apk_file_name || '',
      apk_file_size_bytes: data?.apk_file_size_bytes == null ? null : Number(data.apk_file_size_bytes),
      apk_uploaded_at: data?.apk_uploaded_at || '',
      release_date: data?.release_date ? String(data.release_date).slice(0, 10) : '',
      description: data?.description || '',
      button_text: data?.button_text || 'Download App',
      badge_text: data?.badge_text || 'Google Play',
      is_enabled: data?.is_enabled === true,
      is_coming_soon: data?.is_coming_soon !== false,
      force_download: data?.force_download !== false,
      open_target: data?.open_target === '_self' ? '_self' : '_blank',
      display_order: Number(data?.display_order || 1),
    };
    this.previewUrl = this.form.app_logo_url;
  }

  private emptyForm(): MobileAppForm {
    return {
      platform: 'google_play',
      app_name: 'MMR Constructions',
      app_logo_url: '',
      play_store_url: '',
      package_name: '',
      current_version: '',
      latest_version: '',
      version_code: '',
      release_notes: '',
      download_mode: 'apk',
      apk_url: '',
      apk_file_name: '',
      apk_file_size_bytes: null,
      apk_uploaded_at: '',
      release_date: '',
      description: '',
      button_text: 'Download App',
      badge_text: 'Google Play',
      is_enabled: false,
      is_coming_soon: true,
      force_download: true,
      open_target: '_blank',
      display_order: 1,
    };
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toast = message;
    this.toastType = type;
    window.setTimeout(() => this.toast = '', 4000);
  }

  formatBytes(value: number | null): string {
    if (!value) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
  }
}
