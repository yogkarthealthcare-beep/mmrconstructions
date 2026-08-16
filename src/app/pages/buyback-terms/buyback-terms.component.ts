import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SeoService } from '../../services/seo.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-buyback-terms',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './buyback-terms.component.html',
  styleUrls: ['./buyback-terms.component.css'],
})
export class BuybackTermsComponent implements OnInit {
  loading = true;
  error = '';
  terms: any = null;

  constructor(private api: ApiService, private seo: SeoService) {}

  ngOnInit() {
    this.seo.set({
      title: 'Buyback Terms & Conditions | MMR Constructions',
      description: 'Read the current Buyback Guarantee Terms & Conditions published by MMR Constructions.',
      canonical: 'https://mmrconstructions.in/buyback',
    });

    this.api.getBuybackTerms().subscribe({
      next: (res: any) => {
        this.terms = res?.data || null;
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Buyback Terms & Conditions could not be loaded.';
        this.loading = false;
      },
    });
  }
}
