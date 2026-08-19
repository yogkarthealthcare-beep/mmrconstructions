// Backup of previous Signup implementation for reference
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup-backup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container py-5 text-center">
      <h2>Signup Backup Component</h2>
      <p>This is a backup of the previous signup implementation for reference.</p>
    </div>
  `
})
export class SignupBackupComponent {}
