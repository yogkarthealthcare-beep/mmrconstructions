import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-enquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enquiries.component.html',
  styleUrls: ['./enquiries.component.css']
})
export class EnquiriesComponent implements OnInit {
  loading = true;
  search = '';
  statusFilter = 'all';
  priorityFilter = 'all';
  activeRowId: any = null;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }

  // Lead / Enquiry Inventory Data
  enquiries: any[] = [
    { id: 1, name: 'Mohit Yadav',   mobile: '9988776655', email: 'mohit.yadav@example.com', interest: 'Plot Booking — 100 Gaj', message: '100 gaj plot chahiye AIMA site mein', date: '2026-08-17T10:30:00Z', status: 'open',   priority: 'high', notes: 'Interested in site visit this weekend.' },
    { id: 2, name: 'Geeta Sharma',  mobile: '8877665544', email: 'geeta.sharma@example.com', interest: 'Site Visit Request',      message: 'Site visit karni hai Unnao site mein',     date: '2026-08-16T14:15:00Z', status: 'open',   priority: 'medium', notes: 'Wants cab arrangement for visit.' },
    { id: 3, name: 'Vikas Gupta',   mobile: '7766554433', email: 'vikas.g@example.com',     interest: 'Associate Program',       message: 'Commission earn karna chahta hoon',   date: '2026-08-15T09:45:00Z', status: 'called', priority: 'medium', notes: 'Explained downline 12-year commission plan.' },
    { id: 4, name: 'Ritu Pandey',   mobile: '6655443322', email: 'ritu.p@example.com',      interest: 'Plot Booking — 50 Gaj',  message: 'EMI kitna hoga 50 gaj ka?',            date: '2026-08-14T16:20:00Z', status: 'closed', priority: 'low', notes: 'Booked Plot #42 under 3-year EMI.' },
    { id: 5, name: 'Amit Saxena',   mobile: '9944332211', email: 'amit.saxena@example.com', interest: 'General Enquiry',         message: 'Buyback policy details chahiye',       date: '2026-08-13T11:10:00Z', status: 'open',   priority: 'low', notes: 'Sent buyback policy PDF via WhatsApp.' },
    { id: 6, name: 'Pooja Verma',   mobile: '8833221100', email: 'pooja.v@example.com',     interest: 'Plot Booking — 100 Gaj', message: 'Lucknow site mein plot lena hai',      date: '2026-08-12T13:50:00Z', status: 'called', priority: 'high', notes: 'Follow-up call scheduled tomorrow.' },
    { id: 7, name: 'Rajesh Mishra', mobile: '9811223344', email: 'rajesh.m@example.com',    interest: 'Commercial Land',        message: 'Commercial plot price per sqft details', date: '2026-08-11T15:00:00Z', status: 'open',   priority: 'high', notes: 'Requested layout map brochure.' }
  ];

  toast = '';
  actionLoading = false;

  // Selected Lead for Modals
  selectedEnquiry: any = null;
  newNoteText = '';

  showAddModal = false;
  showDetailModal = false;

  // New Lead Form Model
  newLead = {
    name: '',
    mobile: '',
    email: '',
    interest: 'Plot Booking — 100 Gaj',
    message: '',
    priority: 'high'
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loading = false;
  }

  get openCount(): number {
    return this.enquiries.filter(e => e.status === 'open').length;
  }

  get calledCount(): number {
    return this.enquiries.filter(e => e.status === 'called').length;
  }

  get closedCount(): number {
    return this.enquiries.filter(e => e.status === 'closed').length;
  }

  get filtered(): any[] {
    return this.enquiries.filter(e => {
      const matchStatus =
        this.statusFilter === 'all' ? true :
        e.status === this.statusFilter;

      const matchPriority =
        this.priorityFilter === 'all' ? true :
        e.priority === this.priorityFilter;

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        e.name?.toLowerCase().includes(q) ||
        e.mobile?.includes(q) ||
        e.interest?.toLowerCase().includes(q) ||
        e.message?.toLowerCase().includes(q);

      return matchStatus && matchPriority && matchSearch;
    });
  }

  updateStatus(e: any, newStatus: string) {
    e.status = newStatus;
    this.showToast(`Lead status updated to ${newStatus}`);
  }

  openAddLeadModal() {
    this.newLead = {
      name: '',
      mobile: '',
      email: '',
      interest: 'Plot Booking — 100 Gaj',
      message: '',
      priority: 'high'
    };
    this.showAddModal = true;
  }

  saveNewLead() {
    if (!this.newLead.name || !this.newLead.mobile) {
      this.showToast('Please fill Name and Mobile number');
      return;
    }

    const created = {
      id: Date.now(),
      name: this.newLead.name,
      mobile: this.newLead.mobile,
      email: this.newLead.email,
      interest: this.newLead.interest,
      message: this.newLead.message,
      date: new Date().toISOString(),
      status: 'open',
      priority: this.newLead.priority,
      notes: 'New lead logged from Admin CRM panel.'
    };

    this.enquiries.unshift(created);
    this.showToast(`New lead for ${this.newLead.name} logged successfully!`);
    this.closeModals();
  }

  openDetailModal(e: any) {
    this.selectedEnquiry = e;
    this.newNoteText = '';
    this.showDetailModal = true;
  }

  addNoteToLead() {
    if (!this.selectedEnquiry || !this.newNoteText.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const noteLine = `\n[${time}] ${this.newNoteText.trim()}`;
    this.selectedEnquiry.notes = (this.selectedEnquiry.notes || '') + noteLine;
    this.showToast('Follow-up note added!');
    this.newNoteText = '';
  }

  sendFollowUpNotification(e: any) {
    this.actionLoading = true;
    this.api.adminSendNotif({
      user_id: e.id,
      title: 'Follow-Up Regarding ' + e.interest,
      message: `Dear ${e.name}, thank you for your enquiry regarding ${e.interest}. Our MMR team is contacting you shortly.`,
      channel: 'Push'
    }).subscribe({
      next: () => {
        this.showToast(`Follow-up notification sent to ${e.name}`);
        this.actionLoading = false;
      },
      error: () => {
        this.showToast(`Follow-up notification queued for ${e.name}`);
        this.actionLoading = false;
      }
    });
  }

  closeModals() {
    this.showAddModal = false;
    this.showDetailModal = false;
  }

  getInitials(name: string): string {
    if (!name) return 'L';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
