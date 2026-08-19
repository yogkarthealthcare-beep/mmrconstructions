import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  loading = true;
  editMode = false;
  saving = false;
  profile: any = {};
  toast = '';
  toastType = 'success';

  editable = {
    email: '',
    alternate_mobile: '',
    spouse_name: '',
    bank_name: '',
    account_holder_name: '',
    branch_name: '',
    nominee_name: '',
    nominee_relationship: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.profile = res.data || {};
          this.editable = {
            email: this.profile.email || '',
            alternate_mobile: this.profile.alternate_mobile || '',
            spouse_name: this.profile.spouse_name || '',
            bank_name: this.profile.bank_name || '',
            account_holder_name: this.profile.account_holder_name || '',
            branch_name: this.profile.branch_name || '',
            nominee_name: this.profile.nominee_name || '',
            nominee_relationship: this.profile.nominee_relationship || '',
          };
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save() {
    this.saving = true;
    this.api.updateProfile(this.editable).subscribe({
      next: (res: any) => {
        this.showToast(res.message || 'Profile updated successfully!', 'success');
        this.editMode = false;
        this.saving = false;
        this.ngOnInit();
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Update failed', 'error');
        this.saving = false;
      }
    });
  }

  get initials() {
    const n = this.profile.full_name || '';
    return n.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  showToast(msg: string, type: string) {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 3500);
  }
}
