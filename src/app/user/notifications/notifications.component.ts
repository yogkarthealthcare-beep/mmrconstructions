import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-notifications', standalone: true, imports: [CommonModule], templateUrl: './notifications.component.html' })
export class NotificationsComponent implements OnInit {
  loading = true; notifications: any[] = []; unreadCount = 0; page = 1; markingAll = false;

  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getNotifications({ page: this.page, limit: 30 }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notifications = res.data?.notifications || [];
          this.unreadCount   = res.data?.unread_count  || 0;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  markRead(n: any) {
    if (n.is_read) return;
    this.api.markNotifRead(n.notif_id).subscribe({
      next: () => { n.is_read = true; n.read_at = new Date().toISOString(); this.unreadCount = Math.max(0, this.unreadCount - 1); }
    });
  }

  markAll() {
    this.markingAll = true;
    this.api.markAllRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0; this.markingAll = false;
      },
      error: () => { this.markingAll = false; }
    });
  }

  iconFor(channel: string) {
    const map: any = { SMS:'fas fa-sms', Email:'fas fa-envelope', Push:'fas fa-bell', All:'fas fa-bullhorn' };
    return map[channel] || 'fas fa-bell';
  }
  colorFor(channel: string) {
    const map: any = { SMS:'#1d4ed8', Email:'#a07c2a', Push:'#1a5c3a', All:'#7c3aed' };
    return map[channel] || '#1a5c3a';
  }
}
