import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './my-team.component.html',
  styleUrls: ['./my-team.component.css']
})
export class MyTeamComponent implements OnInit {
  loading = true;
  errorMsg = '';
  currentUser: any = null;
  treeRoot: TeamMemberNode | null = null;
  flatList: any[] = [];
  viewMode: 'tree' | 'list' = 'tree';

  // Filters & Search
  searchTerm = '';
  statusFilter = 'all';
  copiedLink = false;

  // Calculated Stats
  totalTeamCount = 0;
  directCount = 0;
  totalNetworkGaj = 0;
  totalNetworkEarnings = 0;

  constructor(
    private api: ApiService,
    private auth: AuthService
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
      this.api.getProfile().toPromise().catch(() => null)
    ]).then(([treeRes, networkRes, profileRes]) => {
      if (profileRes?.success && profileRes?.data) {
        this.currentUser = profileRes.data;
        this.auth.setUserSession({ user: profileRes.data });
      }

      const flatData = (networkRes?.success && Array.isArray(networkRes.data)) ? networkRes.data : [];
      this.flatList = flatData;

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

    this.totalTeamCount = totalMembers;
    this.directCount = directMembers;
    this.totalNetworkGaj = totalGaj;
    this.totalNetworkEarnings = totalEarned;
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
    setTimeout(() => this.copiedLink = false, 2500);
  }

  shareWhatsapp(): void {
    const code = this.currentUser?.invitation_code || this.currentUser?.member_id || '';
    const text = encodeURIComponent(`Join my MMR Constructions Team Network! Referral Code: ${code}\nRegister link: ${this.referralLink}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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

  clearSearch(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
  }
}
