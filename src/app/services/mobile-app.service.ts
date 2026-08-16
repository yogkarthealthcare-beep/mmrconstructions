import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { ApiService } from './api.service';

export type MobileAppHeaderInfo = {
  platform: string;
  app_name: string;
  app_logo_url: string | null;
  play_store_url: string | null;
  apk_download_url: string | null;
  download_url: string | null;
  download_mode: 'apk' | 'play_store';
  package_name: string | null;
  current_version: string | null;
  latest_version: string | null;
  version_code: string | null;
  release_notes: string | null;
  apk_file_name: string | null;
  apk_file_size_bytes: number | null;
  apk_uploaded_at: string | null;
  release_date: string | null;
  description: string | null;
  button_text: string;
  badge_text: string;
  is_enabled: boolean;
  is_coming_soon: boolean;
  force_download: boolean;
  open_target: '_blank' | '_self';
  display_order: number;
};

@Injectable({ providedIn: 'root' })
export class MobileAppService {
  private cachedInfo$?: Observable<MobileAppHeaderInfo | null>;

  constructor(private api: ApiService) {}

  getHeaderInfo(forceRefresh = false): Observable<MobileAppHeaderInfo | null> {
    if (!this.cachedInfo$ || forceRefresh) {
      this.cachedInfo$ = this.api.getMobileAppInfo().pipe(
        map((res: any) => res?.data || null),
        catchError((error) => {
          console.warn('[Mobile App Header] Unable to load settings', error);
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.cachedInfo$;
  }
}
