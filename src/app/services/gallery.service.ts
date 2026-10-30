import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface GalleryItem {
  id: number;
  type: 'image' | 'youtube' | 'video';
  title?: string | null;
  url: string;
  storage_path?: string | null;
  thumbnail_url?: string | null;
  thumbnail_storage_path?: string | null;
  youtube_id?: string | null;
  show_in_advertisement: boolean;
  is_active: boolean;
  sort_order: number;
  start_date?: string | null;
  end_date?: string | null;
  cta_link?: string | null;
  cta_label?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GalleryResponse {
  items: GalleryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private http = inject(HttpClient);
  private baseUrl = (environment.apiBaseUrl || 'https://api.mmrconstructions.in').replace(/\/$/, '');

  private getAuthHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_token') : null;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * Helper to resolve relative media URLs (/uploads/...) to full API URL
   */
  resolveUrl(pathOrUrl?: string | null): string {
    if (!pathOrUrl) return '';
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const clean = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${this.baseUrl}${clean}`;
  }

  /**
   * Extract YouTube ID supporting watch?v=, youtu.be/, /shorts/, /embed/
   */
  extractYouTubeId(urlStr?: string | null): string | null {
    if (!urlStr || typeof urlStr !== 'string') return null;
    const trimmed = urlStr.trim();

    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const hostname = parsed.hostname.toLowerCase();

      const validHost =
        hostname === 'youtube.com' ||
        hostname === 'www.youtube.com' ||
        hostname === 'm.youtube.com' ||
        hostname === 'youtu.be' ||
        hostname === 'youtube-nocookie.com' ||
        hostname === 'www.youtube-nocookie.com';

      if (!validHost) return null;

      if (hostname === 'youtu.be') {
        const id = parsed.pathname.slice(1).split('/')[0].split('?')[0];
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }

      if (parsed.pathname.includes('/shorts/')) {
        const parts = parsed.pathname.split('/shorts/');
        if (parts[1]) {
          const id = parts[1].split('/')[0].split('?')[0];
          return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }
      }

      if (parsed.pathname.includes('/embed/')) {
        const parts = parsed.pathname.split('/embed/');
        if (parts[1]) {
          const id = parts[1].split('/')[0].split('?')[0];
          return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
        }
      }

      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Auto-fetch title via YouTube oEmbed
   */
  fetchYouTubeTitle(youtubeUrl: string): Observable<string | null> {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
    return this.http.get<{ title?: string }>(oembedUrl).pipe(
      map(res => res?.title || null),
      catchError(() => of(null))
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────

  getPublicGallery(type?: string, page = 1, limit = 12): Observable<GalleryResponse> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (type && type !== 'all') {
      params = params.set('type', type);
    }
    return this.http.get<{ success: boolean; data: GalleryResponse }>(`${this.baseUrl}/api/gallery`, { params }).pipe(
      map(res => res.data)
    );
  }

  getActiveAdvertisements(): Observable<GalleryItem[]> {
    return this.http.get<{ success: boolean; data: GalleryItem[] }>(`${this.baseUrl}/api/gallery/advertisements`).pipe(
      map(res => res.data || [])
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Admin Methods
  // ─────────────────────────────────────────────────────────────

  getAdminGallery(filters?: { type?: string; q?: string; adsOnly?: boolean }): Observable<GalleryItem[]> {
    let params = new HttpParams();
    if (filters?.type && filters.type !== 'all') {
      params = params.set('type', filters.type);
    }
    if (filters?.q) {
      params = params.set('q', filters.q);
    }
    if (filters?.adsOnly) {
      params = params.set('adsOnly', 'true');
    }

    return this.http.get<{ success: boolean; data: GalleryItem[] }>(`${this.baseUrl}/api/admin/gallery`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      map(res => res.data || [])
    );
  }

  getAdminGalleryItem(id: number): Observable<GalleryItem> {
    return this.http.get<{ success: boolean; data: GalleryItem }>(`${this.baseUrl}/api/admin/gallery/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => res.data)
    );
  }

  createItem(formData: FormData): Observable<HttpEvent<any>> {
    const req = new HttpRequest('POST', `${this.baseUrl}/api/admin/gallery`, formData, {
      reportProgress: true,
      responseType: 'json',
      headers: this.getAuthHeaders()
    });
    return this.http.request(req);
  }

  updateItem(id: number, formData: FormData): Observable<HttpEvent<any>> {
    const req = new HttpRequest('PUT', `${this.baseUrl}/api/admin/gallery/${id}`, formData, {
      reportProgress: true,
      responseType: 'json',
      headers: this.getAuthHeaders()
    });
    return this.http.request(req);
  }

  deleteItem(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/admin/gallery/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  toggleAdvertisement(id: number, data: Partial<GalleryItem>): Observable<GalleryItem> {
    return this.http.patch<{ success: boolean; data: GalleryItem }>(
      `${this.baseUrl}/api/admin/gallery/${id}/advertisement`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(res => res.data)
    );
  }

  reorderAdvertisements(orders: { id: number; sortOrder: number }[]): Observable<any> {
    return this.http.patch(`${this.baseUrl}/api/admin/gallery/reorder-ads`, { orders }, {
      headers: this.getAuthHeaders()
    });
  }
}

