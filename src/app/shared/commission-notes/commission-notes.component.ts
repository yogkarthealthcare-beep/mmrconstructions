import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-commission-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './commission-notes.component.html',
  styleUrls: ['./commission-notes.component.css'],
})
export class CommissionNotesComponent implements OnInit {
  settings: any = {};

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const request = this.auth.isAdminLoggedIn()
      ? this.api.adminGetCommissionEngineSettings()
      : this.api.getCommissionEngineSummary();
    request.subscribe({
      next: (res: any) => this.settings = res?.data || {},
      error: () => this.settings = {},
    });
  }

  get model(): string {
    return this.settings.commission_model === 'LevelWise' ? 'Level Wise' : 'Upline';
  }

  get levelFormula(): string {
    if (this.settings.commission_model !== 'LevelWise') return 'Not active';
    return (this.settings.levels || [])
      .filter((level: any) => level.is_active)
      .map((level: any) => `L${level.level_no}: ${Number(level.percentage)}%`)
      .join(', ') || 'No active levels';
  }
}
