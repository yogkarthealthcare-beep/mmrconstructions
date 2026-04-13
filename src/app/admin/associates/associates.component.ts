import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-associates', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './associates.component.html' })
export class AssociatesComponent implements OnInit {
  loading = true; search = '';
  associates: any[] = []; total = 0;
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.api.adminGetUsers({ user_type: 'Associate', search: this.search || null }).subscribe({
      next: (res: any) => { if (res.success) { this.associates = res.data.users || []; this.total = res.data.total || 0; } this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
