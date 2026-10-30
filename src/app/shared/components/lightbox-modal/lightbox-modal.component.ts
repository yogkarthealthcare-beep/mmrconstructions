import { Component, Input, Output, EventEmitter, HostListener, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GalleryItem } from '../../../services/gallery.service';

@Component({
  selector: 'app-lightbox-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lightbox-overlay" *ngIf="isOpen" (click)="onBackdropClick($event)" role="dialog" aria-modal="true" [attr.aria-label]="item?.title || 'Media Viewer'">
      <div class="lightbox-container" (click)="$event.stopPropagation()">
        <!-- Close Button -->
        <button type="button" class="btn-close-lightbox" (click)="close()" aria-label="Close media viewer">
          <i class="fas fa-times"></i>
        </button>

        <!-- Navigation Arrows (for Images) -->
        <button
          *ngIf="showNavigation && hasPrev"
          type="button"
          class="lightbox-nav-btn prev"
          (click)="prev.emit()"
          aria-label="Previous item">
          <i class="fas fa-chevron-left"></i>
        </button>

        <button
          *ngIf="showNavigation && hasNext"
          type="button"
          class="lightbox-nav-btn next"
          (click)="next.emit()"
          aria-label="Next item">
          <i class="fas fa-chevron-right"></i>
        </button>

        <!-- Media Stage -->
        <div class="lightbox-content">
          <!-- IMAGE -->
          <ng-container *ngIf="item?.type === 'image'">
            <div class="image-wrapper">
              <img [src]="resolvedUrl" [alt]="item?.title || 'Gallery image'" class="lightbox-img" />
            </div>
          </ng-container>

          <!-- YOUTUBE -->
          <ng-container *ngIf="item?.type === 'youtube' && safeYouTubeUrl">
            <div class="video-ratio-box">
              <iframe
                [src]="safeYouTubeUrl"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
              </iframe>
            </div>
          </ng-container>

          <!-- UPLOADED VIDEO -->
          <ng-container *ngIf="item?.type === 'video'">
            <div class="video-ratio-box">
              <video
                controls
                autoplay
                playsinline
                [src]="resolvedUrl"
                class="lightbox-video">
                Your browser does not support the video tag.
              </video>
            </div>
          </ng-container>

          <!-- Caption & Details -->
          <div class="lightbox-caption" *ngIf="item?.title || item?.cta_link">
            <div class="caption-text">{{ item?.title }}</div>
            <a
              *ngIf="item?.cta_link"
              [href]="item?.cta_link"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-lightbox-cta">
              {{ item?.cta_label || 'Learn More' }} <i class="fas fa-external-link-alt ms-1"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(10, 25, 20, 0.95);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .lightbox-container {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .btn-close-lightbox {
      position: absolute;
      top: -45px;
      right: 0;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #fff;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
    }
    .btn-close-lightbox:hover {
      background: #c9a84c;
      color: #0b2e23;
      transform: scale(1.08);
    }
    .lightbox-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 10;
    }
    .lightbox-nav-btn:hover {
      background: #10b981;
      color: #fff;
      border-color: #10b981;
    }
    .lightbox-nav-btn.prev {
      left: -60px;
    }
    .lightbox-nav-btn.next {
      right: -60px;
    }
    @media (max-width: 768px) {
      .lightbox-nav-btn.prev { left: 10px; }
      .lightbox-nav-btn.next { right: 10px; }
    }
    .lightbox-content {
      position: relative;
      max-width: 1000px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .image-wrapper {
      max-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox-img {
      max-width: 100%;
      max-height: 75vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .video-ratio-box {
      width: 80vw;
      max-width: 900px;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }
    .video-ratio-box iframe,
    .video-ratio-box video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .lightbox-caption {
      margin-top: 12px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      padding: 8px 16px;
      border-radius: 6px;
    }
    .caption-text {
      font-size: 0.95rem;
      font-weight: 500;
      color: #f1f5f9;
    }
    .btn-lightbox-cta {
      background: #c9a84c;
      color: #0b2e23;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-lightbox-cta:hover {
      background: #dfbc5e;
      color: #000;
    }
  `]
})
export class LightboxModalComponent implements OnChanges {
  private sanitizer = inject(DomSanitizer);

  @Input() isOpen = false;
  @Input() item: GalleryItem | null = null;
  @Input() showNavigation = false;
  @Input() hasPrev = false;
  @Input() hasNext = false;

  @Output() closeEvent = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  safeYouTubeUrl: SafeResourceUrl | null = null;
  resolvedUrl = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] || changes['isOpen']) {
      if (this.isOpen && this.item) {
        this.updateUrls();
      } else {
        // Destroy URLs to stop video immediately
        this.safeYouTubeUrl = null;
        this.resolvedUrl = '';
      }
    }
  }

  private updateUrls(): void {
    if (!this.item) return;

    if (this.item.type === 'youtube') {
      const ytId = this.item.youtube_id || this.extractIdFromUrl(this.item.url);
      if (ytId) {
        // Autoplay embed, muted optional, controls visible
        const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
        this.safeYouTubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      }
    } else {
      this.resolvedUrl = this.item.url;
    }
  }

  private extractIdFromUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:watch\?v=|youtu\.be\/|embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  @HostListener('window:keydown.arrowleft')
  onArrowLeft(): void {
    if (this.isOpen && this.showNavigation && this.hasPrev) {
      this.prev.emit();
    }
  }

  @HostListener('window:keydown.arrowright')
  onArrowRight(): void {
    if (this.isOpen && this.showNavigation && this.hasNext) {
      this.next.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('lightbox-overlay')) {
      this.close();
    }
  }

  close(): void {
    this.safeYouTubeUrl = null;
    this.resolvedUrl = '';
    this.closeEvent.emit();
  }
}

