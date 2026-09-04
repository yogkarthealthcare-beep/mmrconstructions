import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CommissionNotesComponent } from '../commission-notes/commission-notes.component';

type TreeMode = 'binary' | 'hierarchical';
type Audience = 'user' | 'associate' | 'admin';

type MlmNode = {
  id: string;
  name: string;
  userId: string;
  memberCode: string;
  mobile: string;
  email: string;
  joinDate: string;
  status: 'Active' | 'Inactive' | 'Free';
  isFree: boolean;
  sponsorName?: string;
  sponsorId?: string;
  directCount: number;
  teamCount: number;
  level: number;
  rank: string;
  salesGaj: number;
  commissionEarned: number;
  pendingCommission: number;
  expanded: boolean;
  loaded: boolean;
  children: MlmNode[];
  left?: MlmNode | null;
  right?: MlmNode | null;
};

// FIX 8: Hard cap on rendered nodes — rendering 500+ nodes at once was
// causing the browser's main thread to freeze (the root cause of the
// "Page Unresponsive" popup after Tree Architecture was added)
const MAX_RENDER_NODES = 200;

@Component({
  selector: 'app-mlm-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, CommissionNotesComponent],
  templateUrl: './mlm-tree.component.html',
  styleUrls: ['./mlm-tree.component.css']
})
export class MlmTreeComponent implements OnInit {
  @ViewChild('treeViewport') treeViewport?: ElementRef<HTMLDivElement>;

  audience: Audience = 'user';
  activeTree: TreeMode = 'hierarchical';
  loading = true;
  toast = '';
  showInfoPanel = false;
  searchTerm = '';
  searchResults: MlmNode[] = [];
  focusedNode: MlmNode | null = null;
  hoveredNode: MlmNode | null = null;
  tooltip = { x: 0, y: 0 };
  zoom = 1;
  pan = { x: 0, y: 0 };
  isPanning = false;
  private panStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };

  root: MlmNode | null = null;
  flatNodes: MlmNode[] = [];
  maxDepthAllowed = 12;
  sponsorInfo: { name: string; id: string; mobile?: string; email?: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.audience = this.route.snapshot.data['audience'] || 'user';
    this.loadTree();
  }

  get transform() {
    return `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  get visibleRoot() {
    return this.root;
  }

  get stats() {
    const total = this.flatNodes.length;
    const active = this.flatNodes.filter(node => node.status === 'Active').length;
    const inactive = total - active;
    return {
      total,
      active,
      inactive,
      currentLevel: this.focusedNode?.level || this.root?.level || 1,
      maxDepth: Math.max(0, ...this.flatNodes.map(node => node.level)),
      binary: total,
      hierarchical: total,
    };
  }

  get highestRankMembers() {
    const score = (rank: string) => ['Starter', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crown Diamond'].indexOf(rank);
    return [...this.flatNodes].sort((a, b) => score(b.rank) - score(a.rank) || b.teamCount - a.teamCount).slice(0, 5);
  }

  get topRecruiters() {
    return [...this.flatNodes].sort((a, b) => b.directCount - a.directCount).slice(0, 5);
  }

  get recentlyJoined() {
    return [...this.flatNodes].sort((a, b) => new Date(b.joinDate || 0).getTime() - new Date(a.joinDate || 0).getTime()).slice(0, 5);
  }

  async loadTree() {
    this.loading = true;
    this.toast = '';
    try {
      const profile = this.audience === 'admin'
        ? (this.auth.getAdminUser() || { full_name: 'Admin', member_id: 'ADMIN' })
        : await this.loadProfile();

      if (profile?.sponsor_name || profile?.sponsor_id) {
        this.sponsorInfo = {
          name: profile.sponsor_name || 'System Admin',
          id: profile.sponsor_id || profile.sponsor_member_id || 'MMR0001',
          mobile: profile.sponsor_mobile || '',
          email: profile.sponsor_email || ''
        };
      }

      const network = await this.loadNetwork();

      // FIX 8: Limit network to MAX_RENDER_NODES before building the tree
      // A very large network (1000+ nodes) previously caused main-thread freeze
      const limitedNetwork = network.slice(0, MAX_RENDER_NODES);

      this.root = this.buildTree(profile, limitedNetwork);
      this.flatNodes = this.flatten(this.root);
      this.recalculate(this.root);
      this.focusedNode = this.root;
      this.collapseAll();
      if (this.root) this.root.expanded = true;

      // Show info if data was trimmed
      if (network.length > MAX_RENDER_NODES) {
        this.toast = `Showing first ${MAX_RENDER_NODES} of ${network.length} members for performance. Use search to find specific members.`;
      }
    } catch (error: any) {
      this.toast = error?.message || 'Unable to load MLM tree.';
    } finally {
      this.loading = false;
    }
  }

  // FIX 9: toPromise() replaced with firstValueFrom() — toPromise() is deprecated
  // and can silently hang, contributing to page freeze
  private async loadProfile() {
    try {
      const response: any = await firstValueFrom(this.api.getProfile());
      return response?.success ? response.data : (this.auth.getUser() || {});
    } catch {
      return this.auth.getUser() || {};
    }
  }

  private async loadNetwork() {
    if (this.audience === 'admin') {
      try {
        const response: any = await firstValueFrom(this.api.adminGetMlmNetwork());
        return response?.success ? (response.data || []) : [];
      } catch {
        return [];
      }
    }

    try {
      // FIX 9: toPromise() → firstValueFrom()
      const response: any = await firstValueFrom(this.api.getAssocNetwork());
      return response?.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }

  private buildTree(profile: any, network: any[]) {
    const root = this.toNode(profile, 1, 0);
    const nodes = network.map((item, index) => this.toNode(item, Math.min(Number(item.level || item.depth || 2), this.maxDepthAllowed), index + 1));
    const byId = new Map<string, MlmNode>([[root.id, root], ...nodes.map(node => [node.id, node] as [string, MlmNode])]);
    let attached = 0;

    for (const node of nodes) {
      const parentKey = String((network.find(item => this.nodeId(item) === node.id) || {}).parent_member_id || (network.find(item => this.nodeId(item) === node.id) || {}).sponsor_user_id || (network.find(item => this.nodeId(item) === node.id) || {}).sponsor_member_id || '');
      const parent = byId.get(parentKey);
      if (parent && node.level > parent.level && node.level <= this.maxDepthAllowed) {
        parent.children.push(node);
        attached++;
      }
    }

    if (!attached) {
      for (const node of nodes) {
        if (node.level <= 2) root.children.push(node);
      }
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.level <= 2) continue;
        const parent = nodes.find(candidate => candidate.level === node.level - 1 && candidate.children.length < 4) || root;
        parent.children.push(node);
      }
    }

    this.assignBinary(root);
    return root;
  }

  private toNode(item: any, fallbackLevel: number, index: number): MlmNode {
    const direct = Number(item.direct_referrals || item.direct_count || item.direct_network_count || item.children_count || 0);
    const team = Number(item.total_team_count || item.team_count || item.total_network_count || item.total_downline || direct);
    const rawStatus = String(item.account_status || item.status || 'Active').toLowerCase();
    const isFree = item.is_free === true || item.isFree === true || rawStatus === 'free' || rawStatus === 'inactive' || rawStatus === 'pending' || rawStatus === 'suspended' || rawStatus === 'blacklisted';

    let displayStatus: 'Active' | 'Inactive' | 'Free' = 'Active';
    if (rawStatus === 'free') displayStatus = 'Free';
    else if (rawStatus === 'inactive' || rawStatus === 'pending' || rawStatus === 'suspended' || rawStatus === 'blacklisted') displayStatus = 'Inactive';

    return {
      id: this.nodeId(item) || `node-${index}`,
      name: item.full_name || item.name || item.associate_name || item.email || 'Member',
      userId: item.user_id || item.id || item.member_id || `U-${index}`,
      memberCode: item.member_code || item.member_id || item.invitation_code || item.referral_code || `MMR-${index}`,
      mobile: item.mobile_no || item.mobile || '-',
      email: item.email || '-',
      joinDate: item.registered_at || item.created_at || item.join_date || item.joining_date || new Date().toISOString(),
      status: displayStatus,
      isFree: isFree,
      sponsorName: item.sponsor_name || '',
      sponsorId: item.sponsor_id || item.sponsor_member_id || (item.sponsor_user_id ? String(item.sponsor_user_id) : ''),
      directCount: direct,
      teamCount: team,
      level: Math.min(Math.max(1, fallbackLevel || 1), this.maxDepthAllowed),
      rank: this.rankFor(direct),
      salesGaj: Number(item.total_gaj_sold || 0),
      commissionEarned: Number(item.total_commission_earned || item.commission_earned || 0),
      pendingCommission: Number(item.pending_commission || 0),
      expanded: fallbackLevel <= 2,
      loaded: fallbackLevel <= 2,
      children: [],
      left: null,
      right: null,
    };
  }

  private nodeId(item: any) {
    return String(item.member_id || item.user_id || item.id || item.associate_id || item.email || '');
  }

  private assignBinary(node: MlmNode) {
    const children = node.children.filter(child => child.level <= this.maxDepthAllowed);
    node.left = children[0] || null;
    node.right = children[1] || null;
    children.forEach(child => this.assignBinary(child));
  }

  private flatten(root: MlmNode | null): MlmNode[] {
    if (!root) return [];
    return [root, ...root.children.flatMap(child => this.flatten(child))];
  }

  private recalculate(node: MlmNode | null): number {
    if (!node) return 0;
    node.children = node.children.filter(child => child.level <= this.maxDepthAllowed);
    node.children.forEach(child => child.level = Math.min(this.maxDepthAllowed, Math.max(node.level + 1, child.level)));
    const childTeam = node.children.reduce((sum, child) => sum + this.recalculate(child), 0);
    node.directCount = node.children.length || node.directCount;
    node.teamCount = node.children.length + childTeam;
    node.rank = this.rankFor(node.directCount);
    this.assignBinary(node);
    return node.teamCount;
  }

  rankFor(count: number) {
    if (count >= 500) return 'Crown Diamond';
    if (count >= 250) return 'Diamond';
    if (count >= 100) return 'Platinum';
    if (count >= 50)  return 'Gold';
    if (count >= 25)  return 'Silver';
    if (count >= 10)  return 'Bronze';
    return 'Starter';
  }

  setTree(mode: TreeMode) {
    this.activeTree = mode;
    this.resetView();
  }

  toggleNode(node: MlmNode, event?: Event) {
    event?.stopPropagation();
    if (node.level >= this.maxDepthAllowed && !node.expanded) {
      this.toast = 'Maximum 12 binary/MLM levels allowed.';
      return;
    }
    node.loaded = true;
    node.expanded = !node.expanded;
  }

  expandAll() {
    this.flatNodes.forEach(node => {
      if (node.level < this.maxDepthAllowed) {
        node.expanded = true;
        node.loaded = true;
      }
    });
  }

  collapseAll() {
    this.flatNodes.forEach(node => node.expanded = false);
    if (this.root) this.root.expanded = true;
  }

  zoomIn()    { this.zoom = Math.min(2.2, this.zoom + 0.12); }
  zoomOut()   { this.zoom = Math.max(0.35, this.zoom - 0.12); }
  resetView() { this.zoom = 1; this.pan = { x: 0, y: 0 }; }
  centerCurrentUser() { this.focusedNode = this.root; this.resetView(); }

  startPan(event: PointerEvent) {
    this.isPanning = true;
    this.panStart = { x: event.clientX, y: event.clientY };
    this.panOrigin = { ...this.pan };
  }

  movePan(event: PointerEvent) {
    if (!this.isPanning) return;
    this.pan = {
      x: this.panOrigin.x + event.clientX - this.panStart.x,
      y: this.panOrigin.y + event.clientY - this.panStart.y,
    };
  }

  endPan() { this.isPanning = false; }

  showTooltip(node: MlmNode, event: MouseEvent) {
    this.hoveredNode = node;
    this.tooltip = { x: event.clientX + 12, y: event.clientY + 12 };
  }

  search() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) { this.searchResults = []; return; }
    this.searchResults = this.flatNodes.filter(node =>
      [node.userId, node.memberCode, node.name, node.mobile].some(value => String(value || '').toLowerCase().includes(term))
    ).slice(0, 10);
  }

  isSearchMatch(node: MlmNode) {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return false;
    return [node.userId, node.memberCode, node.name].some(value => String(value || '').toLowerCase().includes(term));
  }

  isFreeOrDisabled(node: MlmNode | any): boolean {
    if (!node) return false;
    if (node.isFree === true) return true;
    const status = String(node.status || node.account_status || '').toLowerCase();
    return status === 'free' || status === 'inactive' || status === 'pending' || status === 'disabled' || status === 'suspended' || status === 'blacklisted';
  }

  onNodeClick(node: MlmNode, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    // 1. Single click MUST NOT work on Free/Disabled account records
    if (this.isFreeOrDisabled(node)) {
      return;
    }
    this.focusNode(node);
  }

  onNodeDblClick(node: MlmNode, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    // 2. Double click MUST NOT work on Free/Disabled records (no action)
    return;
  }

  focusNode(node: MlmNode) {
    if (this.isFreeOrDisabled(node)) {
      return;
    }
    this.focusedNode = node;
    node.loaded = true;
    node.expanded = true;
    this.searchResults = [];
    this.searchTerm = `${node.name} (${node.memberCode})`;
    this.zoom = 1.15;
    this.pan = { x: 0, y: 0 };
  }

  exportTree(type: 'svg' | 'png' | 'pdf') {
    if (type === 'pdf') { window.print(); return; }
    const svg = this.buildExportSvg();
    if (type === 'svg') { this.download(`mlm-${this.activeTree}-tree.svg`, svg, 'image/svg+xml'); return; }
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1400; canvas.height = 900;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => { if (blob) this.downloadBlob(`mlm-${this.activeTree}-tree.png`, blob); });
    };
    image.src = url;
  }

  printTree() { window.print(); }

  private buildExportSvg() {
    const nodes = this.flatNodes.slice(0, 220);
    const rows = nodes.map((node, index) => {
      const x = 40 + (node.level - 1) * 190;
      const y = 40 + index * 56;
      return `<g><rect x="${x}" y="${y}" width="160" height="42" rx="8" fill="#f8fafc" stroke="#1a5c3a"/><text x="${x + 10}" y="${y + 17}" font-family="Arial" font-size="12" font-weight="700">${this.escapeXml(node.name)}</text><text x="${x + 10}" y="${y + 32}" font-family="Arial" font-size="10">${this.escapeXml(node.memberCode)} - ${this.escapeXml(node.rank)}</text></g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900"><rect width="1400" height="900" fill="#ffffff"/><text x="40" y="24" font-family="Arial" font-size="18" font-weight="700">MLM ${this.activeTree} Tree</text>${rows}</svg>`;
  }

  private escapeXml(value: string) {
    return String(value || '').replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char] || char));
  }

  private download(filename: string, content: string, type: string) {
    this.downloadBlob(filename, new Blob([content], { type }));
  }

  private downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
