import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

type SliderForm = {
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  tag_text: string;
  tag_icon: string;
  button_text: string;
  button_link: string;
  button_icon: string;
  button2_text: string;
  button2_link: string;
  button2_icon: string;
  thumbnail_url: string;
  thumbnail_title: string;
  thumbnail_subtitle: string;
  stats: { num: string; lbl: string }[];
  show_image: boolean;
  show_tag: boolean;
  show_title: boolean;
  show_subtitle: boolean;
  show_description: boolean;
  show_button1: boolean;
  show_button2: boolean;
  show_stats: boolean;
  show_thumbnail: boolean;
  display_order: number;
  is_active: boolean;
  slider_image: File | null;
};

@Component({
  selector: 'app-home-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-slider.component.html',
  styleUrls: ['./home-slider.component.css'],
})
export class HomeSliderComponent implements OnInit {
  sliders: any[] = [];
  loading = true;
  saving = false;
  showForm = false;
  editingSlider: any = null;
  previewUrl = '';
  toast = '';
  toastType: 'success' | 'error' = 'success';
  private homeSettings: any = { display_type: 'hero_slider', show_information_section: true };
  sectionToggleSaving = false;
  sectionToggles = [
    { key: 'investors', label: 'Our Investors', description: 'Investor profile grid on the Home Page', icon: 'fas fa-user-group', enabled: true },
    { key: 'information', label: 'Information Strip', description: 'Trust of 20 years, Bank Finance, Trusted Partner, App and PDF Vouchers', icon: 'fas fa-certificate', enabled: true },
    { key: 'sites', label: 'Sites / Projects', description: 'Active property sites and project cards', icon: 'fas fa-map-marked-alt', enabled: true },
    { key: 'why_choose', label: 'Why Choose Us', description: 'Company benefits and trust cards', icon: 'fas fa-award', enabled: true },
    { key: 'emi_calculator', label: 'EMI Calculator', description: 'Public EMI calculation section', icon: 'fas fa-calculator', enabled: true },
    { key: 'buyback', label: 'Buyback Section', description: 'Buyback guarantee information', icon: 'fas fa-shield-alt', enabled: true },
    { key: 'earn', label: 'Earn With Us', description: 'Associate earning programme', icon: 'fas fa-hand-holding-usd', enabled: true },
    { key: 'facilities', label: 'Facilities', description: 'Road, drainage, electricity and other facilities', icon: 'fas fa-building', enabled: true },
    { key: 'cta', label: 'Registration CTA', description: 'Limited availability registration banner', icon: 'fas fa-bullhorn', enabled: true },
    { key: 'contact', label: 'Contact Section', description: 'Home page contact and inquiry section', icon: 'fas fa-address-card', enabled: true },
  ];
  form: SliderForm = this.emptyForm();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSliders();
    this.loadMasterToggle();
  }

  private loadMasterToggle(): void {
    const applySettings = (res: any) => {
      this.homeSettings = res?.data || this.homeSettings;
      const visibility = this.homeSettings.section_visibility || {};
      this.sectionToggles.forEach(section => {
        section.enabled = section.key === 'information'
          ? this.homeSettings.show_information_section !== false
          : visibility[section.key] !== false;
      });
    };

    this.api.adminGetHomePageSettings().subscribe({
      next: applySettings,
      error: () => {
        this.api.getHomePageSettings().subscribe({
          next: applySettings,
          error: () => {},
        });
      },
    });
  }

  saveSectionToggles(): void {
    this.sectionToggleSaving = true;
    const visibility: Record<string, boolean> = {};
    this.sectionToggles.filter(section => section.key !== 'information')
      .forEach(section => visibility[section.key] = section.enabled);
    const information = this.sectionToggles.find(section => section.key === 'information')?.enabled !== false;
    this.api.adminUpdateHomePageSettings({
      display_type: 'hero_slider',
      show_hero_slider: true,
      show_information_section: information,
      section_visibility: visibility,
    }).subscribe({
      next: (res: any) => {
        this.homeSettings = res?.data || this.homeSettings;
        this.sectionToggleSaving = false;
        this.showToast('Home Page section visibility updated.', 'success');
      },
      error: (error: any) => {
        this.sectionToggleSaving = false;
        this.showToast(error?.error?.message || 'Unable to update section visibility.', 'error');
        this.loadMasterToggle();
      },
    });
  }

  loadSliders(): void {
    this.loading = true;
    this.api.adminGetHomeSliders().subscribe({
      next: (res: any) => {
        this.sliders = res?.data || [];
        this.loading = false;
      },
      error: () => {
        this.api.getHomeSliders().subscribe({
          next: (res: any) => {
            this.sliders = res?.data || [];
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          },
        });
      },
    });
  }

  openAdd(): void {
    this.editingSlider = null;
    this.form = this.emptyForm();
    this.previewUrl = '';
    this.showForm = true;
  }

  openEdit(slider: any): void {
    this.editingSlider = slider;
    this.form = {
      title: slider.title || '',
      subtitle: slider.subtitle || '',
      description: slider.description || '',
      image_url: slider.image_url || '',
      tag_text: slider.tag_text || '',
      tag_icon: slider.tag_icon || 'fas fa-star',
      button_text: slider.button_text || '',
      button_link: slider.button_link || '',
      button_icon: slider.button_icon || 'fas fa-arrow-right',
      button2_text: slider.button2_text || '',
      button2_link: slider.button2_link || '',
      button2_icon: slider.button2_icon || 'fas fa-arrow-right',
      thumbnail_url: slider.thumbnail_url || slider.image_url || '',
      thumbnail_title: slider.thumbnail_title || slider.title || '',
      thumbnail_subtitle: slider.thumbnail_subtitle || slider.subtitle || '',
      stats: this.normalizedStats(slider.stats_json),
      show_image: slider.show_image !== false,
      show_tag: slider.show_tag !== false,
      show_title: slider.show_title !== false,
      show_subtitle: slider.show_subtitle !== false,
      show_description: slider.show_description !== false,
      show_button1: slider.show_button1 !== false,
      show_button2: slider.show_button2 !== false,
      show_stats: slider.show_stats !== false,
      show_thumbnail: slider.show_thumbnail !== false,
      display_order: Number(slider.display_order || 0),
      is_active: slider.is_active !== false,
      slider_image: null,
    };
    this.previewUrl = slider.image_url || '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingSlider = null;
    this.previewUrl = '';
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      input.value = '';
      this.showToast('Only JPG, JPEG and PNG slider images are allowed.', 'error');
      return;
    }
    this.form.slider_image = file;
    const reader = new FileReader();
    reader.onload = () => this.previewUrl = String(reader.result || '');
    reader.readAsDataURL(file);
  }

  save(): void {
    if (!this.form.title.trim()) {
      this.showToast('Slider title is required.', 'error');
      return;
    }
    if (!this.form.slider_image && !this.form.image_url.trim()) {
      this.showToast('Slider image or image URL is required.', 'error');
      return;
    }

    const data = new FormData();
    data.append('title', this.form.title.trim());
    data.append('subtitle', this.form.subtitle.trim());
    data.append('description', this.form.description.trim());
    data.append('image_url', this.form.image_url.trim());
    data.append('tag_text', this.form.tag_text.trim());
    data.append('tag_icon', this.form.tag_icon.trim());
    data.append('button_text', this.form.button_text.trim());
    data.append('button_link', this.form.button_link.trim());
    data.append('button_icon', this.form.button_icon.trim());
    data.append('button2_text', this.form.button2_text.trim());
    data.append('button2_link', this.form.button2_link.trim());
    data.append('button2_icon', this.form.button2_icon.trim());
    data.append('thumbnail_url', this.form.thumbnail_url.trim());
    data.append('thumbnail_title', this.form.thumbnail_title.trim());
    data.append('thumbnail_subtitle', this.form.thumbnail_subtitle.trim());
    data.append('stats_json', JSON.stringify(this.form.stats));
    for (const field of [
      'show_image', 'show_tag', 'show_title', 'show_subtitle', 'show_description',
      'show_button1', 'show_button2', 'show_stats', 'show_thumbnail',
    ] as const) {
      data.append(field, String(this.form[field]));
    }
    data.append('display_order', String(this.form.display_order || 0));
    data.append('is_active', String(this.form.is_active));
    if (this.form.slider_image) data.append('slider_image', this.form.slider_image);

    this.saving = true;
    const request = this.editingSlider
      ? this.api.adminUpdateHomeSlider(this.editingSlider.id, data)
      : this.api.adminCreateHomeSlider(data);
    request.subscribe({
      next: (res: any) => {
        this.saving = false;
        this.closeForm();
        this.showToast(res?.message || 'Home slider saved.');
        this.loadSliders();
      },
      error: (error: any) => {
        this.saving = false;
        this.showToast(error?.error?.message || 'Unable to save home slider.', 'error');
      },
    });
  }

  deactivate(slider: any): void {
    if (!confirm(`Deactivate "${slider.title}"?`)) return;
    this.api.adminDeleteHomeSlider(slider.id).subscribe({
      next: (res: any) => {
        this.showToast(res?.message || 'Slider deactivated.');
        this.loadSliders();
      },
      error: (error: any) => this.showToast(error?.error?.message || 'Unable to deactivate slider.', 'error'),
    });
  }

  private emptyForm(): SliderForm {
    return {
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      tag_text: '',
      tag_icon: 'fas fa-star',
      button_text: '',
      button_link: '',
      button_icon: 'fas fa-arrow-right',
      button2_text: '',
      button2_link: '',
      button2_icon: 'fas fa-arrow-right',
      thumbnail_url: '',
      thumbnail_title: '',
      thumbnail_subtitle: '',
      stats: [{ num: '', lbl: '' }, { num: '', lbl: '' }, { num: '', lbl: '' }],
      show_image: true,
      show_tag: true,
      show_title: true,
      show_subtitle: true,
      show_description: true,
      show_button1: true,
      show_button2: true,
      show_stats: true,
      show_thumbnail: true,
      display_order: 0,
      is_active: true,
      slider_image: null,
    };
  }

  private normalizedStats(value: any): { num: string; lbl: string }[] {
    const source = Array.isArray(value) ? value : [];
    return [0, 1, 2].map((index) => ({
      num: String(source[index]?.num || ''),
      lbl: String(source[index]?.lbl || ''),
    }));
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toast = message;
    this.toastType = type;
    window.setTimeout(() => this.toast = '', 4000);
  }
}
