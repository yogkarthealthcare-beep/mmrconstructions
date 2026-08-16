import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-associate-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './associate-detail.component.html',
  styleUrls: ['./associate-detail.component.css']
})
export class AssociateDetailComponent implements OnInit {
  loading = true;
  data: any = {};
  tab = 'profile';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.adminGetAssociate(id).subscribe({
      next: (res: any) => { this.data = res?.data || {}; this.loading = false; },
      error: () => this.loading = false
    });
  }
}
