import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

export interface SiteGalleryItem {
  id?: number;
  category: string;
  site_name: string;
  site_address: string;
  site_image: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-site-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './site-gallery.component.html',
  styleUrls: ['./site-gallery.component.css']
})
export class AdminSiteGalleryComponent implements OnInit {
  private api = inject(ApiService);

  categories: string[] = ['Plot'];
  activeCategory: string = 'Plot';

  sites: SiteGalleryItem[] = [];
  loading = false;
  saving = false;
  deleting = false;

  alertMessage = '';
  alertType: 'success' | 'danger' = 'success';

  showModal = false;
  isEditing = false;

  formData: {
    id: number | null;
    category: string;
    site_name: string;
    site_address: string;
    site_image: string;
    display_order: number;
    is_active: boolean;
  } = {
    id: null,
    category: 'Plot',
    site_name: '',
    site_address: '',
    site_image: '',
    display_order: 0,
    is_active: true
  };

  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  formErrors: { [key: string]: string } = {};

  showDeleteModal = false;
  siteToDelete: SiteGalleryItem | null = null;

  ngOnInit(): void {
    this.loadSites();
  }

  setCategory(cat: string): void {
    this.activeCategory = cat;
    this.loadSites();
  }

  loadSites(): void {
    this.loading = true;
    this.api.adminGetSiteGallery(this.activeCategory).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.success && Array.isArray(res.data)) {
          this.sites = res.data;
        } else if (Array.isArray(res)) {
          this.sites = res;
        } else {
          this.sites = [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.showAlert(err?.error?.message || 'Failed to load site gallery list.', 'danger');
      }
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.formErrors = {};
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.formData = {
      id: null,
      category: this.activeCategory,
      site_name: '',
      site_address: '',
      site_image: '',
      display_order: this.sites.length + 1,
      is_active: true
    };
    this.showModal = true;
  }

  openEditModal(site: SiteGalleryItem): void {
    this.isEditing = true;
    this.formErrors = {};
    this.selectedFile = null;
    this.imagePreviewUrl = this.resolveImageUrl(site.site_image);
    this.formData = {
      id: site.id || null,
      category: site.category || 'Plot',
      site_name: site.site_name,
      site_address: site.site_address,
      site_image: site.site_image,
      display_order: site.display_order || 0,
      is_active: site.is_active !== false
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.formErrors = {};
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        this.formErrors['site_image'] = 'Please upload a valid JPG, PNG, WEBP, or SVG image.';
        return;
      }

      // Validate file size (15MB)
      if (file.size > 15 * 1024 * 1024) {
        this.formErrors['site_image'] = 'Image size must be less than 15 MB.';
        return;
      }

      delete this.formErrors['site_image'];
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  validateForm(): boolean {
    this.formErrors = {};

    if (!this.formData.site_name.trim()) {
      this.formErrors['site_name'] = 'Site Name is required.';
    }

    if (!this.formData.site_address.trim()) {
      this.formErrors['site_address'] = 'Site Address is required.';
    }

    if (!this.isEditing && !this.selectedFile && !this.formData.site_image.trim()) {
      this.formErrors['site_image'] = 'Site Image is required.';
    }

    return Object.keys(this.formErrors).length === 0;
  }

  saveSite(): void {
    if (!this.validateForm()) {
      return;
    }

    this.saving = true;

    if (this.selectedFile) {
      const fd = new FormData();
      fd.append('category', this.formData.category);
      fd.append('site_name', this.formData.site_name.trim());
      fd.append('site_address', this.formData.site_address.trim());
      fd.append('display_order', String(this.formData.display_order));
      fd.append('is_active', String(this.formData.is_active));
      fd.append('site_image', this.selectedFile);

      if (this.isEditing && this.formData.id) {
        this.api.adminUpdateSiteGallery(this.formData.id, fd).subscribe({
          next: () => {
            this.saving = false;
            this.closeModal();
            this.showAlert('Site updated successfully.', 'success');
            this.loadSites();
          },
          error: (err: any) => {
            this.saving = false;
            this.showAlert(err?.error?.message || 'Failed to update site.', 'danger');
          }
        });
      } else {
        this.api.adminCreateSiteGallery(fd).subscribe({
          next: () => {
            this.saving = false;
            this.closeModal();
            this.showAlert('Site added to gallery successfully.', 'success');
            this.loadSites();
          },
          error: (err: any) => {
            this.saving = false;
            this.showAlert(err?.error?.message || 'Failed to add site.', 'danger');
          }
        });
      }
    } else {
      const payload = {
        category: this.formData.category,
        site_name: this.formData.site_name.trim(),
        site_address: this.formData.site_address.trim(),
        site_image: this.formData.site_image.trim(),
        display_order: this.formData.display_order,
        is_active: this.formData.is_active
      };

      if (this.isEditing && this.formData.id) {
        this.api.adminUpdateSiteGallery(this.formData.id, payload).subscribe({
          next: () => {
            this.saving = false;
            this.closeModal();
            this.showAlert('Site updated successfully.', 'success');
            this.loadSites();
          },
          error: (err: any) => {
            this.saving = false;
            this.showAlert(err?.error?.message || 'Failed to update site.', 'danger');
          }
        });
      } else {
        this.api.adminCreateSiteGallery(payload).subscribe({
          next: () => {
            this.saving = false;
            this.closeModal();
            this.showAlert('Site added to gallery successfully.', 'success');
            this.loadSites();
          },
          error: (err: any) => {
            this.saving = false;
            this.showAlert(err?.error?.message || 'Failed to add site.', 'danger');
          }
        });
      }
    }
  }

  confirmDelete(site: SiteGalleryItem): void {
    this.siteToDelete = site;
    this.showDeleteModal = true;
  }

  deleteSite(): void {
    if (!this.siteToDelete || !this.siteToDelete.id) return;

    this.deleting = true;
    this.api.adminDeleteSiteGallery(this.siteToDelete.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.showAlert(`Site "${this.siteToDelete?.site_name}" deleted successfully.`, 'success');
        this.siteToDelete = null;
        this.loadSites();
      },
      error: (err: any) => {
        this.deleting = false;
        this.showAlert(err?.error?.message || 'Failed to delete site.', 'danger');
      }
    });
  }

  resolveImageUrl(img: string): string {
    if (!img) return '';
    if (/^https?:\/\//i.test(img)) return img;
    return this.api.url(img);
  }

  showAlert(msg: string, type: 'success' | 'danger'): void {
    this.alertMessage = msg;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = '';
    }, 4500);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=75';
    }
  }
}
