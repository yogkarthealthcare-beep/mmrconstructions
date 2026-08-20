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
   * Checks localStorage first. If no stored value exists, uses dbValue if provided, defaulting to true.
   */
  isSiteInteractive(siteId: number | string | undefined | null, dbValue?: boolean): boolean {
    if (!siteId) return dbValue !== undefined ? Boolean(dbValue) : true;
    try {
      const key = `mmr_site_toggle_${siteId}`;
      const stored = localStorage.getItem(key);
      if (stored === 'off') return false;
      if (stored === 'on') return true;
      if (dbValue !== undefined) return Boolean(dbValue);
      return true;
    } catch {
      return dbValue !== undefined ? Boolean(dbValue) : true;
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
   * Synchronizes API/DB site toggle state into local storage and notifies subscribers.
   */
  syncSiteInteractive(siteId: number, dbValue: boolean): void {
    if (!siteId) return;
    try {
      const key = `mmr_site_toggle_${siteId}`;
      localStorage.setItem(key, dbValue ? 'on' : 'off');
      this.toggleSubject.next({ siteId, enabled: dbValue });
    } catch (e) {
      console.error('Error syncing site interactive toggle:', e);
    }
  }

  private masterToggleSubject = new BehaviorSubject<boolean>(this.isMasterPropertyPlotEnabled());
  public masterToggleState$: Observable<boolean> = this.masterToggleSubject.asObservable();

  /**
   * Master toggle for Admin Property & Plot tools menu items
   */
  isMasterPropertyPlotEnabled(): boolean {
    try {
      const stored = localStorage.getItem('mmr_master_property_plot');
      if (stored === 'off') return false;
      return true;
    } catch {
      return true;
    }
  }

  setMasterPropertyPlotEnabled(enabled: boolean): void {
    try {
      localStorage.setItem('mmr_master_property_plot', enabled ? 'on' : 'off');
      this.masterToggleSubject.next(enabled);
    } catch (e) {
      console.error('Error setting master property plot toggle:', e);
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
