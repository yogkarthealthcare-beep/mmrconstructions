import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

export interface TeamNode {
  user_id: number;
  member_id: string;
  full_name: string;
  user_type?: string;
  sponsor_user_id?: number;
  status?: string;
  rank?: string;
  total_gaj_sold?: number;
  commission_earned?: number;
  mobile_no?: string;
  level?: number;
  children?: TeamNode[];
  collapsed?: boolean;
}

@Component({
  selector: 'app-referral',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './referral.component.html',
  styleUrls: ['./referral.component.css']
})
export class ReferralComponent implements OnInit {
  loading = true;
  inviteData: any = {};
  userData: any = {};
  profile: any = {};
  network: any[] = [];
  treeRoot: TeamNode | null = null;
  viewMode: 'tree' | 'list' = 'tree';
  copied = false;
  copiedLink = false;

  // Hover Tooltip for List
  hoveredMember: any = null;
  tooltipPos = { x: 0, y: 0 };

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.auth.user$.subscribe(u => {
      this.userData = u || this.auth.getUser() || {};
    });
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    Promise.all([
      this.api.getInviteCode().toPromise().then((res: any) => {
        if (res?.success) this.inviteData = res.data || {};
      }).catch(err => console.warn('Invite code fetch error:', err)),

      this.api.getProfile().toPromise().then((res: any) => {
        if (res?.success) this.profile = res.data || {};
      }).catch(err => console.warn('Profile fetch error:', err)),

      this.api.getAssocNetwork().toPromise().then((res: any) => {
        if (res?.success) this.network = res.data || [];
      }).catch(err => console.warn('Network fetch error:', err)),

      this.api.getAssocNetworkTree().toPromise().then((res: any) => {
        if (res?.success && res?.data) {
          this.treeRoot = this.formatTree(res.data);
        }
      }).catch(err => console.warn('Network tree fetch error:', err))
    ]).finally(() => {
      if (!this.treeRoot && this.network.length > 0) {
        this.treeRoot = this.buildTreeFromFlatList(this.network);
      } else if (!this.treeRoot) {
        this.treeRoot = this.buildRootOnlyNode();
      }
      this.loading = false;
    });
  }

  private formatTree(rawRoot: any): TeamNode {
    const rootUser = this.profile?.full_name ? this.profile : (this.userData || {});
    const rootNode: TeamNode = {
      user_id: rawRoot.user_id || rootUser.user_id || 0,
      member_id: rawRoot.member_id || this.invitationCode || 'MMR001',
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

  private mapChildNode(rawNode: any, depth: number): TeamNode {
    const node: TeamNode = {
      user_id: rawNode.user_id,
      member_id: rawNode.member_id || `MMR${rawNode.user_id}`,
      full_name: rawNode.full_name || 'Associate Member',
      user_type: rawNode.user_type || 'Associate',
      sponsor_user_id: rawNode.sponsor_user_id,
      status: rawNode.status || rawNode.account_status || 'Active',
      rank: rawNode.rank || (depth === 1 ? 'Direct Member' : 'Team Member'),
      total_gaj_sold: Number(rawNode.total_gaj_sold || 0),
      commission_earned: Number(rawNode.commission_earned || 0),
      mobile_no: rawNode.mobile_no,
      level: depth,
      children: [],
      collapsed: false
    };

    if (Array.isArray(rawNode.children)) {
      node.children = rawNode.children.map((c: any) => this.mapChildNode(c, depth + 1));
    }

    return node;
  }

  private buildTreeFromFlatList(flatList: any[]): TeamNode {
    const u = this.profile?.full_name ? this.profile : (this.userData || {});
    const rootId = u.user_id || 0;
    const map = new Map<number, TeamNode>();

    const rootNode: TeamNode = {
      user_id: rootId,
      member_id: this.invitationCode || u.member_id || 'MMR001',
      full_name: u.full_name || 'My Profile',
      user_type: u.user_type || 'Associate',
      status: u.account_status || 'Active',
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
        full_name: item.full_name || 'Associate Member',
        user_type: item.user_type || 'Associate',
        sponsor_user_id: item.sponsor_user_id,
        status: item.account_status || 'Active',
        rank: `Level ${item.level || 1}`,
        total_gaj_sold: Number(item.total_gaj_sold || 0),
        commission_earned: Number(item.total_commission_earned || 0),
        mobile_no: item.mobile_no,
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

  private buildRootOnlyNode(): TeamNode {
    const u = this.profile?.full_name ? this.profile : (this.userData || {});
    return {
      user_id: u.user_id || 0,
      member_id: this.invitationCode || u.member_id || 'MMR001',
      full_name: u.full_name || 'Associate Partner',
      user_type: u.user_type || 'Associate',
      status: u.account_status || 'Active',
      rank: 'Root Associate',
      total_gaj_sold: 0,
      commission_earned: 0,
      level: 0,
      children: [],
      collapsed: false
    };
  }

  toggleNode(node: TeamNode): void {
    node.collapsed = !node.collapsed;
  }

  expandAll(): void {
    const setCollapsed = (node: TeamNode, state: boolean) => {
      node.collapsed = state;
      if (node.children) node.children.forEach(c => setCollapsed(c, state));
    };
    if (this.treeRoot) setCollapsed(this.treeRoot, false);
  }

  collapseAll(): void {
    const setCollapsed = (node: TeamNode, state: boolean) => {
      if (node !== this.treeRoot) node.collapsed = state;
      if (node.children) node.children.forEach(c => setCollapsed(c, state));
    };
    if (this.treeRoot) setCollapsed(this.treeRoot, true);
  }

  getNodeInitials(name: string): string {
    if (!name) return 'A';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get invitationCode(): string {
    return this.inviteData?.invitation_code ||
           this.inviteData?.invite_code ||
           this.inviteData?.member_id ||
           this.userData?.invitation_code ||
           this.userData?.invite_code ||
           this.userData?.member_id ||
           this.profile?.invitation_code ||
           this.profile?.member_id ||
           '';
  }

  get referralLink(): string {
    const code = this.invitationCode;
    return code ? `https://mmrconstructions.in/register?ref=${code}` : 'https://mmrconstructions.in/register';
  }

  copyCode() {
    navigator.clipboard.writeText(this.invitationCode || '');
    this.copied = true;
    setTimeout(() => this.copied = false, 2500);
  }

  copyLink() {
    navigator.clipboard.writeText(this.referralLink);
    this.copiedLink = true;
    setTimeout(() => this.copiedLink = false, 2500);
  }

  shareWhatsApp() {
    const msg = encodeURIComponent(`MMR Constructions & Developers में plot book करें! मेरा Referral Code: ${this.invitationCode} \nरजिस्टर करने के लिए लिंक: ${this.referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  }

  isFreeOrDisabled(node: TeamNode | any): boolean {
    if (!node) return false;
    const status = String(node.status || node.account_status || '').toLowerCase();
    const isFree = node.is_free === true || node.isFree === true || node.user_type === 'Free' || node.rank === 'Free';
    return isFree || status === 'free' || status === 'inactive' || status === 'pending' || status === 'disabled' || status === 'suspended' || status === 'blacklisted';
  }

  onNodeClick(node: TeamNode, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.isFreeOrDisabled(node)) {
      return; // Single click disabled
    }
  }

  onNodeDblClick(node: TeamNode, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    return; // Double click disabled
  }

  showListTooltip(m: any, event: MouseEvent): void {
    this.hoveredMember = m;
    this.tooltipPos = { x: event.clientX + 12, y: event.clientY + 12 };
  }

  hideListTooltip(): void {
    this.hoveredMember = null;
  }
}
