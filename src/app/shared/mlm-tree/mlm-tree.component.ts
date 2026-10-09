import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CommissionNotesComponent } from '../commission-notes/commission-notes.component';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';

type TreeMode = 'binary' | 'hierarchical';
type Audience = 'user' | 'associate' | 'admin';

export type MlmNode = {
  id: string;
  name: string;
  userId: string;
  memberCode: string;
  mobile: string;
  email: string;
  joinDate: string;
  status: 'Active' | 'Inactive' | 'Free';
  isFree: boolean;
  is_verified?: boolean;
  enrollment_status?: string;
  sponsorName?: string;
  sponsorId?: string;
  userType?: string;
  slotNumber?: number | null;
  directCount: number;
  teamCount: number;
  level: number;
  rank: string;
  salesGaj: number;
  commissionEarned: number;
  pendingCommission: number;
  profile_image_url?: string;
  purchasedPlotsCount?: number;
  purchasedAmount?: number;
  city?: string;
  expanded: boolean;
  loaded: boolean;
  hasMoreChildren?: boolean;
  children: MlmNode[];
  left?: MlmNode | null;
  right?: MlmNode | null;
};

const MAX_RENDER_NODES = 200;

@Component({
  selector: 'app-mlm-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, CommissionNotesComponent, VerifiedBadgeComponent],
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
  showCustomers = false;

  // Search
  searchTerm = '';
  searchResults: any[] = [];
  searchLoading = false;
  private searchDebounceTimer: any = null;

  // Breadcrumbs & Re-rooting
  currentRootId: string | number = 'ADMIN';
  breadcrumbs: Array<{ user_id: string | number; member_id: string; full_name: string; user_type?: string }> = [];

  // Context Menu & Modals
  contextMenu: { visible: boolean; x: number; y: number; node: MlmNode | null } = { visible: false, x: 0, y: 0, node: null };
  doubleClickConfirmModal: { visible: boolean; node: MlmNode | null } = { visible: false, node: null };
  selectedProfileNode: MlmNode | null = null;

  // Viewport & Pan / Zoom
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
  loadingChildrenForNodeId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.audience = this.route.snapshot.data['audience'] || 'user';
    this.loadTree();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    if (this.contextMenu.visible) {
      this.closeContextMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.closeContextMenu();
    this.closeProfileModal();
    this.closeConfirmModal();
  }

  get transform() {
    return `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  get visibleRoot() {
    return this.root;
  }

  get isRootAdminActive() {
    return this.currentRootId === 'ADMIN' || this.currentRootId === 'MMR-0' || this.currentRootId === 0;
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

  async loadTree(rootId: string | number = 'ADMIN') {
    this.loading = true;
    this.toast = '';
    this.currentRootId = rootId;

    if (this.audience === 'admin') {
      await this.loadAdminTree(rootId, 4);
    } else {
      await this.loadLegacyOrAssociateTree();
    }
    this.loading = false;
  }

  // ── ADMIN TREE LOADER ─────────────────────────────────────────────
  private async loadAdminTree(rootId: string | number = 'ADMIN', depth: number = 4) {
    try {
      const isRootAdmin = String(rootId).toUpperCase() === 'ADMIN' || rootId === '0' || rootId === 'MMR-0';

      // 1. Fetch breadcrumb path
      if (!isRootAdmin) {
        try {
          const pathRes: any = await firstValueFrom(this.api.adminGetNetworkTreePath(rootId));
          this.breadcrumbs = pathRes?.success && Array.isArray(pathRes.data) ? pathRes.data : [];
        } catch {
          this.breadcrumbs = [{ user_id: 'ADMIN', member_id: 'MMR-0', full_name: 'MMR Admin' }];
        }
      } else {
        this.breadcrumbs = [{ user_id: 'ADMIN', member_id: 'MMR-0', full_name: 'MMR Admin' }];
      }

      // 2. Fetch Tree Nodes
      const treeRes: any = await firstValueFrom(this.api.adminGetNetworkTree(rootId, depth, this.showCustomers));
      const rawNodes = treeRes?.success && treeRes.data?.nodes ? treeRes.data.nodes : [];

      if (!rawNodes || rawNodes.length === 0) {
        this.root = null;
        this.flatNodes = [];
        return;
      }

      this.root = this.buildAdminHierarchy(rawNodes, rootId);
      this.flatNodes = this.flatten(this.root);
      this.recalculate(this.root);
      this.focusedNode = this.root;

      if (this.flatNodes.length > MAX_RENDER_NODES) {
        this.toast = `Showing first ${MAX_RENDER_NODES} members for performance. Click expand or search to inspect downlines.`;
      }
    } catch (error: any) {
      this.toast = error?.message || 'Unable to load Admin Network Tree.';
    }
  }

  private buildAdminHierarchy(rawList: any[], rootId: string | number): MlmNode | null {
    const isRootAdmin = String(rootId).toUpperCase() === 'ADMIN' || rootId === '0' || rootId === 'MMR-0';
    const byId = new Map<string, MlmNode>();

    // Map raw DB objects to MlmNode
    const nodes: MlmNode[] = rawList.map((item, index) => {
      const node = this.toNode(item, item.level || 1, index);
      node.expanded = (item.level <= 3); // initial view expanded up to 4 levels
      node.loaded = true;
      byId.set(String(item.user_id), node);
      if (item.member_id) byId.set(String(item.member_id), node);
      return node;
    });

    let rootNode: MlmNode | null = null;

    if (isRootAdmin) {
      rootNode = byId.get('ADMIN') || nodes[0] || null;
    } else {
      rootNode = byId.get(String(rootId)) || nodes[0] || null;
    }

    if (!rootNode) return null;

    // Attach children based on sponsor_user_id
    nodes.forEach(node => {
      if (node === rootNode) return;
      const rawItem = rawList.find(r => String(r.user_id) === String(node.userId)) || {};
      const sponsorKey = rawItem.sponsor_user_id != null ? String(rawItem.sponsor_user_id) : '';

      if (!sponsorKey || sponsorKey === 'null' || sponsorKey === 'ADMIN') {
        // Direct child of Admin root
        if (rootNode && rootNode.userId === 'ADMIN') {
          rootNode.children.push(node);
        }
      } else {
        const parent = byId.get(sponsorKey);
        if (parent && parent !== node) {
          parent.children.push(node);
        } else if (isRootAdmin && rootNode) {
          // If parent is not in current view, fallback attach to root
          rootNode.children.push(node);
        }
      }
    });

    this.assignBinary(rootNode);
    return rootNode;
  }

  // ── LEGACY & ASSOCIATE PORTAL TREE LOADER ──────────────────────────
  private async loadLegacyOrAssociateTree() {
    try {
      const profile = await this.loadProfile();

      if (profile?.sponsor_name || profile?.sponsor_id) {
        this.sponsorInfo = {
          name: profile.sponsor_name || 'System Admin',
          id: profile.sponsor_id || profile.sponsor_member_id || 'MMR0001',
          mobile: profile.sponsor_mobile || '',
          email: profile.sponsor_email || ''
        };
      }

      const network = await this.loadNetwork();
      const limitedNetwork = network.slice(0, MAX_RENDER_NODES);

      this.root = this.buildTree(profile, limitedNetwork);
      this.flatNodes = this.flatten(this.root);
      this.recalculate(this.root);
      this.focusedNode = this.root;
      this.collapseAll();
      if (this.root) this.root.expanded = true;

      if (network.length > MAX_RENDER_NODES) {
        this.toast = `Showing first ${MAX_RENDER_NODES} of ${network.length} members for performance. Use search to find specific members.`;
      }
    } catch (error: any) {
      this.toast = error?.message || 'Unable to load MLM tree.';
    }
  }

  private async loadProfile() {
    try {
      const response: any = await firstValueFrom(this.api.getProfile());
      return response?.success ? response.data : (this.auth.getUser() || {});
    } catch {
      return this.auth.getUser() || {};
    }
  }

  private async loadNetwork() {
    if (this.audience === 'associate') {
      try {
        const tmRes: any = await firstValueFrom(this.api.getAssociateTeamMembers()).catch(() => null);
        const tmList = tmRes?.success && Array.isArray(tmRes.data) ? tmRes.data : [];
        if (tmList.length > 0) return tmList;
        const response: any = await firstValueFrom(this.api.getAssocNetwork()).catch(() => null);
        return response?.success ? (response.data || []) : [];
      } catch {
        return [];
      }
    }

    try {
      const response: any = await firstValueFrom(this.api.getAssocNetwork());
      return response?.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }

  private buildTree(profile: any, network: any[]) {
    const root = this.toNode(profile, 1, 0);

    if (this.audience === 'associate') {
      root.children = [];
      const teamList = Array.isArray(network) ? network : [];
      const validTeamMembers = teamList.filter(item => {
        const type = String(item.user_type || item.role || '').toLowerCase();
        return type !== 'customer';
      });

      const slotMap = new Map<number, any>();
      const unslotted: any[] = [];
      validTeamMembers.forEach((item: any) => {
        const s = Number(item.slot_number);
        if (s >= 1 && s <= 10) {
          slotMap.set(s, item);
        } else {
          unslotted.push(item);
        }
      });

      let unslottedIdx = 0;
      for (let s = 1; s <= 10; s++) {
        let member = slotMap.get(s);
        if (!member && unslottedIdx < unslotted.length) {
          member = unslotted[unslottedIdx++];
        }

        if (member) {
          const node = this.toNode(member, 2, s);
          node.rank = `Slot #${s} · Team Member`;
          node.status = 'Active';
          node.isFree = false;
          (node as any).slotNumber = s;
          (node as any).isEmptySlot = false;
          root.children.push(node);
        } else {
          const emptyNode: MlmNode = {
            id: `empty-slot-${s}`,
            name: `Slot #${s} (Available)`,
            userId: `SLOT-${s}`,
            memberCode: `AVAILABLE`,
            mobile: '—',
            email: '—',
            joinDate: '',
            status: 'Inactive',
            isFree: true,
            is_verified: false,
            directCount: 0,
            teamCount: 0,
            level: 2,
            rank: `Slot #${s} · Open`,
            salesGaj: 0,
            commissionEarned: 0,
            pendingCommission: 0,
            expanded: false,
            loaded: true,
            children: [],
            left: null,
            right: null
          };
          (emptyNode as any).slotNumber = s;
          (emptyNode as any).isEmptySlot = true;
          root.children.push(emptyNode);
        }
      }

      this.assignBinary(root);
      return root;
    }

    const nodes = network.map((item, index) => this.toNode(item, Math.min(Number(item.level || item.depth || 2), this.maxDepthAllowed), index + 1));
    const byId = new Map<string, MlmNode>();

    const indexNode = (node: MlmNode) => {
      if (node.userId) byId.set(String(node.userId), node);
      if (node.memberCode) byId.set(String(node.memberCode), node);
      if (node.id) byId.set(String(node.id), node);
    };

    indexNode(root);
    nodes.forEach(node => indexNode(node));

    let attached = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const item = network[i] || {};
      const sponsorKey = item.sponsor_user_id ? String(item.sponsor_user_id) : '';
      const sponsorMemberKey = item.sponsor_member_id || item.sponsor_id || item.parent_member_id ? String(item.sponsor_member_id || item.sponsor_id || item.parent_member_id) : '';
      
      const parent = (sponsorKey ? byId.get(sponsorKey) : null) || 
                     (sponsorMemberKey ? byId.get(sponsorMemberKey) : null) || 
                     (node.sponsorId ? byId.get(String(node.sponsorId)) : null);

      if (parent && parent !== node) {
        parent.children.push(node);
        attached++;
      } else if (sponsorKey && (sponsorKey === String(root.userId) || sponsorKey === String(profile?.user_id) || sponsorKey === String(profile?.id))) {
        root.children.push(node);
        attached++;
      } else if (sponsorMemberKey && (sponsorMemberKey === String(root.memberCode) || sponsorMemberKey === String(profile?.member_id))) {
        root.children.push(node);
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
    const direct = Number(item.children_count ?? item.direct_referrals ?? item.direct_count ?? 0);
    const team = Number(item.downline_count ?? item.total_team_count ?? item.team_count ?? direct);
    const rawStatus = String(item.account_status || item.status || 'Active').toLowerCase();
    const isFree = item.is_free === true || item.isFree === true || rawStatus === 'free' || rawStatus === 'inactive' || rawStatus === 'pending' || rawStatus === 'suspended' || rawStatus === 'blacklisted';

    let displayStatus: 'Active' | 'Inactive' | 'Free' = 'Active';
    if (rawStatus === 'free') displayStatus = 'Free';
    else if (rawStatus === 'inactive' || rawStatus === 'pending' || rawStatus === 'suspended' || rawStatus === 'blacklisted') displayStatus = 'Inactive';

    const rankTitle = item.slot_number != null
      ? `Slot #${item.slot_number} · Team Member`
      : (item.user_type === 'Team Member' ? 'Team Member' : (item.user_type === 'Admin' ? 'System Administrator' : (item.rank || this.rankFor(direct))));

    return {
      id: this.nodeId(item) || `node-${index}`,
      name: item.full_name || item.name || item.associate_name || item.email || 'Member',
      userId: String(item.user_id ?? item.id ?? item.member_id ?? `U-${index}`),
      memberCode: item.member_id || item.member_code || item.invitation_code || item.referral_code || `MMR-${index}`,
      mobile: item.mobile_no || item.mobile || '—',
      email: item.email || '—',
      joinDate: item.registered_at || item.created_at || item.join_date || '',
      status: displayStatus,
      isFree: isFree,
      is_verified: item.is_verified === true || item.isVerified === true || item.enrollment_status === 'Completed' || item.enrollment_status === 'submitted' || item.is_enrolled === true,
      enrollment_status: item.enrollment_status,
      sponsorName: item.sponsor_name || '',
      sponsorId: item.sponsor_member_id || (item.sponsor_user_id ? String(item.sponsor_user_id) : ''),
      userType: item.user_type || (item.slot_number != null ? 'Team Member' : 'Associate'),
      slotNumber: item.slot_number != null ? Number(item.slot_number) : null,
      directCount: direct,
      teamCount: team,
      level: Math.min(Math.max(0, fallbackLevel), this.maxDepthAllowed),
      rank: rankTitle,
      salesGaj: Number(item.sales_gaj ?? item.total_gaj_sold ?? 0),
      commissionEarned: Number(item.commission_earned ?? item.total_commission_earned ?? 0),
      pendingCommission: Number(item.pending_commission || 0),
      profile_image_url: item.profile_image_url || '',
      purchasedPlotsCount: Number(item.total_purchased_plots || item.purchased_plots_count || 0),
      purchasedAmount: Number(item.total_purchased_amount || item.purchased_amount || 0),
      city: item.city || item.location || '',
      expanded: fallbackLevel <= 3,
      loaded: fallbackLevel <= 3,
      hasMoreChildren: direct > 0,
      children: [],
      left: null,
      right: null,
    };
  }

  private nodeId(item: any) {
    return String(item.user_id ?? item.member_id ?? item.id ?? item.associate_id ?? item.email ?? '');
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
    if (this.audience !== 'admin') {
      node.directCount = node.children.length || node.directCount;
      node.teamCount = node.children.length + childTeam;
      node.rank = this.rankFor(node.directCount);
    }
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

  // ── LAZY EXPANSION / TOGGLE ────────────────────────────────────────
  async toggleNode(node: MlmNode, event?: Event) {
    event?.stopPropagation();

    if (node.expanded) {
      node.expanded = false;
      return;
    }

    if (this.audience === 'admin' && node.userId !== 'ADMIN' && node.directCount > 0 && node.children.length === 0) {
      this.loadingChildrenForNodeId = node.userId;
      try {
        const res: any = await firstValueFrom(this.api.adminGetNetworkTreeChildren(node.userId, 1, 100, this.showCustomers));
        const childItems = res?.success && res.data?.items ? res.data.items : [];

        node.children = childItems.map((c: any, idx: number) => {
          const childNode = this.toNode(c, node.level + 1, idx);
          childNode.expanded = false;
          childNode.loaded = false;
          return childNode;
        });

        node.loaded = true;
      } catch (err: any) {
        this.toast = `Failed to load downlines for ${node.name}: ${err?.message || ''}`;
      } finally {
        this.loadingChildrenForNodeId = null;
      }
    }

    node.expanded = true;
    this.flatNodes = this.flatten(this.root);
    this.recalculate(this.root);
  }

  // ── SEARCH & RE-ROOTING ────────────────────────────────────────────
  search(term?: string) {
    if (typeof term === 'string') {
      this.searchTerm = term;
    }
    this.onSearchInput();
  }

  onSearchInput() {
    clearTimeout(this.searchDebounceTimer);
    const term = this.searchTerm.trim();
    if (!term || term.length < 2) {
      this.searchResults = [];
      this.searchLoading = false;
      return;
    }

    this.searchLoading = true;
    this.searchDebounceTimer = setTimeout(async () => {
      if (this.audience === 'admin') {
        try {
          const res: any = await firstValueFrom(this.api.adminSearchNetworkTree(term, 20));
          this.searchResults = res?.success && Array.isArray(res.data) ? res.data : [];
        } catch {
          this.searchResults = [];
        } finally {
          this.searchLoading = false;
        }
      } else {
        const lower = term.toLowerCase();
        this.searchResults = this.flatNodes.filter(node =>
          [node.userId, node.memberCode, node.name, node.mobile].some(value => String(value || '').toLowerCase().includes(lower))
        ).slice(0, 10);
        this.searchLoading = false;
      }
    }, 300);
  }

  selectSearchResult(result: any) {
    this.searchResults = [];
    this.searchTerm = `${result.full_name || result.name} (${result.member_id || result.memberCode})`;

    if (this.audience === 'admin') {
      const targetId = result.user_id || result.userId;
      if (targetId) {
        this.reRootTree(targetId);
      }
    } else {
      const node = this.flatNodes.find(n => n.userId === String(result.userId || result.user_id));
      if (node) {
        this.focusNode(node);
      }
    }
  }

  reRootTree(userId: string | number) {
    this.loadTree(userId);
    this.resetView();
  }

  resetToAdminRoot() {
    this.searchTerm = '';
    this.searchResults = [];
    this.loadTree('ADMIN');
    this.resetView();
  }

  toggleShowCustomers() {
    this.showCustomers = !this.showCustomers;
    this.loadTree(this.currentRootId);
  }

  // ── CONTEXT MENU & DOUBLE CLICK ───────────────────────────────────
  onNodeContextMenu(node: MlmNode, event?: MouseEvent) {
    if (this.audience !== 'admin') return;
    event?.preventDefault();
    event?.stopPropagation();

    this.contextMenu = {
      visible: true,
      x: event ? event.clientX : 100,
      y: event ? event.clientY : 100,
      node
    };
  }

  closeContextMenu() {
    this.contextMenu.visible = false;
    this.contextMenu.node = null;
  }

  onNodeDblClick(node: MlmNode, event?: MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.audience === 'admin') {
      if (node.userId === 'ADMIN' || node.id === 'ADMIN') return;
      this.doubleClickConfirmModal = { visible: true, node };
    } else {
      this.selectedProfileNode = node;
    }
  }

  closeConfirmModal() {
    this.doubleClickConfirmModal.visible = false;
    this.doubleClickConfirmModal.node = null;
  }

  confirmImpersonateLogin() {
    const node = this.doubleClickConfirmModal.node || this.contextMenu.node;
    this.closeConfirmModal();
    this.closeContextMenu();

    if (node) {
      this.toast = `Coming in Phase 3: Secure Login as ${node.name} (${node.memberCode})`;
    }
  }

  openInDirectory(node: MlmNode) {
    this.closeContextMenu();
    if (node.userType === 'Team Member') {
      this.router.navigate(['/admin/team-members'], { queryParams: { q: node.memberCode } });
    } else {
      this.router.navigate(['/admin/associates'], { queryParams: { q: node.memberCode } });
    }
  }

  // ── TOOLBAR ACTIONS ───────────────────────────────────────────────
  setTree(mode: TreeMode) {
    this.activeTree = mode;
    this.resetView();
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

  showTooltip(node: MlmNode, event?: MouseEvent) {
    this.hoveredNode = node;
    if (event) {
      this.tooltip = { x: event.clientX + 12, y: event.clientY + 12 };
    }
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

  onNodeClick(node: MlmNode, event?: MouseEvent) {
    event?.stopPropagation();
    event?.preventDefault();
    this.selectedProfileNode = node;
  }

  closeProfileModal() {
    this.selectedProfileNode = null;
  }

  focusSelectedNode() {
    if (this.selectedProfileNode) {
      this.focusNode(this.selectedProfileNode);
      this.selectedProfileNode = null;
    }
  }

  getProfileImageUrl(node: MlmNode): string {
    const url = node?.profile_image_url;
    if (!url) {
      const name = encodeURIComponent(node?.name || 'Member');
      return `https://ui-avatars.com/api/?name=${name}&background=062b18&color=e8c97a&size=180&bold=true`;
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return this.api.url(url);
  }

  focusNode(node: MlmNode) {
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
