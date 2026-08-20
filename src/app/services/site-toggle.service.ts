import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SiteToggleEvent {
  siteId: number;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SiteToggleService {
  private toggleSubject = new BehaviorSubject<SiteToggleEvent>({ siteId: 0, enabled: true });
  public toggleState$: Observable<SiteToggleEvent> = this.toggleSubject.asObservable();

  private activeSiteIdSubject = new BehaviorSubject<number | null>(null);
  public activeSiteId$: Observable<number | null> = this.activeSiteIdSubject.asObservable();

  constructor() {}

  /**
   * Checks if interactive plot mode is enabled for a given site.
   * Default is true (ON) unless explicitly set to 'off' in localStorage.
   */
  isSiteInteractive(siteId: number | string | undefined | null): boolean {
    if (!siteId) return true;
    try {
      const key = `mmr_site_toggle_${siteId}`;
      const stored = localStorage.getItem(key);
      if (stored === 'off') return false;
      return true;
    } catch {
      return true;
    }
  }

  setSiteInteractive(siteId: number, enabled: boolean): void {
    if (!siteId) return;
    try {
      const key = `mmr_site_toggle_${siteId}`;
      localStorage.setItem(key, enabled ? 'on' : 'off');
      this.toggleSubject.next({ siteId, enabled });
    } catch (e) {
      console.error('Error setting site interactive toggle:', e);
    }
  }

  /**
   * Sets current active site context for global UI listeners.
   */
  setActiveSiteId(siteId: number | null): void {
    this.activeSiteIdSubject.next(siteId);
  }

  getActiveSiteId(): number | null {
    return this.activeSiteIdSubject.value;
  }
}
