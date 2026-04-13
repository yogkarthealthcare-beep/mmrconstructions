import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
@Component({ selector: 'app-footer', standalone: true, imports: [RouterLink, CommonModule], templateUrl: './footer.component.html' })
export class FooterComponent {
  scrollTo(id: string) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
}
