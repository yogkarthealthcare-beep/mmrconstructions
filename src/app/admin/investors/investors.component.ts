import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-investors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investors.component.html',
  styleUrls: ['./investors.component.css']
})
export class AdminInvestorsComponent implements OnInit {
  rows: any[] = [];
  registeredInvestors: any[] = [];
  loading = true;
  showForm = false;
  saving = false;
  editing: any = null;
  file: File | null = null;
  preview = '';
  message = '';
  error = '';

  // Searchable Dropdown State
  investorSearchTerm = '';
  showDropdown = false;
  selectedInvestor: any = null;

  form = {
    name: '',
    user_id: '',
    display_order: 0,
    is_active: true
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
    this.loadRegisteredInvestors();
  }

  load() {
    this.loading = true;
    this.api.adminGetInvestors().subscribe({
      next: (r: any) => {
        this.rows = r.data || [];
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Unable to load investors.';
        this.loading = false;
      }
    });
  }

  loadRegisteredInvestors() {
    this.api.adminGetInvestorsPortal({ limit: 1000 }).subscribe({
      next: (res: any) => {
        if (res.success && res.data?.items) {
          this.registeredInvestors = res.data.items;
        } else if (Array.isArray(res.data)) {
          this.registeredInvestors = res.data;
        }
      },
      error: () => {}
    });
  }

  get filteredRegisteredInvestors(): any[] {
    const term = (this.investorSearchTerm || '').trim().toLowerCase();
    if (!term) return this.registeredInvestors;
    return this.registeredInvestors.filter(inv => {
      const name = (inv.full_name || '').toLowerCase();
      const sponsor = (inv.sponsor_invite_code || 'MMR00001').toLowerCase();
      const email = (inv.email || '').toLowerCase();
      const mobile = (inv.mobile_number || '').toLowerCase();
      return name.includes(term) || sponsor.includes(term) || email.includes(term) || mobile.includes(term);
    });
  }

  open(row: any = null) {
    this.editing = row;
    this.showDropdown = false;
    this.file = null;
    this.error = '';

    if (row) {
      this.form = {
        name: row.name || '',
        user_id: row.user_id || '',
        display_order: Number(row.display_order || 0),
        is_active: row.is_active !== false
      };
      this.preview = row.profile_image_url || '';
      this.investorSearchTerm = row.name || '';
      this.selectedInvestor = null;
    } else {
      this.form = {
        name: '',
        user_id: '',
        display_order: 0,
        is_active: true
      };
      this.preview = '';
      this.investorSearchTerm = '';
      this.selectedInvestor = null;
      this.loadRegisteredInvestors();
    }

    this.showForm = true;
  }

  selectInvestor(inv: any) {
    this.selectedInvestor = inv;
    this.form.name = inv.full_name || '';
    this.form.user_id = String(inv.id);
    const sponsorDisplay = inv.sponsor_invite_code ? `[${inv.sponsor_invite_code}] ` : '';
    this.investorSearchTerm = `${sponsorDisplay}${inv.full_name}`;
    this.showDropdown = false;

    if (inv.profile_picture_url && !this.file) {
      this.preview = inv.profile_picture_url;
    }
  }

  choose(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] || null;
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      this.error = 'Choose a JPG, PNG or WEBP image.';
      return;
    }
    this.file = f;
    const rd = new FileReader();
    rd.onload = () => this.preview = String(rd.result);
    rd.readAsDataURL(f);
  }

  save() {
    this.error = '';
    if (!this.form.name.trim()) {
      this.error = 'Please select or enter an Investor Name.';
      return;
    }
    if (!this.editing && !this.file && !this.preview) {
      this.error = 'Profile image is required to add investor.';
      return;
    }

    const fd = new FormData();
    fd.append('name', this.form.name.trim());
    if (this.form.user_id) {
      fd.append('user_id', String(this.form.user_id));
    }
    fd.append('display_order', String(this.form.display_order));
    fd.append('is_active', String(this.form.is_active));
    if (this.file) {
      fd.append('profile_image', this.file);
    }

    this.saving = true;
    const req = this.editing
      ? this.api.adminUpdateInvestor(this.editing.id, fd)
      : this.api.adminCreateInvestor(fd);

    req.subscribe({
      next: () => {
        this.message = this.editing ? 'Investor profile updated.' : 'Investor added successfully.';
        this.saving = false;
        this.showForm = false;
        this.showDropdown = false;
        this.load();
        this.loadRegisteredInvestors();
        setTimeout(() => { this.message = ''; }, 3500);
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Unable to save investor.';
        this.saving = false;
      }
    });
  }

  toggle(row: any) {
    this.api.adminSetInvestorStatus(row.id, !row.is_active).subscribe({
      next: () => this.load(),
      error: (e: any) => this.error = e?.error?.message || 'Update failed.'
    });
  }

  remove(row: any) {
    if (!confirm(`Delete investor ${row.name}?`)) return;
    this.api.adminDeleteInvestor(row.id).subscribe({
      next: () => {
        this.message = 'Investor deleted.';
        this.load();
        setTimeout(() => { this.message = ''; }, 3500);
      },
      error: (e: any) => this.error = e?.error?.message || 'Delete failed.'
    });
  }
}
