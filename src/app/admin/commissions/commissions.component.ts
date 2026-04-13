import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-commissions', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './commissions.component.html' })
export class CommissionsComponent implements OnInit {
  loading = true; commissions: any[] = []; toast = '';
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.api.adminGetPendingComm().subscribe({
      next: (res: any) => { if (res.success) this.commissions = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  approve(c: any) {
    this.api.adminApproveComm(c.commission_id, '').subscribe({
      next: (res: any) => { if (res.success) { c.commission_status = 'Paid'; this.showToast('Commission approved!'); } }
    });
  }
  showToast(msg: string) { this.toast = msg; setTimeout(() => this.toast = '', 3000); }
}
