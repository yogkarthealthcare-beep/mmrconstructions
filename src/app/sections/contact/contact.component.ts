import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({ selector: 'app-contact', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './contact.component.html' })
export class ContactComponent {
  form = { name: '', mobile: '', interest: 'Plot Booking — 100 Gaj', message: '' };
  submitted = false;
  onSubmit() { this.submitted = true; this.form = { name: '', mobile: '', interest: 'Plot Booking — 100 Gaj', message: '' }; }
}
