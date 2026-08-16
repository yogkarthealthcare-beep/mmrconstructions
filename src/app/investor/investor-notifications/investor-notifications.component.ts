import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investor-notifications.component.html',
  styleUrls: ['./investor-notifications.component.css']
})
export class InvestorNotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.getInvestorNotifications().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.notifications = res.success ? (res.data || []) : [];
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to load notifications.';
      }
    });
  }

  markRead(item: any) {
    if (item.is_read) return;
    this.api.markInvestorNotificationRead(item.id).subscribe(() => {
      item.is_read = true;
    });
  }
}
