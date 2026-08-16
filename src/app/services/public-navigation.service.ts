import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PublicNavigationService {
  constructor(private router: Router) {}

  goHome(): Promise<boolean> {
    return this.router.navigateByUrl('/').then((navigated) => {
      this.scrollWhenReady('home');
      return navigated;
    });
  }

  goToSection(sectionId: string): Promise<boolean> {
    return this.router.navigate(['/'], { fragment: sectionId }).then((navigated) => {
      this.scrollWhenReady(sectionId);
      return navigated;
    });
  }

  viewAllSites(): Promise<boolean> {
    return this.router.navigate(['/'], {
      queryParams: { showAllSites: 'true' },
      fragment: 'sites',
    }).then((navigated) => {
      this.scrollWhenReady('sites');
      return navigated;
    });
  }

  private scrollWhenReady(id: string, attempts = 20): void {
    const scroll = (remaining: number) => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (id === 'home' && remaining <= 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (remaining > 0) {
        window.setTimeout(() => scroll(remaining - 1), 50);
      }
    };

    window.setTimeout(() => scroll(attempts), 0);
  }
}
