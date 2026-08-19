import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService, SiteLanguage } from '../../services/language.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {
  readonly languageService = inject(LanguageService);

  onLanguageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select && select.value) {
      this.languageService.setLanguage(select.value as SiteLanguage);
    }
  }
}
