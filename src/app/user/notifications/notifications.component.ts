import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  loading = true;
  notifications: any[] = [];
  unreadCount = 0;
  page = 1;
  markingAll = false;
  searchTerm = '';
  filterChannel = 'all';

  get isAdmin(): boolean {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  }

  get filteredNotifications(): any[] {
    return this.notifications.filter(n => {
      const matchesSearch = !this.searchTerm ||
        n.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        n.message?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesChannel = this.filterChannel === 'all' ||
        (this.filterChannel === 'unread' && !n.is_read) ||
        (n.channel?.toLowerCase() === this.filterChannel.toLowerCase());

      return matchesSearch && matchesChannel;
    });
  }

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    const req$ = this.isAdmin
      ? this.api.adminGetNotifications({ page: this.page, limit: 50 })
      : this.api.getNotifications({ page: this.page, limit: 50 });

    req$.subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notifications = res.data?.notifications || [];
          this.unreadCount   = res.data?.unread_count  || 0;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onNotifItemClick(n: any) {
    if (!n.is_read) {
      this.markRead(n);
    }
    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
  }

  markRead(n: any) {
    if (n.is_read) return;
    const req$ = this.isAdmin
      ? this.api.adminMarkNotifRead(n.notif_id)
      : this.api.markNotifRead(n.notif_id);

    req$.subscribe({
      next: () => {
        n.is_read = true;
        n.read_at = new Date().toISOString();
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  markAll() {
    this.markingAll = true;
    const req$ = this.isAdmin
      ? this.api.adminMarkAllNotifRead()
      : this.api.markAllRead();

    req$.subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0;
        this.markingAll = false;
      },
      error: () => {
        this.markingAll = false;
      }
    });
  }

  iconFor(channel: string) {
    const map: any = { SMS: 'fas fa-sms', Email: 'fas fa-envelope', Push: 'fas fa-bell', InApp: 'fas fa-bell', All: 'fas fa-bullhorn' };
    return map[channel] || 'fas fa-bell';
  }

  colorFor(channel: string) {
    const map: any = { SMS: '#2563eb', Email: '#ca8a04', Push: '#10b981', InApp: '#062b18', All: '#8b5cf6' };
    return map[channel] || '#10b981';
  }
}
