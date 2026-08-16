import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-wallet',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './investor-wallet.component.html',
  styleUrls: ['./investor-wallet.component.css']
})
export class InvestorWalletComponent implements OnInit {
  wallet: any;
  loading = true;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getInvestorWallet().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.wallet = res.success ? res.data : null;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to load wallet.';
      }
    });
  }
}
