import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

type BackupSettings = {
  daily_backup_enabled: boolean;
  backup_time: string;
  keep_last_backups: number;
  auto_delete_older: boolean;
};

@Component({
  selector: 'app-database-backup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './database-backup.component.html',
  styleUrls: ['./database-backup.component.css'],
})
export class DatabaseBackupComponent implements OnInit {
  status: any = null;
  backups: any[] = [];
  restoreUploads: any[] = [];
  restoreHistory: any[] = [];
  activeRowId: any = null;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }

  settings: BackupSettings = {
    daily_backup_enabled: false,
    backup_time: '02:00',
    keep_last_backups: 30,
    auto_delete_older: true,
  };

  loading = true;
  creating = false;
  savingSettings = false;
  uploadingRestore = false;
  restoringDatabase = false;
  actionFile = '';
  selectedRestoreFile: File | null = null;
  selectedRestoreUploadId: number | null = null;
  restoreMode: 'replace' | 'without_drop' = 'replace';
  restoreResult: any = null;
  toast = '';
  toastType: 'success' | 'error' = 'success';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.refreshStatus();
  }

  refreshStatus(): void {
    this.loading = true;
    this.api.adminGetDatabaseBackupStatus().subscribe({
      next: (res: any) => {
        this.status = res?.data || null;
        this.settings = { ...this.settings, ...(res?.data?.settings || {}) };
        this.loadHistory(false);
      },
      error: (error: any) => {
        this.loading = false;
        this.showToast(error?.error?.message || 'Unable to load database backup status.', 'error');
      },
    });
  }

  loadHistory(showMessage = true): void {
    this.api.adminGetDatabaseBackupHistory().subscribe({
      next: (res: any) => {
        this.backups = res?.data || [];
        this.loading = false;
        this.loadRestoreUploads(false);
        this.loadRestoreHistory(false);
        if (showMessage) this.showToast('Backup status refreshed.');
      },
      error: (error: any) => {
        this.loading = false;
        this.showToast(error?.error?.message || 'Unable to load backup history.', 'error');
      },
    });
  }

  loadRestoreUploads(showMessage = false): void {
    this.api.adminGetDatabaseRestoreUploads().subscribe({
      next: (res: any) => {
        this.restoreUploads = res?.data || [];
        if (!this.selectedRestoreUploadId && this.restoreUploads.length) {
          this.selectedRestoreUploadId = this.restoreUploads[0].id;
        }
        if (showMessage) this.showToast('Restore upload list refreshed.');
      },
      error: (error: any) => this.showToast(error?.error?.message || 'Unable to load restore files.', 'error'),
    });
  }

  loadRestoreHistory(showMessage = false): void {
    this.api.adminGetDatabaseRestoreHistory().subscribe({
      next: (res: any) => {
        this.restoreHistory = res?.data || [];
        if (showMessage) this.showToast('Restore history refreshed.');
      },
      error: (error: any) => this.showToast(error?.error?.message || 'Unable to load restore history.', 'error'),
    });
  }

  createBackup(): void {
    if (!confirm('Create a new PostgreSQL backup now?')) return;
    this.creating = true;
    this.api.adminCreateAndDownloadDatabaseBackup().subscribe({
      next: (response: any) => {
        this.creating = false;
        const fileName = this.fileNameFromResponse(response) || `postgresql_backup_${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}.sql`;
        this.saveBlob(response.body, fileName);
        this.showToast('Database backup created and download started.');
        this.refreshStatus();
      },
      error: (error: any) => {
        this.creating = false;
        this.showBackupError(error, 'Unable to create database backup.');
      },
    });
  }

  downloadBackup(backup: any): void {
    this.triggerBackupDownload(backup.file_name, backup.file_name);
  }

  private triggerBackupDownload(fileName: string, downloadName = fileName, fromCreate = false): void {
    this.actionFile = fileName;
    this.api.adminDownloadDatabaseBackup(fileName).subscribe({
      next: (blob: Blob) => {
        this.actionFile = '';
        this.saveBlob(blob, downloadName);
        if (!fromCreate) this.showToast('Backup download started.');
      },
      error: (error: any) => {
        this.actionFile = '';
        const message = fromCreate
          ? 'Backup was created, but automatic download failed. Please use the Download button from Backup History.'
          : 'Unable to download backup.';
        this.showBackupError(error, message);
      },
    });
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  private fileNameFromResponse(response: any): string {
    const explicit = response?.headers?.get?.('x-backup-file-name');
    if (explicit) return explicit;
    const disposition = response?.headers?.get?.('content-disposition') || '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    return match ? decodeURIComponent(match[1]) : '';
  }

  private showBackupError(error: any, fallback: string): void {
    const body = error?.error;
    if (body instanceof Blob) {
      body.text().then((text) => {
        try {
          this.showToast(JSON.parse(text)?.message || fallback, 'error');
        } catch {
          this.showToast(text || fallback, 'error');
        }
      });
      return;
    }
    this.showToast(body?.message || fallback, 'error');
  }

  deleteBackup(backup: any): void {
    if (!confirm(`Delete backup "${backup.file_name}"?`)) return;
    this.actionFile = backup.file_name;
    this.api.adminDeleteDatabaseBackup(backup.file_name).subscribe({
      next: (res: any) => {
        this.actionFile = '';
        this.showToast(res?.message || 'Database backup deleted.');
        this.refreshStatus();
      },
      error: (error: any) => {
        this.actionFile = '';
        this.showToast(error?.error?.message || 'Unable to delete backup.', 'error');
      },
    });
  }

  restoreBackup(backup: any): void {
    const confirmation = prompt(`Type RESTORE to restore "${backup.file_name}". This can overwrite current database data.`);
    if (confirmation !== 'RESTORE') return;
    this.actionFile = backup.file_name;
    this.api.adminRestoreDatabaseBackup(backup.file_name).subscribe({
      next: (res: any) => {
        this.actionFile = '';
        this.showToast(res?.message || 'Database backup restored.');
        this.refreshStatus();
      },
      error: (error: any) => {
        this.actionFile = '';
        this.showToast(error?.error?.message || 'Unable to restore backup.', 'error');
      },
    });
  }

  onRestoreFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (!/\.(sql|backup|dump|tar)$/i.test(file.name)) {
      input.value = '';
      this.selectedRestoreFile = null;
      this.showToast('Only .sql, .backup, .dump, and .tar PostgreSQL backup files are supported.', 'error');
      return;
    }
    this.selectedRestoreFile = file;
  }

  uploadRestoreFile(): void {
    if (!this.selectedRestoreFile) {
      this.showToast('Select a PostgreSQL backup file first.', 'error');
      return;
    }
    const form = new FormData();
    form.append('backup_file', this.selectedRestoreFile);
    this.uploadingRestore = true;
    this.api.adminUploadDatabaseRestoreFile(form).subscribe({
      next: (res: any) => {
        this.uploadingRestore = false;
        this.selectedRestoreFile = null;
        this.selectedRestoreUploadId = res?.data?.id || null;
        this.showToast(res?.message || 'Restore file uploaded and validated.');
        this.loadRestoreUploads();
      },
      error: (error: any) => {
        this.uploadingRestore = false;
        this.showToast(error?.error?.message || 'Unable to upload restore file.', 'error');
      },
    });
  }

  restoreSelectedUpload(): void {
    if (!this.selectedRestoreUploadId) {
      this.showToast('Select a validated restore file first.', 'error');
      return;
    }
    const confirmed = confirm('Warning: Restoring this backup will replace the current database. This action cannot be undone. Do you want to continue?');
    if (!confirmed) return;

    this.restoringDatabase = true;
    this.restoreResult = {
      status: 'Running',
      started_at: new Date().toISOString(),
      ended_at: null,
      duration: '-',
      message: 'Restore is running...',
    };
    this.api.adminRestoreUploadedDatabaseBackup(this.selectedRestoreUploadId, this.restoreMode).subscribe({
      next: (res: any) => {
        this.restoringDatabase = false;
        this.restoreResult = res?.data || null;
        this.showToast(res?.message || 'Database restore completed successfully.');
        this.loadRestoreUploads();
        this.loadRestoreHistory();
        this.refreshStatus();
      },
      error: (error: any) => {
        this.restoringDatabase = false;
        this.restoreResult = error?.error?.data || {
          status: 'Failed',
          started_at: this.restoreResult?.started_at,
          ended_at: new Date().toISOString(),
          duration: '-',
          message: 'Database restore failed.',
          error_details: error?.error?.message || 'Unable to restore uploaded backup.',
        };
        this.showToast(error?.error?.message || 'Unable to restore uploaded backup.', 'error');
        this.loadRestoreHistory();
      },
    });
  }

  saveSettings(): void {
    this.savingSettings = true;
    const payload = {
      ...this.settings,
      keep_last_backups: Number(this.settings.keep_last_backups || 30),
    };
    this.api.adminUpdateDatabaseBackupSettings(payload).subscribe({
      next: (res: any) => {
        this.savingSettings = false;
        this.settings = { ...this.settings, ...(res?.data || {}) };
        this.showToast(res?.message || 'Automatic backup settings saved.');
        this.refreshStatus();
      },
      error: (error: any) => {
        this.savingSettings = false;
        this.showToast(error?.error?.message || 'Unable to save backup settings.', 'error');
      },
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Not created yet';
    return new Date(value).toLocaleString();
  }

  statusClass(value: string): string {
    const status = String(value || '').toLowerCase();
    if (status === 'completed') return 'sbadge-green';
    if (status === 'success' || status === 'validated' || status === 'restored') return 'sbadge-green';
    if (status === 'running') return 'sbadge-blue';
    if (status === 'failed') return 'sbadge-red';
    if (status === 'uploaded') return 'sbadge-blue';
    return 'sbadge-gray';
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toast = message;
    this.toastType = type;
    window.setTimeout(() => this.toast = '', 4200);
  }
}
