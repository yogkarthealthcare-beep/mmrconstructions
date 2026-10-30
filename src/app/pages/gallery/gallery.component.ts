import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { LightboxModalComponent } from '../../shared/components/lightbox-modal/lightbox-modal.component';
import { GalleryService, GalleryItem } from '../../services/gallery.service';

@Component({
  selector: 'app-public-gallery',
  standalone: true,
  imports: [CommonModule, RouterLink, TopbarComponent, NavbarComponent, FooterComponent, LightboxModalComponent],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.css']
})
export class PublicGalleryComponent implements OnInit {
  private galleryService = inject(GalleryService);

  activeFilter: 'all' | 'image' | 'video' | 'youtube' = 'all';
  items: GalleryItem[] = [];
  totalItems = 0;

  currentPage = 1;
  pageSize = 12;
  hasMore = false;

  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';

  // Lightbox State
  lightboxOpen = false;
  activeLightboxItem: GalleryItem | null = null;
  activeLightboxIndex = 0;

  ngOnInit(): void {
    this.loadInitial();
  }

  setFilter(filter: 'all' | 'image' | 'video' | 'youtube'): void {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    this.currentPage = 1;
    this.items = [];
    this.loadInitial();
  }

  loadInitial(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.currentPage = 1;

    this.galleryService.getPublicGallery(this.activeFilter, this.currentPage, this.pageSize).subscribe({
      next: res => {
        this.isLoading = false;
        this.items = res.items || [];
        this.totalItems = res.pagination?.total || this.items.length;
        this.hasMore = !!res.pagination?.hasMore;
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Unable to load media gallery. Please check your internet connection.';
      }
    });
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasMore) return;
    this.isLoadingMore = true;
    this.currentPage++;

    this.galleryService.getPublicGallery(this.activeFilter, this.currentPage, this.pageSize).subscribe({
      next: res => {
        this.isLoadingMore = false;
        const newItems = res.items || [];
        this.items = [...this.items, ...newItems];
        this.hasMore = !!res.pagination?.hasMore;
      },
      error: () => {
        this.isLoadingMore = false;
        this.currentPage--; // Revert page on failure
      }
    });
  }

  getThumbnail(item?: GalleryItem | null): string {
    if (!item) return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75';
    if (item.thumbnail_url) return this.galleryService.resolveUrl(item.thumbnail_url);
    if (item.type === 'youtube' && item.youtube_id) {
      return `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`;
    }
    if (item.type === 'image' && item.url) {
      return this.galleryService.resolveUrl(item.url);
    }
    return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75';
  }

  onThumbError(event: Event): void {
    (event.target as HTMLImageElement).src =
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75';
  }

  openItem(item: GalleryItem, index: number): void {
    this.activeLightboxIndex = index;
    this.activeLightboxItem = {
      ...item,
      url: this.galleryService.resolveUrl(item.url),
      thumbnail_url: item.thumbnail_url ? this.galleryService.resolveUrl(item.thumbnail_url) : null
    };
    this.lightboxOpen = true;
  }

  navigateLightbox(direction: number): void {
    const nextIdx = this.activeLightboxIndex + direction;
    if (nextIdx >= 0 && nextIdx < this.items.length) {
      this.openItem(this.items[nextIdx], nextIdx);
    }
  }
}

