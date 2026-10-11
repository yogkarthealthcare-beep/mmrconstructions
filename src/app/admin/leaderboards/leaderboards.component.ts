import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { LeaderboardEntry } from '../../services/booking-attribution.types';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-leaderboards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboards.component.html',
  styleUrls: ['./leaderboards.component.css']
})
export class AdminLeaderboardsComponent implements OnInit {
  activeType: 'team-members' | 'associates' = 'team-members';
  activePeriod = 'all';
  loading = false;
  exporting = false;
  entries: LeaderboardEntry[] = [];

  constructor(private attributionApi: BookingAttributionApiService) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  setType(type: 'team-members' | 'associates'): void {
    this.activeType = type;
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.loading = true;
    this.attributionApi.getLeaderboards(this.activeType, this.activePeriod).subscribe({
      next: (data) => {
        this.entries = data || [];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load leaderboard:', err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Failed to load leaderboard',
          text: err.message || 'Unable to fetch leaderboard rankings.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }

  exportCsv(): void {
    this.exporting = true;
    this.attributionApi.exportLeaderboardCsv(this.activeType).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leaderboard_${this.activeType}_${this.activePeriod}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.exporting = false;
      },
      error: (err: any) => {
        this.exporting = false;
        Swal.fire({
          icon: 'error',
          title: 'Export Failed',
          text: err.message || 'Unable to download leaderboard CSV.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }
}
