import { Component, OnInit, OnDestroy, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GalleryService, GalleryItem } from '../../../services/gallery.service';
import { LightboxModalComponent } from '../lightbox-modal/lightbox-modal.component';

@Component({
  selector: 'app-home-ad-banner',
  standalone: true,
  imports: [CommonModule, LightboxModalComponent],
  templateUrl: './home-ad-banner.component.html',
  styleUrls: ['./home-ad-banner.component.css']
})
export class HomeAdBannerComponent implements OnInit, OnDestroy {
  private galleryService = inject(GalleryService);
  private sanitizer = inject(DomSanitizer);

  // Hidden by default, no flicker during load
  isLoading = true;
  ads: GalleryItem[] = [];
  displayedAds: GalleryItem[] = [];
  currentIndex = 0;
  private intervalTimer: any = null;
  private isPaused = false;

  // Cached YouTube SafeResourceUrls
  private ytEmbedCache = new Map<string, SafeResourceUrl>();

  // Lightbox
  showLightbox = false;
  activeLightboxAd: GalleryItem | null = null;

  // Host element is completely hidden (0px) when loading or when no active ads exist
  @HostBinding('style.display')
  get hostDisplay(): string {
    return !this.isLoading && this.displayedAds.length > 0 ? 'block' : 'none';
  }

  @HostBinding('style.margin')
  get hostMargin(): string {
    return !this.isLoading && this.displayedAds.length > 0 ? '' : '0';
  }

  @HostBinding('style.padding')
  get hostPadding(): string {
    return !this.isLoading && this.displayedAds.length > 0 ? '' : '0';
  }

  ngOnInit(): void {
    this.loadAds();
  }

  ngOnDestroy(): void {
    this.stopAutoRotate();
  }

  loadAds(): void {
    this.isLoading = true;
    this.galleryService.getActiveAdvertisements().subscribe({
      next: items => {
        // Strict client-side validation of active status and date bounds
        const now = Date.now();
        const validAds = (items || []).filter(item => {
          if (!item.show_in_advertisement || !item.is_active) return false;
          if (item.start_date && new Date(item.start_date).getTime() > now) return false;
          if (item.end_date && new Date(item.end_date).getTime() < now) return false;
          return true;
        });

        this.ads = validAds;
        // Max 3 active ads for the banner carousel
        this.displayedAds = validAds.slice(0, 3);
        this.isLoading = false;

        if (this.displayedAds.length > 1) {
          this.startAutoRotate();
        }
      },
      error: err => {
        // Silently log error, do not show any error alert to the visitor
        console.warn('[HomeAdBanner] Unable to fetch active advertisements:', err);
        this.ads = [];
        this.displayedAds = [];
        this.isLoading = false;
      }
    });
  }

  startAutoRotate(): void {
    this.stopAutoRotate();
    this.intervalTimer = setInterval(() => {
      if (!this.isPaused && this.displayedAds.length > 1) {
        this.nextSlide();
      }
    }, 5000);
  }

  stopAutoRotate(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  pauseSlider(): void {
    this.isPaused = true;
  }

  resumeSlider(): void {
    this.isPaused = false;
  }

  nextSlide(): void {
    if (this.displayedAds.length <= 1) return;
    this.currentIndex = (this.currentIndex + 1) % this.displayedAds.length;
  }

  prevSlide(): void {
    if (this.displayedAds.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.displayedAds.length) % this.displayedAds.length;
  }

  goToSlide(idx: number): void {
    this.currentIndex = idx;
  }

  resolveUrl(url?: string | null): string {
    return this.galleryService.resolveUrl(url);
  }

  getThumbnail(ad?: GalleryItem | null): string {
    if (!ad) return '';
    if (ad.thumbnail_url) return this.galleryService.resolveUrl(ad.thumbnail_url);
    if (ad.type === 'youtube' && ad.youtube_id) {
      return `https://img.youtube.com/vi/${ad.youtube_id}/hqdefault.jpg`;
    }
    return this.galleryService.resolveUrl(ad.url);
  }

  getYouTubeEmbedUrl(ad: GalleryItem): SafeResourceUrl | null {
    const id = ad.youtube_id || this.galleryService.extractYouTubeId(ad.url);
    if (!id) return null;

    if (this.ytEmbedCache.has(id)) {
      return this.ytEmbedCache.get(id)!;
    }

    // Embed autoplay muted loop playsinline
    const url = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&modestbranding=1&enablejsapi=1`;
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.ytEmbedCache.set(id, safe);
    return safe;
  }

  openLightbox(ad: GalleryItem): void {
    this.activeLightboxAd = {
      ...ad,
      url: this.resolveUrl(ad.url),
      thumbnail_url: ad.thumbnail_url ? this.resolveUrl(ad.thumbnail_url) : null
    };
    this.showLightbox = true;
  }
}
