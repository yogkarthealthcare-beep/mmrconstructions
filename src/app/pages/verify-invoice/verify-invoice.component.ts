import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-verify-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-invoice.component.html',
  styleUrls: ['./verify-invoice.component.css']
})
export class VerifyInvoiceComponent implements OnInit {
  invoiceNumber = '';
  loading = false;
  searched = false;
  verificationResult: any = null;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['number']) {
        this.invoiceNumber = params['number'];
        this.verifyInvoice();
      }
    });
  }

  verifyInvoice() {
    if (!this.invoiceNumber || !this.invoiceNumber.trim()) return;
    this.loading = true;
    this.searched = true;
    this.verificationResult = null;

    const num = this.invoiceNumber.trim();
    this.api.get(`/api/verify-invoice/${num}`).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data && res.data.valid) {
          this.verificationResult = res.data;
        } else {
          this.verificationResult = { valid: false, message: res?.message || 'Invoice Not Found' };
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.verificationResult = { valid: false, message: err?.error?.message || 'Invoice Not Found or Invalid' };
      }
    });
  }
}
