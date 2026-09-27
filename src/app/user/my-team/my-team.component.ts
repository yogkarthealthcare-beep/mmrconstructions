import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';

export interface TeamMemberNode {
  user_id: number;
  member_id: string;
  full_name: string;
  user_type?: string;
  sponsor_user_id?: number;
  status?: string;
  account_status?: string;
  rank?: string;
  total_gaj_sold?: number;
  commission_earned?: number;
  mobile_no?: string;
  email?: string;
  level?: number;
  children?: TeamMemberNode[];
  collapsed?: boolean;
}

@Component({
  selector: 'app-my-team',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VerifiedBadgeComponent],
  templateUrl: './my-team.component.html',
  styleUrls: ['./my-team.component.css']
})
export class MyTeamComponent implements OnInit {
  loading = true;
  errorMsg = '';
  currentUser: any = null;
  sponsorInfo: any = null;
  treeRoot: TeamMemberNode | null = null;
  flatList: any[] = [];
  teamMembers: any[] = [];
  viewMode: 'cards' | 'list' | 'tree' = 'cards';

  // Filters & Search
  searchTerm = '';
  statusFilter = 'all';
  bookingFilter = 'all';
  copiedLink = false;

  // Hover Tooltip for List / Custom Records
  hoveredMember: any = null;
  tooltipPos = { x: 0, y: 0 };

  // Calculated Stats
  totalTeamCount = 0;
  directCount = 0;
  totalNetworkGaj = 0;
  totalNetworkEarnings = 0;
  totalBookedCount = 0;

  // Toast Notification
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';

  // ── Modal 1: Add New Customer State ──
  showAddCustomerModal = false;
  showCustomerPassword = false;
  addCustomerSubmitting = false;
  addCustomerSuccess = false;
  addCustomerError = '';
  newCustomer = {
    full_name: '',
    mobile_no: '',
    email: '',
    password: ''
  };
  createdCustomerData: any = null;

  // ── Modal 2: Plot Booking State ──
  showBookingModal = false;
  bookingSubmitting = false;
  bookingError = '';
  bookingSuccessData: any = null;
  selectedTeamMember: any = null;
  sitesList: any[] = [];
  plotsList: any[] = [];
  selectedSiteId: number | null = null;
  selectedPlotId: number | null = null;
  selectedPlot: any = null;
  loadingSites = false;
  loadingPlots = false;
  bookingForm = {
    team_member_user_id: null as number | null,
    site_id: null as number | null,
    plot_id: null as number | null,
    payment_option: 'PartWise' as 'OneTime' | 'PartWise' | 'EMI',
    booking_amount: 0,
    payment_method: 'Bank Transfer / UPI',
    notes: ''
  };

  // ── Modal 3: Team Invoices State ──
  showInvoicesModal = false;
  loadingInvoices = false;
  invoiceError = '';
  selectedInvoiceCustomer: any = null;
  invoiceList: any[] = [];
  invoiceSummary = {
    total_amount: 0,
    total_paid: 0,
    total_unpaid: 0
  };

  // ── Modal 4: Customer Details Quick View ──
  showDetailModal = false;
  detailMember: any = null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser() || {};
    this.loadTeamData();
  }

  loadTeamData(): void {
    this.loading = true;
    this.errorMsg = '';

    Promise.all([
      this.api.getAssocNetworkTree().toPromise().catch(() => null),
      this.api.getAssocNetwork().toPromise().catch(() => null),
      this.api.getAssociateTeamMembers().toPromise().catch(() => null),
      this.api.getProfile().toPromise().catch(() => null)
    ]).then(([treeRes, networkRes, teamMembersRes, profileRes]) => {
      if (profileRes?.success && profileRes?.data) {
        this.currentUser = profileRes.data;
        this.auth.setUserSession({ user: profileRes.data });
        if (profileRes.data.sponsor_name || profileRes.data.sponsor_id) {
          this.sponsorInfo = {
            name: profileRes.data.sponsor_name || 'System Admin',
            id: profileRes.data.sponsor_id || profileRes.data.sponsor_member_id || 'MMR0001',
            mobile: profileRes.data.sponsor_mobile || '',
            email: profileRes.data.sponsor_email || ''
          };
        }
      }

      const flatData = (networkRes?.success && Array.isArray(networkRes.data)) ? networkRes.data : [];
      this.flatList = flatData;

      if (teamMembersRes?.success && Array.isArray(teamMembersRes.data)) {
        this.teamMembers = teamMembersRes.data;
      } else {
        this.teamMembers = flatData;
      }

      if (treeRes?.success && treeRes?.data) {
        this.treeRoot = this.formatTree(treeRes.data);
      } else if (flatData.length > 0) {
        this.treeRoot = this.buildTreeFromFlatList(flatData);
      } else {
        this.treeRoot = this.buildRootOnlyNode();
      }

      this.calculateStats();
    }).catch(err => {
      console.error('Failed to load team data:', err);
      this.errorMsg = 'Could not load team network details. Please check your connection.';
    }).finally(() => {
      this.loading = false;
    });
  }

  private formatTree(rawRoot: any): TeamMemberNode {
    const rootUser = this.currentUser || {};
    const rootNode: TeamMemberNode = {
      user_id: rawRoot.user_id || rootUser.user_id || 0,
      member_id: rawRoot.member_id || rootUser.member_id || 'MMR001',
      full_name: rawRoot.full_name || rootUser.full_name || 'My Profile',
      user_type: rawRoot.user_type || rootUser.user_type || 'Associate',
      status: rawRoot.status || rawRoot.account_status || rootUser.account_status || 'Active',
      rank: rawRoot.rank || 'Team Leader',
      total_gaj_sold: Number(rawRoot.total_gaj_sold || 0),
      commission_earned: Number(rawRoot.commission_earned || 0),
      level: 0,
      children: [],
      collapsed: false
    };

    if (Array.isArray(rawRoot.children)) {
      rootNode.children = rawRoot.children.map((child: any) => this.mapChildNode(child, 1));
    }

    return rootNode;
  }

  private mapChildNode(rawNode: any, depth: number): TeamMemberNode {
    const node: TeamMemberNode = {
      user_id: rawNode.user_id,
      member_id: rawNode.member_id || `MMR${rawNode.user_id}`,
      full_name: rawNode.full_name || 'Team Associate',
      user_type: rawNode.user_type || 'Associate',
      sponsor_user_id: rawNode.sponsor_user_id,
      status: rawNode.status || rawNode.account_status || 'Active',
      rank: rawNode.rank || (depth === 1 ? 'Direct Associate' : 'Team Member'),
      total_gaj_sold: Number(rawNode.total_gaj_sold || 0),
      commission_earned: Number(rawNode.commission_earned || 0),
      mobile_no: rawNode.mobile_no,
      email: rawNode.email,
      level: depth,
      children: [],
      collapsed: false
    };

    if (Array.isArray(rawNode.children)) {
      node.children = rawNode.children.map((c: any) => this.mapChildNode(c, depth + 1));
    }

    return node;
  }

  private buildTreeFromFlatList(flatList: any[]): TeamMemberNode {
    const rootUser = this.currentUser || {};
    const rootId = rootUser.user_id || 0;

    const map = new Map<number, TeamMemberNode>();

    const rootNode: TeamMemberNode = {
      user_id: rootId,
      member_id: rootUser.member_id || 'MMR001',
      full_name: rootUser.full_name || 'My Profile',
      user_type: rootUser.user_type || 'Associate',
      status: rootUser.account_status || 'Active',
      rank: 'Root Associate',
      total_gaj_sold: 0,
      commission_earned: 0,
      level: 0,
      children: [],
      collapsed: false
    };

    map.set(rootId, rootNode);

    flatList.forEach(item => {
      map.set(item.user_id, {
        user_id: item.user_id,
        member_id: item.member_id || `MMR${item.user_id}`,
        full_name: item.full_name || 'Associate',
        user_type: item.user_type || 'Associate',
        sponsor_user_id: item.sponsor_user_id,
        status: item.account_status || 'Active',
        rank: item.rank || `Level ${item.level || 1}`,
        total_gaj_sold: Number(item.total_gaj_sold || 0),
        commission_earned: Number(item.total_commission_earned || 0),
        mobile_no: item.mobile_no,
        email: item.email,
        level: Number(item.level || 1),
        children: [],
        collapsed: false
      });
    });

    map.forEach(node => {
      if (node.user_id === rootId) return;
      const parentId = node.sponsor_user_id || rootId;
      const parent = map.get(parentId) || rootNode;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    });

    return rootNode;
  }

  private buildRootOnlyNode(): TeamMemberNode {
    const u = this.currentUser || {};
    return {
      user_id: u.user_id || 0,
      member_id: u.member_id || 'MMR001',
      full_name: u.full_name || 'Associate',
      user_type: u.user_type || 'Associate',
      status: u.account_status || 'Active',
      rank: 'Associate Partner',
      total_gaj_sold: 0,
      commission_earned: 0,
      level: 0,
      children: [],
      collapsed: false
    };
  }

  private calculateStats(): void {
    if (!this.treeRoot) return;

    let totalMembers = 0;
    let totalGaj = 0;
    let totalEarned = 0;
    let directMembers = this.treeRoot.children ? this.treeRoot.children.length : 0;

    const traverse = (node: TeamMemberNode) => {
      if (node !== this.treeRoot) {
        totalMembers++;
        totalGaj += node.total_gaj_sold || 0;
        totalEarned += node.commission_earned || 0;
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(c => traverse(c));
      }
    };

    traverse(this.treeRoot);

    this.totalTeamCount = Math.max(totalMembers, this.teamMembers.length);
    this.directCount = directMembers || this.teamMembers.filter(m => Number(m.level) === 1 || Number(m.sponsor_user_id) === Number(this.currentUser?.user_id)).length;
    this.totalNetworkGaj = totalGaj;
    this.totalNetworkEarnings = totalEarned;
    this.totalBookedCount = this.teamMembers.filter(m => m.booking_id || m.plot_number).length;
  }

  toggleNode(node: TeamMemberNode): void {
    node.collapsed = !node.collapsed;
  }

  expandAll(): void {
    const setCollapsed = (node: TeamMemberNode, state: boolean) => {
      node.collapsed = state;
      if (node.children) node.children.forEach(c => setCollapsed(c, state));
    };
    if (this.treeRoot) setCollapsed(this.treeRoot, false);
  }

  collapseAll(): void {
    const setCollapsed = (node: TeamMemberNode, state: boolean) => {
      if (node !== this.treeRoot) node.collapsed = state;
      if (node.children) node.children.forEach(c => setCollapsed(c, state));
    };
    if (this.treeRoot) setCollapsed(this.treeRoot, true);
  }

  get initials(): string {
    const n = this.currentUser?.full_name || 'A';
    return n.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  getNodeInitials(name: string): string {
    if (!name) return 'A';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get referralLink(): string {
    const code = this.currentUser?.invitation_code || this.currentUser?.member_id || '';
    return code ? `https://mmrconstructions.in/register?ref=${code}` : 'https://mmrconstructions.in/register';
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.referralLink);
    this.copiedLink = true;
    this.showToast('Referral invite link copied to clipboard!', 'success');
    setTimeout(() => this.copiedLink = false, 2500);
  }

  shareWhatsapp(): void {
    const code = this.currentUser?.invitation_code || this.currentUser?.member_id || '';
    const text = encodeURIComponent(`Join my MMR Construction Team Network! Referral Code: ${code}\nRegister link: ${this.referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  get filteredTeamMembers(): any[] {
    return this.teamMembers.filter(m => {
      const matchesSearch = !this.searchTerm ||
        m.full_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.member_id?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.mobile_no?.includes(this.searchTerm) ||
        m.plot_number?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.site_name?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.statusFilter === 'all' ||
        m.account_status?.toLowerCase() === this.statusFilter.toLowerCase();

      const matchesBooking = this.bookingFilter === 'all' ||
        (this.bookingFilter === 'booked' && Boolean(m.booking_id || m.plot_number)) ||
        (this.bookingFilter === 'unbooked' && !m.booking_id && !m.plot_number);

      return matchesSearch && matchesStatus && matchesBooking;
    });
  }

  get filteredFlatList(): any[] {
    return this.flatList.filter(m => {
      const matchesSearch = !this.searchTerm ||
        m.full_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.member_id?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.mobile_no?.includes(this.searchTerm);

      const matchesStatus = this.statusFilter === 'all' ||
        m.account_status?.toLowerCase() === this.statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }

  isFreeOrDisabled(node: TeamMemberNode | any): boolean {
    if (!node) return false;
    const status = String(node.status || node.account_status || '').toLowerCase();
    const isFree = node.is_free === true || node.isFree === true || node.user_type === 'Free' || node.rank === 'Free';
    return isFree || status === 'free' || status === 'inactive' || status === 'pending' || status === 'disabled' || status === 'suspended' || status === 'blacklisted';
  }

  onNodeClick(node: TeamMemberNode, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.isFreeOrDisabled(node)) return;
  }

  onNodeDblClick(node: TeamMemberNode, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
  }

  showListTooltip(m: any, event: MouseEvent): void {
    this.hoveredMember = m;
    const tooltipWidth = 270;
    const tooltipHeight = 185;
    const offset = 15;

    let x = event.clientX + offset;
    let y = event.clientY + offset;

    if (x + tooltipWidth > window.innerWidth - 12) {
      x = event.clientX - tooltipWidth - offset;
    }
    if (y + tooltipHeight > window.innerHeight - 12) {
      y = event.clientY - tooltipHeight - offset;
    }

    x = Math.max(12, Math.min(x, window.innerWidth - tooltipWidth - 12));
    y = Math.max(12, Math.min(y, window.innerHeight - tooltipHeight - 12));

    this.tooltipPos = { x, y };
  }

  hideListTooltip(): void {
    this.hoveredMember = null;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.bookingFilter = 'all';
  }

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      if (this.toastMessage === msg) {
        this.toastMessage = '';
      }
    }, 4500);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODAL 1: ADD NEW CUSTOMER / TEAM MEMBER WORKFLOW
  // ═══════════════════════════════════════════════════════════════
  openAddCustomerModal(): void {
    this.newCustomer = {
      full_name: '',
      mobile_no: '',
      email: '',
      password: ''
    };
    this.addCustomerError = '';
    this.addCustomerSuccess = false;
    this.createdCustomerData = null;
    this.showCustomerPassword = false;
    this.showAddCustomerModal = true;
  }

  closeAddCustomerModal(): void {
    this.showAddCustomerModal = false;
    if (this.addCustomerSuccess) {
      this.loadTeamData();
    }
  }

  submitAddCustomer(): void {
    if (!this.newCustomer.full_name || !this.newCustomer.mobile_no || !this.newCustomer.email || !this.newCustomer.password) {
      this.addCustomerError = 'Please fill all required fields: Name, Mobile, Email, and Password.';
      return;
    }

    const cleanMobile = this.newCustomer.mobile_no.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      this.addCustomerError = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    this.addCustomerSubmitting = true;
    this.addCustomerError = '';

    this.api.createAssociateCustomer(this.newCustomer).subscribe({
      next: (res: any) => {
        this.addCustomerSubmitting = false;
        if (res.success) {
          this.addCustomerSuccess = true;
          this.createdCustomerData = res.data;
          this.showToast('Customer created successfully and added to your team!', 'success');
          // Reload data in background
          this.api.getAssociateTeamMembers().subscribe({
            next: (tmRes: any) => {
              if (tmRes?.success && Array.isArray(tmRes.data)) {
                this.teamMembers = tmRes.data;
                this.calculateStats();
              }
            }
          });
        } else {
          this.addCustomerError = res.message || 'Failed to create customer account.';
        }
      },
      error: (err: any) => {
        this.addCustomerSubmitting = false;
        this.addCustomerError = err?.error?.message || 'Failed to create customer. Please check input and retry.';
      }
    });
  }

  fillEnrollmentForCreatedCustomer(): void {
    if (!this.createdCustomerData) return;
    this.closeAddCustomerModal();
    // Navigate to enrollment or pre-load customer
    this.router.navigate(['/associate/enrollment'], {
      queryParams: {
        target_user_id: this.createdCustomerData.user_id,
        applicant_name: this.createdCustomerData.full_name,
        mobile: this.createdCustomerData.mobile_no,
        email: this.createdCustomerData.email
      }
    });
  }

  bookPlotForCreatedCustomer(): void {
    if (!this.createdCustomerData) return;
    const member = {
      user_id: this.createdCustomerData.user_id,
      member_id: this.createdCustomerData.member_id,
      full_name: this.createdCustomerData.full_name,
      mobile_no: this.createdCustomerData.mobile_no,
      email: this.createdCustomerData.email
    };
    this.closeAddCustomerModal();
    this.openBookingModal(member);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODAL 2: PLOT BOOKING WORKFLOW
  // ═══════════════════════════════════════════════════════════════
  openBookingModal(preselectedMember?: any): void {
    this.bookingError = '';
    this.bookingSuccessData = null;
    this.selectedPlot = null;
    this.plotsList = [];
    this.selectedSiteId = null;
    this.selectedPlotId = null;

    this.bookingForm = {
      team_member_user_id: preselectedMember ? preselectedMember.user_id : (this.teamMembers[0]?.user_id || null),
      site_id: null,
      plot_id: null,
      payment_option: 'PartWise',
      booking_amount: 0,
      payment_method: 'Bank Transfer / UPI',
      notes: ''
    };

    this.selectedTeamMember = preselectedMember || this.teamMembers[0] || null;
    this.showBookingModal = true;
    this.loadSites();
  }

  closeBookingModal(): void {
    this.showBookingModal = false;
    if (this.bookingSuccessData) {
      this.loadTeamData();
    }
  }

  onTeamMemberSelectChange(): void {
    const uid = Number(this.bookingForm.team_member_user_id);
    this.selectedTeamMember = this.teamMembers.find(m => Number(m.user_id) === uid) || null;
  }

  loadSites(): void {
    this.loadingSites = true;
    this.api.getSites().subscribe({
      next: (res: any) => {
        this.loadingSites = false;
        if (res?.success && Array.isArray(res.data)) {
          this.sitesList = res.data;
        } else if (Array.isArray(res)) {
          this.sitesList = res;
        } else if (res?.data?.sites && Array.isArray(res.data.sites)) {
          this.sitesList = res.data.sites;
        }
      },
      error: () => {
        this.loadingSites = false;
        this.showToast('Unable to load sites. Please try again.', 'error');
      }
    });
  }

  onSiteSelected(siteId: any): void {
    const sId = Number(siteId);
    this.bookingForm.site_id = sId;
    this.bookingForm.plot_id = null;
    this.selectedPlot = null;
    this.plotsList = [];

    if (!sId) return;

    this.loadingPlots = true;
    this.api.getSitePlots(sId, { status: 'Vacant' }).subscribe({
      next: (res: any) => {
        this.loadingPlots = false;
        let plots = [];
        if (res?.success && Array.isArray(res.data)) {
          plots = res.data;
        } else if (Array.isArray(res)) {
          plots = res;
        } else if (res?.data?.plots && Array.isArray(res.data.plots)) {
          plots = res.data.plots;
        }
        // Filter vacant plots
        this.plotsList = plots.filter((p: any) => String(p.plot_status || '').toLowerCase() === 'vacant');
      },
      error: () => {
        this.loadingPlots = false;
        this.showToast('Failed to load vacant plots for this site.', 'error');
      }
    });
  }

  onPlotSelected(plotId: any): void {
    const pId = Number(plotId);
    this.bookingForm.plot_id = pId;
    this.selectedPlot = this.plotsList.find(p => Number(p.plot_id) === pId) || null;

    if (this.selectedPlot) {
      const price = Number(this.selectedPlot.base_price || (Number(this.selectedPlot.plot_area || 0) * 1000) || 0);
      if (this.bookingForm.payment_option === 'OneTime') {
        this.bookingForm.booking_amount = price;
      } else if (this.bookingForm.booking_amount === 0 || this.bookingForm.booking_amount > price) {
        // Default part-wise initial booking to 25% or down payment
        const downPayment = Number(this.selectedPlot.down_payment || Math.round(price * 0.25));
        this.bookingForm.booking_amount = downPayment > 0 ? downPayment : Math.round(price * 0.25);
      }
    }
  }

  setPaymentOption(option: 'OneTime' | 'PartWise' | 'EMI'): void {
    if (option === 'EMI') {
      // Disabled option
      return;
    }
    this.bookingForm.payment_option = option;
    if (this.selectedPlot) {
      const price = Number(this.selectedPlot.base_price || 0);
      if (option === 'OneTime') {
        this.bookingForm.booking_amount = price;
      } else {
        const dp = Number(this.selectedPlot.down_payment || Math.round(price * 0.25));
        this.bookingForm.booking_amount = dp > 0 ? dp : Math.round(price * 0.25);
      }
    }
  }

  get totalPlotPrice(): number {
    if (!this.selectedPlot) return 0;
    return Number(this.selectedPlot.base_price || (Number(this.selectedPlot.plot_area || 0) * 1000) || 0);
  }

  get remainingUnpaidAmount(): number {
    const total = this.totalPlotPrice;
    const initial = Number(this.bookingForm.booking_amount || 0);
    return Math.max(0, total - initial);
  }

  submitPlotBooking(): void {
    if (!this.bookingForm.team_member_user_id) {
      this.bookingError = 'Please select a Team Member.';
      return;
    }
    if (!this.bookingForm.site_id || !this.bookingForm.plot_id) {
      this.bookingError = 'Please select both a Project/Site and a Plot.';
      return;
    }
    if (this.bookingForm.payment_option === 'PartWise' && !(Number(this.bookingForm.booking_amount) > 0)) {
      this.bookingError = 'Please specify a valid initial booking payment amount.';
      return;
    }
    if (Number(this.bookingForm.booking_amount) > this.totalPlotPrice) {
      this.bookingError = `Initial payment cannot exceed total plot value (₹${this.totalPlotPrice.toLocaleString('en-IN')}).`;
      return;
    }

    this.bookingSubmitting = true;
    this.bookingError = '';

    this.api.createAssociatePlotBooking(this.bookingForm).subscribe({
      next: (res: any) => {
        this.bookingSubmitting = false;
        if (res.success) {
          this.bookingSuccessData = res.data;
          this.showToast('Plot booking request submitted! Awaiting admin review.', 'success');
          // Reload team members list
          this.loadTeamData();
        } else {
          this.bookingError = res.message || 'Failed to submit plot booking request.';
        }
      },
      error: (err: any) => {
        this.bookingSubmitting = false;
        this.bookingError = err?.error?.message || 'Failed to submit plot booking. Please try again.';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MODAL 3: TEAM MEMBER INVOICES & PAYMENTS VIEW
  // ═══════════════════════════════════════════════════════════════
  openInvoicesModal(member: any): void {
    this.selectedInvoiceCustomer = member;
    this.invoiceList = [];
    this.invoiceSummary = { total_amount: 0, total_paid: 0, total_unpaid: 0 };
    this.invoiceError = '';
    this.loadingInvoices = true;
    this.showInvoicesModal = true;

    this.api.getAssociateTeamMemberInvoices(member.user_id).subscribe({
      next: (res: any) => {
        this.loadingInvoices = false;
        if (res.success) {
          this.invoiceList = res.data.invoices || [];
          this.invoiceSummary = res.data.summary || { total_amount: 0, total_paid: 0, total_unpaid: 0 };
          if (res.data.customer) {
            this.selectedInvoiceCustomer = { ...this.selectedInvoiceCustomer, ...res.data.customer };
          }
        } else {
          this.invoiceError = res.message || 'Unable to load invoice records.';
        }
      },
      error: (err: any) => {
        this.loadingInvoices = false;
        this.invoiceError = err?.error?.message || 'Failed to load invoices for this team member.';
      }
    });
  }

  closeInvoicesModal(): void {
    this.showInvoicesModal = false;
  }

  downloadInvoicePdf(invoiceNumber: string): void {
    this.api.getBlob(`/api/invoice/${invoiceNumber}/pdf`).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Invoice PDF downloaded!', 'success');
      },
      error: (err: any) => {
        this.showToast(err?.error?.message || 'Failed to download Invoice PDF.', 'error');
      }
    });
  }

  viewInvoiceOnline(invoiceNumber: string): void {
    window.open(`/booking/${invoiceNumber}/invoice`, '_blank');
  }

  // ═══════════════════════════════════════════════════════════════
  // MODAL 4: QUICK DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════
  openDetailModal(member: any): void {
    this.detailMember = member;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
  }
}
