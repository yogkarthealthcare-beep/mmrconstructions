import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Profile {
  name: string; fatherName: string; dob: string; gender: string;
  mobile: string; email: string; aadhar: string; pan: string;
  address: string; city: string; state: string; pincode: string;
  bankName: string; accountNo: string; ifsc: string; branch: string;
  nomineeName: string; nomineeRelation: string;
  memberId: string; joinDate: string; type: string;
  [key: string]: string;
}

@Component({ selector: 'app-profile', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './profile.component.html' })
export class ProfileComponent {
  editMode = false; saved = false;
  profile: Profile = {
    name:'Ramesh Kumar Sharma', fatherName:'Shyam Lal Sharma', dob:'1985-06-15',
    gender:'Male', mobile:'9876543210', email:'ramesh@gmail.com',
    aadhar:'XXXX-XXXX-1234', pan:'ABCDE1234F',
    address:'House No. 45, Shyam Nagar', city:'Kanpur', state:'Uttar Pradesh', pincode:'208001',
    bankName:'SBI', accountNo:'XXXXXXXXXXXX9876', ifsc:'SBIN0001234', branch:'Ramadevi, Kanpur',
    nomineeName:'Sushma Sharma', nomineeRelation:'Spouse',
    memberId:'MMR-C-00247', joinDate:'15 Jan 2024', type:'Customer'
  };
  personalFields = [['Full Name','name'],['Father\'s Name','fatherName'],['Date of Birth','dob'],['Gender','gender'],['Mobile','mobile'],['Email','email']];
  identityFields = [['Aadhar Number','aadhar'],['PAN Number','pan']];
  nomineeFields  = [['Nominee Name','nomineeName'],['Relation','nomineeRelation']];
  bankFields     = [['Bank Name','bankName'],['Account No.','accountNo'],['IFSC Code','ifsc'],['Branch','branch']];

  save() { this.editMode = false; this.saved = true; setTimeout(() => this.saved = false, 3000); }
}
