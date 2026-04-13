import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  currentStep = 1;
  totalSteps = 8;

  steps = [
    { num: 1, label: 'Type' },
    { num: 2, label: 'Personal' },
    { num: 3, label: 'Identity' },
    { num: 4, label: 'Address' },
    { num: 5, label: 'Bank' },
    { num: 6, label: 'Nominee' },
    { num: 7, label: 'Documents' },
    { num: 8, label: 'Declare' },
  ];

  form: any = {
    type: 'customer',
    name: '', fatherName: '', dob: '', gender: '', mobile: '', email: '', referCode: '',
    aadhar: '', pan: '', voterId: '',
    address: '', city: '', state: '', pincode: '',
    bankName: '', accountNo: '', ifsc: '', branch: '',
    nomineeName: '', nomineeRelation: '', nomineeDob: '', nomineeMobile: '',
    aadharFile: null, panFile: null, photoFile: null,
    declaration: false,
  };

  submitted = false;
  constructor(private router: Router) {}

  selectType(t: string) { this.form.type = t; }
  isStepDone(n: number) { return n < this.currentStep; }
  isStepActive(n: number) { return n === this.currentStep; }

  next() { if (this.currentStep < this.totalSteps) this.currentStep++; }
  prev() { if (this.currentStep > 1) this.currentStep--; }

  onSubmit() {
    this.submitted = true;
    setTimeout(() => this.router.navigate(['/login']), 3000);
  }
}
