import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { GalleryService, GalleryItem } from '../../services/gallery.service';
import { LightboxModalComponent } from '../../shared/components/lightbox-modal/lightbox-modal.component';

@Component({
  selector: 'app-admin-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, LightboxModalComponent],
  templateUrl: './admin-gallery.component.html',
  styleUrls: ['./admin-gallery.component.css']
})
export class AdminGalleryComponent implements OnInit {
  private galleryService = inject(GalleryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  activeTab: 'gallery' | 'advertisement' = 'gallery';
  uploadMode: 'image' | 'youtube' | 'video' = 'image';

  allItems: GalleryItem[] = [];
  filteredItems: GalleryItem[] = [];
  adItems: GalleryItem[] = [];

  isLoading = false;
  isUploading = false;
  uploadProgress = 0;
  fetchingYtTitle = false;

  filterType: 'all' | 'image' | 'youtube' | 'video' = 'all';
  searchQuery = '';

  // Alerts
  alertMessage = '';
  alertType: 'success' | 'danger' | 'warning' = 'success';

  // Add Image Form
  imageForm = {
    title: '',
    showInAdvertisement: false,
    ctaLink: '',
    ctaLabel: ''
  };
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  // Add YouTube Form
  youtubeForm = {
    url: '',
    title: '',
    extractedId: '',
    showInAdvertisement: false,
    ctaLink: '',
    ctaLabel: ''
  };

  // Add Video Form
  videoForm = {
    title: '',
    showInAdvertisement: false,
    ctaLink: '',
    ctaLabel: ''
  };
  selectedVideoFile: File | null = null;
  selectedVideoThumbFile: File | null = null;

  // Edit Modal State
  showEditModal = false;
  editingItem: GalleryItem | null = null;
  editForm = {
    type: 'image' as 'image' | 'youtube' | 'video',
    title: '',
    url: '',
    showInAdvertisement: false,
    isActive: true,
    sortOrder: 0,
    startDate: '',
    endDate: '',
    ctaLink: '',
    ctaLabel: ''
  };
  editReplacementFile: File | null = null;
  editReplacementThumb: File | null = null;
  editPreviewUrl: string | null = null;
  isSavingEdit = false;

  // Delete Modal State
  showDeleteModal = false;
  itemToDelete: GalleryItem | null = null;
  isDeleting = false;

  // Ad Reorder & Picker State
  showPickerModal = false;
  isAdOrderChanged = false;

  // Lightbox Preview
  showLightbox = false;
  lightboxItem: GalleryItem | null = null;

  ngOnInit(): void {
    // Detect tab from URL or query parameters
    this.route.url.subscribe(segments => {
      const path = segments.map(s => s.path).join('/');
      if (path.includes('advertisement')) {
        this.activeTab = 'advertisement';
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'advertisement') {
        this.activeTab = 'advertisement';
      }
    });

    this.loadAllItems();
  }

  switchTab(tab: 'gallery' | 'advertisement'): void {
    this.activeTab = tab;
  }

  loadAllItems(): void {
    this.isLoading = true;
    this.galleryService.getAdminGallery().subscribe({
      next: items => {
        this.isLoading = false;
        this.allItems = items || [];
        this.applyFilters();
        this.refreshAdItems();
      },
      error: err => {
        this.isLoading = false;
        this.showAlert(err?.error?.message || 'Failed to load gallery items.', 'danger');
      }
    });
  }

  applyFilters(): void {
    let result = [...this.allItems];

    if (this.filterType !== 'all') {
      result = result.filter(i => i.type === this.filterType);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(i =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.url && i.url.toLowerCase().includes(q))
      );
    }

    this.filteredItems = result;
  }

  refreshAdItems(): void {
    this.adItems = this.allItems
      .filter(i => i.show_in_advertisement)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    this.isAdOrderChanged = false;
  }

  setFilterType(type: 'all' | 'image' | 'youtube' | 'video'): void {
    this.filterType = type;
    this.applyFilters();
  }

  onSearchChanged(): void {
    this.applyFilters();
  }

  countByType(type: 'image' | 'youtube' | 'video'): number {
    return this.allItems.filter(i => i.type === type).length;
  }

  getThumbnail(item?: GalleryItem | null): string {
    if (!item) return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=70';
    if (item.thumbnail_url) return this.galleryService.resolveUrl(item.thumbnail_url);
    if (item.type === 'youtube' && item.youtube_id) {
      return `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg`;
    }
    if (item.type === 'image' && item.url) {
      return this.galleryService.resolveUrl(item.url);
    }
    return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=70';
  }

  onThumbError(event: Event): void {
    (event.target as HTMLImageElement).src =
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=70';
  }

  openPreview(item: GalleryItem): void {
    this.lightboxItem = {
      ...item,
      url: this.galleryService.resolveUrl(item.url),
      thumbnail_url: item.thumbnail_url ? this.galleryService.resolveUrl(item.thumbnail_url) : null
    };
    this.showLightbox = true;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. ADD IMAGE
  // ─────────────────────────────────────────────────────────────

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      const valid = ['image/jpeg', 'image/png', 'image/webp'];
      if (!valid.includes(file.type)) {
        this.showAlert('Please upload a valid JPG, PNG, or WEBP image file.', 'danger');
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.showAlert('Image size exceeds 5 MB limit.', 'danger');
        input.value = '';
        return;
      }

      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  submitAddImage(): void {
    if (!this.selectedImageFile) {
      this.showAlert('Please select an image file to upload.', 'warning');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const fd = new FormData();
    fd.append('type', 'image');
    fd.append('title', this.imageForm.title.trim());
    fd.append('file', this.selectedImageFile);
    fd.append('showInAdvertisement', String(this.imageForm.showInAdvertisement));
    if (this.imageForm.ctaLink) fd.append('ctaLink', this.imageForm.ctaLink.trim());
    if (this.imageForm.ctaLabel) fd.append('ctaLabel', this.imageForm.ctaLabel.trim());

    this.galleryService.createItem(fd).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.showAlert('Image successfully uploaded and added to gallery!', 'success');
          this.resetImageForm();
          this.loadAllItems();
        }
      },
      error: err => {
        this.isUploading = false;
        this.showAlert(err?.error?.message || 'Failed to upload image.', 'danger');
      }
    });
  }

  resetImageForm(): void {
    this.imageForm = {
      title: '',
      showInAdvertisement: false,
      ctaLink: '',
      ctaLabel: ''
    };
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ADD YOUTUBE
  // ─────────────────────────────────────────────────────────────

  onYouTubeUrlChanged(val: string): void {
    const id = this.galleryService.extractYouTubeId(val);
    this.youtubeForm.extractedId = id || '';
    if (id && !this.youtubeForm.title) {
      this.fetchTitleFromYouTube();
    }
  }

  fetchTitleFromYouTube(): void {
    if (!this.youtubeForm.url) return;
    this.fetchingYtTitle = true;
    this.galleryService.fetchYouTubeTitle(this.youtubeForm.url).subscribe(title => {
      this.fetchingYtTitle = false;
      if (title && !this.youtubeForm.title) {
        this.youtubeForm.title = title;
      }
    });
  }

  submitAddYouTube(): void {
    if (!this.youtubeForm.extractedId) {
      this.showAlert('Please provide a valid YouTube URL.', 'warning');
      return;
    }

    this.isUploading = true;
    const fd = new FormData();
    fd.append('type', 'youtube');
    fd.append('url', this.youtubeForm.url.trim());
    fd.append('title', this.youtubeForm.title.trim());
    fd.append('showInAdvertisement', String(this.youtubeForm.showInAdvertisement));
    if (this.youtubeForm.ctaLink) fd.append('ctaLink', this.youtubeForm.ctaLink.trim());
    if (this.youtubeForm.ctaLabel) fd.append('ctaLabel', this.youtubeForm.ctaLabel.trim());

    this.galleryService.createItem(fd).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.showAlert('YouTube video added to gallery successfully!', 'success');
          this.resetYouTubeForm();
          this.loadAllItems();
        }
      },
      error: err => {
        this.isUploading = false;
        this.showAlert(err?.error?.message || 'Failed to add YouTube video.', 'danger');
      }
    });
  }

  resetYouTubeForm(): void {
    this.youtubeForm = {
      url: '',
      title: '',
      extractedId: '',
      showInAdvertisement: false,
      ctaLink: '',
      ctaLabel: ''
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ADD VIDEO
  // ─────────────────────────────────────────────────────────────

  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      const valid = ['video/mp4', 'video/webm'];
      if (!valid.includes(file.type) && !file.name.match(/\.(mp4|webm)$/i)) {
        this.showAlert('Please select an MP4 or WEBM video file.', 'danger');
        input.value = '';
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        this.showAlert('Video file exceeds 100 MB limit.', 'danger');
        input.value = '';
        return;
      }
      this.selectedVideoFile = file;
    }
  }

  onVideoThumbSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.showAlert('Thumbnail poster exceeds 5 MB limit.', 'danger');
        input.value = '';
        return;
      }
      this.selectedVideoThumbFile = file;
    }
  }

  submitAddVideo(): void {
    if (!this.selectedVideoFile) {
      this.showAlert('Please select a video file to upload.', 'warning');
      return;
    }
    if (!this.videoForm.title.trim()) {
      this.showAlert('Title is required for video items.', 'warning');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const fd = new FormData();
    fd.append('type', 'video');
    fd.append('title', this.videoForm.title.trim());
    fd.append('file', this.selectedVideoFile);
    if (this.selectedVideoThumbFile) {
      fd.append('thumbnail', this.selectedVideoThumbFile);
    }
    fd.append('showInAdvertisement', String(this.videoForm.showInAdvertisement));
    if (this.videoForm.ctaLink) fd.append('ctaLink', this.videoForm.ctaLink.trim());
    if (this.videoForm.ctaLabel) fd.append('ctaLabel', this.videoForm.ctaLabel.trim());

    this.galleryService.createItem(fd).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.showAlert('Video uploaded and added to gallery successfully!', 'success');
          this.resetVideoForm();
          this.loadAllItems();
        }
      },
      error: err => {
        this.isUploading = false;
        this.showAlert(err?.error?.message || 'Failed to upload video.', 'danger');
      }
    });
  }

  resetVideoForm(): void {
    this.videoForm = {
      title: '',
      showInAdvertisement: false,
      ctaLink: '',
      ctaLabel: ''
    };
    this.selectedVideoFile = null;
    this.selectedVideoThumbFile = null;
    this.uploadProgress = 0;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. EDIT & FILE REPLACEMENT
  // ─────────────────────────────────────────────────────────────

  openEditModal(item: GalleryItem): void {
    this.editingItem = item;
    this.editReplacementFile = null;
    this.editReplacementThumb = null;
    this.editPreviewUrl = null;

    this.editForm = {
      type: item.type,
      title: item.title || '',
      url: item.url,
      showInAdvertisement: !!item.show_in_advertisement,
      isActive: item.is_active !== false,
      sortOrder: item.sort_order || 0,
      startDate: item.start_date ? item.start_date.substring(0, 10) : '',
      endDate: item.end_date ? item.end_date.substring(0, 10) : '',
      ctaLink: item.cta_link || '',
      ctaLabel: item.cta_label || ''
    };

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingItem = null;
    this.editReplacementFile = null;
    this.editReplacementThumb = null;
    this.editPreviewUrl = null;
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      this.editReplacementFile = file;

      if (this.editForm.type === 'image') {
        const reader = new FileReader();
        reader.onload = () => {
          this.editPreviewUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  onEditThumbSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      this.editReplacementThumb = input.files[0];
    }
  }

  onEditYouTubeUrlChanged(val: string): void {
    const id = this.galleryService.extractYouTubeId(val);
    if (id) {
      this.editPreviewUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
  }

  saveEditItem(): void {
    if (!this.editingItem) return;

    this.isSavingEdit = true;
    const fd = new FormData();
    fd.append('type', this.editForm.type);
    fd.append('title', this.editForm.title.trim());
    fd.append('showInAdvertisement', String(this.editForm.showInAdvertisement));
    fd.append('isActive', String(this.editForm.isActive));
    fd.append('sortOrder', String(this.editForm.sortOrder));

    if (this.editForm.type === 'youtube') {
      fd.append('url', this.editForm.url.trim());
    }

    if (this.editReplacementFile) {
      fd.append('file', this.editReplacementFile);
    }
    if (this.editReplacementThumb) {
      fd.append('thumbnail', this.editReplacementThumb);
    }

    if (this.editForm.startDate) fd.append('startDate', this.editForm.startDate);
    if (this.editForm.endDate) fd.append('endDate', this.editForm.endDate);
    if (this.editForm.ctaLink) fd.append('ctaLink', this.editForm.ctaLink.trim());
    if (this.editForm.ctaLabel) fd.append('ctaLabel', this.editForm.ctaLabel.trim());

    this.galleryService.updateItem(this.editingItem.id, fd).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.Response) {
          this.isSavingEdit = false;
          this.closeEditModal();
          this.showAlert('Gallery item updated successfully! Old storage files were safely replaced.', 'success');
          this.loadAllItems();
        }
      },
      error: err => {
        this.isSavingEdit = false;
        this.showAlert(err?.error?.message || 'Failed to update gallery item.', 'danger');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. DELETE & CLEANUP
  // ─────────────────────────────────────────────────────────────

  openDeleteModal(item: GalleryItem): void {
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  confirmDeleteItem(): void {
    if (!this.itemToDelete) return;

    this.isDeleting = true;
    this.galleryService.deleteItem(this.itemToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        this.showAlert(`Item "${this.itemToDelete?.title || 'Item'}" and associated files deleted.`, 'success');
        this.itemToDelete = null;
        this.loadAllItems();
      },
      error: err => {
        this.isDeleting = false;
        this.showAlert(err?.error?.message || 'Failed to delete gallery item.', 'danger');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. QUICK TOGGLES & AD MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  toggleActiveQuick(item: GalleryItem): void {
    const newStatus = !item.is_active;
    this.galleryService.toggleAdvertisement(item.id, { is_active: newStatus }).subscribe({
      next: updated => {
        item.is_active = updated.is_active;
        this.showAlert(`Status set to ${newStatus ? 'Active' : 'Disabled'}.`, 'success');
      },
      error: () => this.showAlert('Could not update status.', 'danger')
    });
  }

  toggleAdQuick(item: GalleryItem): void {
    const newAdStatus = !item.show_in_advertisement;
    this.galleryService.toggleAdvertisement(item.id, { show_in_advertisement: newAdStatus }).subscribe({
      next: updated => {
        item.show_in_advertisement = updated.show_in_advertisement;
        this.refreshAdItems();
        this.showAlert(`Advertisement status updated.`, 'success');
      },
      error: () => this.showAlert('Could not update advertisement status.', 'danger')
    });
  }

  removeFromAds(item: GalleryItem): void {
    this.galleryService.toggleAdvertisement(item.id, { show_in_advertisement: false }).subscribe({
      next: () => {
        item.show_in_advertisement = false;
        this.refreshAdItems();
        this.showAlert(`"${item.title || 'Item'}" removed from homepage advertisements.`, 'success');
      },
      error: () => this.showAlert('Could not remove item from advertisements.', 'danger')
    });
  }

  moveAd(index: number, direction: number): void {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= this.adItems.length) return;

    const temp = this.adItems[index];
    this.adItems[index] = this.adItems[targetIdx];
    this.adItems[targetIdx] = temp;

    this.adItems.forEach((ad, i) => (ad.sort_order = i + 1));
    this.isAdOrderChanged = true;
  }

  saveAdReordering(): void {
    const orders = this.adItems.map((ad, idx) => ({ id: ad.id, sortOrder: idx + 1 }));
    this.galleryService.reorderAdvertisements(orders).subscribe({
      next: () => {
        this.isAdOrderChanged = false;
        this.showAlert('Advertisement order sequence saved successfully!', 'success');
      },
      error: () => this.showAlert('Failed to save advertisement sequence.', 'danger')
    });
  }

  get eligibleAdCandidates(): GalleryItem[] {
    return this.allItems.filter(i => !i.show_in_advertisement);
  }

  openAddFromGalleryModal(): void {
    this.showPickerModal = true;
  }

  promoteToAd(item: GalleryItem): void {
    const nextOrder = this.adItems.length + 1;
    this.galleryService
      .toggleAdvertisement(item.id, { show_in_advertisement: true, sort_order: nextOrder })
      .subscribe({
        next: () => {
          item.show_in_advertisement = true;
          item.sort_order = nextOrder;
          this.refreshAdItems();
          this.showAlert(`"${item.title || 'Item'}" promoted to homepage advertisements!`, 'success');
        },
        error: () => this.showAlert('Failed to add item as advertisement.', 'danger')
      });
  }

  private showAlert(msg: string, type: 'success' | 'danger' | 'warning'): void {
    this.alertMessage = msg;
    this.alertType = type;
    setTimeout(() => {
      if (this.alertMessage === msg) {
        this.alertMessage = '';
      }
    }, 5000);
  }
}

