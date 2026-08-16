import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiBase = environment.apiBaseUrl || '';
  private visitorId: string = '';
  private sessionId: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initVisitorInfo();
      this.initAutoPageTracking();
    }
  }

  private initVisitorInfo() {
    try {
      let storedId = localStorage.getItem('mmr_visitor_id');
      if (!storedId) {
        storedId = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('mmr_visitor_id', storedId);
      }
      this.visitorId = storedId;
      this.sessionId = 's_' + Math.random().toString(36).substring(2, 10);
    } catch {
      this.visitorId = 'anon_' + Date.now();
      this.sessionId = 's_anon';
    }
  }

  private initAutoPageTracking() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.trackPageView(event.urlAfterRedirects || event.url);
    });
  }

  public trackPageView(url: string, title?: string, siteId?: number, plotId?: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    const payload = {
      event_name: 'page_view',
      page_url: url,
      page_title: title || document.title,
      site_id: siteId || null,
      plot_id: plotId || null,
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      browser: this.getBrowser(),
      referrer: document.referrer || '',
      utm_source: this.getUtmSource()
    };
    this.sendEvent(payload);
  }

  public trackEvent(eventName: string, data: any = {}) {
    if (!isPlatformBrowser(this.platformId)) return;
    const payload = {
      event_name: eventName,
      page_url: this.router.url,
      page_title: document.title,
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      browser: this.getBrowser(),
      ...data
    };
    this.sendEvent(payload);
  }

  private sendEvent(payload: any) {
    this.http.post(`${this.apiBase}/api/analytics/track`, payload).subscribe({
      next: () => {},
      error: () => {} // Non-blocking fail-safe
    });
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'Desktop';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  private getBrowser(): string {
    if (typeof window === 'undefined') return 'Browser';
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    return 'Other';
  }

  private getUtmSource(): string {
    if (typeof window === 'undefined') return 'Direct';
    const urlParams = new URLSearchParams(window.location.search);
    const utm = urlParams.get('utm_source');
    if (utm) return utm;
    const ref = document.referrer;
    if (ref.includes('google')) return 'Google Search';
    if (ref.includes('facebook')) return 'Facebook';
    if (ref.includes('instagram')) return 'Instagram';
    if (ref.includes('youtube')) return 'YouTube';
    if (ref) return 'Referral';
    return 'Direct';
  }
}
