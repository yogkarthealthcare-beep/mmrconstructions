import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

export interface MasterTableInfo {
  tableName: string;
  rowCount: number;
  columnCount: number;
  category: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPk: boolean;
  default: string | null;
}

export interface EntityTableDef {
  tableName: string;
  label: string;
  description: string;
  icon: string;
}

export interface EntityConfig {
  key: string;
  title: string;
  hindiTitle: string;
  icon: string;
  badgeClass: string;
  description: string;
  userType?: string;
  primaryTable: string;
  tables: EntityTableDef[];
}

@Component({
  selector: 'app-master-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-data.component.html',
  styleUrls: ['./master-data.component.css']
})
export class MasterDataComponent implements OnInit {
  // Loading & Error States
  loadingTables = false;
  loadingData = false;
  savingRow = false;
  deletingRow = false;
  errorMessage = '';
  successMessage = '';

  // ── 4 CORE ENTITIES + ALL TABLES CONFIGURATION ──────────────────
  entities: EntityConfig[] = [
    {
      key: 'associate',
      title: 'Associate',
      hindiTitle: 'एसोसिएट',
      icon: 'fas fa-handshake',
      badgeClass: 'badge-associate',
      description: 'Manage associate registrations, sponsorships, KYC, nominee, bank accounts, and payout requests.',
      userType: 'associate',
      primaryTable: 'users',
      tables: [
        { tableName: 'users', label: 'Associates Accounts', description: 'Filtered users with Associate role', icon: 'fas fa-user-group' },
        { tableName: 'associate_enrollment', label: 'KYC & Enrollment', description: 'Personal, KYC, and document verification records', icon: 'fas fa-id-card' },
        { tableName: 'associate_sponsor', label: 'Sponsors & Tree', description: 'Associate sponsor links and tree placements', icon: 'fas fa-sitemap' },
        { tableName: 'associate_nominee', label: 'Nominees', description: 'Registered nominee details', icon: 'fas fa-users' },
        { tableName: 'associate_bank_details', label: 'Bank Accounts', description: 'Verified bank accounts and IFSC details', icon: 'fas fa-building-columns' },
        { tableName: 'associate_address', label: 'Addresses', description: 'Permanent and correspondence addresses', icon: 'fas fa-location-dot' },
        { tableName: 'associate_referral_links', label: 'Referral Links', description: 'Active and legacy referral codes', icon: 'fas fa-link' },
        { tableName: 'associate_ranks', label: 'Ranks & Levels', description: 'Rank promotions and badges', icon: 'fas fa-award' },
        { tableName: 'associate_payout_requests', label: 'Payout Requests', description: 'Withdrawal and commission payouts', icon: 'fas fa-receipt' },
        { tableName: 'referral_registrations', label: 'Referral Signups', description: 'Direct referral registration tracking', icon: 'fas fa-user-plus' },
        { tableName: 'user_wallets', label: 'Associate Wallets', description: 'E-wallet balance and commissions', icon: 'fas fa-wallet' }
      ]
    },
    {
      key: 'team_member',
      title: 'Team Member',
      hindiTitle: 'टीम मेंबर',
      icon: 'fas fa-users-gear',
      badgeClass: 'badge-teammember',
      description: 'Manage team member registry (UID MMR-TM-0001), parent associate slot allocations, and user accounts.',
      userType: 'team_member',
      primaryTable: 'team_members',
      tables: [
        { tableName: 'team_members', label: 'Team Members Registry', description: 'Core team members table with UID, associate ID & status', icon: 'fas fa-id-badge' },
        { tableName: 'users', label: 'Team Member Accounts', description: 'Filtered users with Team Member role', icon: 'fas fa-users-gear' },
        { tableName: 'user_wallets', label: 'Team Member Wallets', description: 'Team member wallet ledger and transactions', icon: 'fas fa-wallet' },
        { tableName: 'bookings', label: 'Member Bookings', description: 'Bookings sold or attributed to team members', icon: 'fas fa-clipboard-check' }
      ]
    },
    {
      key: 'customer',
      title: 'Customer',
      hindiTitle: 'कस्टमर',
      icon: 'fas fa-user-check',
      badgeClass: 'badge-customer',
      description: 'Manage plot buyers, customer profiles, KYC submissions, bookings, receipts, invoices, and EMI schedules.',
      userType: 'customer',
      primaryTable: 'users',
      tables: [
        { tableName: 'users', label: 'Customer Accounts', description: 'Filtered users with Customer role', icon: 'fas fa-user' },
        { tableName: 'customer_enrollment_submissions', label: 'Customer KYC', description: 'Customer KYC forms and identity proof', icon: 'fas fa-file-lines' },
        { tableName: 'customer_nominees', label: 'Customer Nominees', description: 'Nominees declared for plot ownership', icon: 'fas fa-users' },
        { tableName: 'bookings', label: 'Plot Bookings', description: 'Customer plot reservations and sales', icon: 'fas fa-map-location-dot' },
        { tableName: 'receipts', label: 'Receipts', description: 'Issued payment receipts', icon: 'fas fa-receipt' },
        { tableName: 'invoices', label: 'Invoices', description: 'Customer billing invoices', icon: 'fas fa-file-invoice-dollar' },
        { tableName: 'emi_schedules', label: 'EMI Schedules', description: 'Monthly EMI installment plans', icon: 'fas fa-calendar-check' },
        { tableName: 'inquiries', label: 'Inquiries', description: 'General customer inquiries and requests', icon: 'fas fa-circle-question' },
        { tableName: 'book_plot_leads', label: 'Plot Leads', description: 'Direct website plot booking inquiries', icon: 'fas fa-bullhorn' }
      ]
    },
    {
      key: 'investor',
      title: 'Investor',
      hindiTitle: 'इन्वेस्टर',
      icon: 'fas fa-piggy-bank',
      badgeClass: 'badge-investor',
      description: 'Manage investor master profiles, credentials, deposits, transaction ledgers, withdrawal requests, and legal documents.',
      userType: 'investor',
      primaryTable: 'investors',
      tables: [
        { tableName: 'investors', label: 'Investors Master', description: 'Core investor profiles and investment tiers', icon: 'fas fa-briefcase' },
        { tableName: 'investor_users', label: 'Investor Logins', description: 'Investor portal credentials and authentication', icon: 'fas fa-key' },
        { tableName: 'users', label: 'Investor Accounts (Users)', description: 'Filtered platform users with Investor role', icon: 'fas fa-user-tie' },
        { tableName: 'investor_enrollments', label: 'Enrollments', description: 'Investor application submissions', icon: 'fas fa-file-signature' },
        { tableName: 'investor_transactions', label: 'Transactions Ledger', description: 'Financial credits and debits', icon: 'fas fa-money-check-dollar' },
        { tableName: 'investor_deposits', label: 'Deposits', description: 'Capital deposits received', icon: 'fas fa-wallet' },
        { tableName: 'investor_withdrawals', label: 'Withdrawals', description: 'Returns and fund withdrawal requests', icon: 'fas fa-hand-holding-dollar' },
        { tableName: 'investor_documents', label: 'Documents & KYC', description: 'Agreements, PAN, and KYC proofs', icon: 'fas fa-file-contract' },
        { tableName: 'investor_notifications', label: 'Notifications', description: 'Investor alerts and logs', icon: 'fas fa-bell' }
      ]
    },
    {
      key: 'all',
      title: 'All Database Tables',
      hindiTitle: 'सभी डेटाबेस टेबल्स',
      icon: 'fas fa-database',
      badgeClass: 'badge-all',
      description: 'Complete direct database console across all public database tables with category filtering.',
      primaryTable: 'users',
      tables: []
    }
  ];

  selectedEntity = 'associate';

  // Tables List & Categorization
  tables: MasterTableInfo[] = [];
  categories: string[] = [];
  selectedCategory = 'ALL';
  tableFilterQuery = '';
  selectedTable = 'users';

  // Table Data & Schema
  columns: TableColumn[] = [];
  primaryKey = 'id';
  records: any[] = [];

  // Search & Pagination
  searchQuery = '';
  currentPage = 1;
  pageSize = 25;
  totalRecords = 0;
  totalPages = 1;
  sortBy = '';
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  // Edit Modal State
  isEditModalOpen = false;
  editingRow: any = null;
  editFormData: Record<string, any> = {};

  // Delete Confirmation State
  isDeleteModalOpen = false;
  deletingRecordId: any = null;
  deletingRecordSummary = '';
  forceCascadeDelete = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTablesList();
  }

  // ── ENTITY SELECTION ─────────────────────────────────────────────
  get activeEntity(): EntityConfig {
    return this.entities.find(e => e.key === this.selectedEntity) || this.entities[0];
  }

  onEntityChange(newKey: string): void {
    this.selectedEntity = newKey;
    this.searchQuery = '';
    this.sortBy = '';
    this.sortOrder = 'DESC';
    this.currentPage = 1;

    const ent = this.activeEntity;
    if (ent.key !== 'all' && ent.tables.length > 0) {
      this.selectedTable = ent.primaryTable;
    } else if (!this.selectedTable) {
      this.selectedTable = 'users';
    }
    this.loadTableData(this.selectedTable, 1);
  }

  getTableRowCount(tableName: string): number | null {
    const found = this.tables.find(t => t.tableName === tableName);
    return found ? found.rowCount : null;
  }

  // ── 1. LOAD TABLES LIST ──────────────────────────────────────────
  loadTablesList(): void {
    this.loadingTables = true;
    this.errorMessage = '';
    this.api.adminGetMasterTables().subscribe({
      next: (res: any) => {
        this.loadingTables = false;
        if (res?.success && res?.data) {
          this.tables = res.data.tables || [];
          this.categories = ['ALL', ...(res.data.categories || [])];

          // Auto-select initial table for currently selected entity
          if (this.activeEntity.tables.length > 0) {
            this.selectedTable = this.activeEntity.primaryTable;
          } else if (this.tables.length > 0) {
            const hasUsers = this.tables.some(t => t.tableName === 'users');
            this.selectedTable = hasUsers ? 'users' : this.tables[0].tableName;
          }
          this.loadTableData(this.selectedTable, 1);
        }
      },
      error: (err: any) => {
        this.loadingTables = false;
        this.errorMessage = err?.error?.message || 'Failed to load master tables catalog.';
      }
    });
  }

  // Filtered tables based on Category and Search text (for "All Tables" view)
  get filteredTables(): MasterTableInfo[] {
    return this.tables.filter(t => {
      const matchCat = this.selectedCategory === 'ALL' || t.category === this.selectedCategory;
      const matchSearch = !this.tableFilterQuery || t.tableName.toLowerCase().includes(this.tableFilterQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }

  // ── 2. LOAD DATA FOR SELECTED TABLE ─────────────────────────────
  selectTable(tableName: string): void {
    if (this.selectedTable === tableName && this.records.length > 0) return;
    this.selectedTable = tableName;
    this.searchQuery = '';
    this.sortBy = '';
    this.sortOrder = 'DESC';
    this.currentPage = 1;
    this.loadTableData(tableName, 1);
  }

  loadTableData(tableName: string, page = 1): void {
    this.loadingData = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.currentPage = page;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }
    if (this.sortBy) {
      params.sortBy = this.sortBy;
      params.sortOrder = this.sortOrder;
    }

    // Apply userType filtering if viewing within an entity
    if (this.selectedEntity !== 'all' && this.activeEntity.userType) {
      params.userType = this.activeEntity.userType;
    }

    this.api.adminGetMasterTableRecords(tableName, params).subscribe({
      next: (res: any) => {
        this.loadingData = false;
        if (res?.success && res?.data) {
          this.columns = res.data.columns || [];
          this.primaryKey = res.data.primaryKey || 'id';
          this.records = res.data.records || [];
          this.totalRecords = res.data.pagination?.total || 0;
          this.totalPages = res.data.pagination?.totalPages || 1;
          this.currentPage = res.data.pagination?.page || 1;
        }
      },
      error: (err: any) => {
        this.loadingData = false;
        this.errorMessage = err?.error?.message || `Failed to load records for table "${tableName}".`;
      }
    });
  }

  // ── 3. SEARCH & SORT ─────────────────────────────────────────────
  onSearch(): void {
    this.currentPage = 1;
    this.loadTableData(this.selectedTable, 1);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadTableData(this.selectedTable, 1);
  }

  toggleSort(columnName: string): void {
    if (this.sortBy === columnName) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = columnName;
      this.sortOrder = 'ASC';
    }
    this.loadTableData(this.selectedTable, this.currentPage);
  }

  changePageSize(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    this.loadTableData(this.selectedTable, 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.loadTableData(this.selectedTable, page);
  }

  // ── 4. MODIFY / EDIT ROW ─────────────────────────────────────────
  openEditModal(row: any): void {
    this.editingRow = row;
    this.editFormData = {};

    // Clone row values into form data
    for (const col of this.columns) {
      const val = row[col.name];
      if (val instanceof Date) {
        this.editFormData[col.name] = val.toISOString().slice(0, 19);
      } else if (typeof val === 'object' && val !== null) {
        this.editFormData[col.name] = JSON.stringify(val);
      } else {
        this.editFormData[col.name] = val !== null && val !== undefined ? val : '';
      }
    }
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingRow = null;
    this.editFormData = {};
  }

  saveEdit(): void {
    if (!this.editingRow || !this.selectedTable) return;
    const pkVal = this.editingRow[this.primaryKey];
    if (pkVal === undefined || pkVal === null) {
      alert(`Primary key (${this.primaryKey}) missing for selected row.`);
      return;
    }

    this.savingRow = true;
    this.api.adminUpdateMasterRecord(this.selectedTable, pkVal, this.editFormData).subscribe({
      next: (res: any) => {
        this.savingRow = false;
        this.closeEditModal();
        this.showToast('success', `Record #${pkVal} updated successfully in "${this.selectedTable}".`);
        this.loadTableData(this.selectedTable, this.currentPage);
      },
      error: (err: any) => {
        this.savingRow = false;
        alert(err?.error?.message || 'Failed to update record.');
      }
    });
  }

  // ── 5. DELETE ROW ────────────────────────────────────────────────
  confirmDelete(row: any): void {
    const pkVal = row[this.primaryKey];
    this.deletingRecordId = pkVal;
    this.forceCascadeDelete = false;
    const nameCol = row['full_name'] || row['name'] || row['email'] || row['mobile_no'] || row['member_id'] || row['team_member_uid'] || '';
    this.deletingRecordSummary = `${this.primaryKey} = ${pkVal}${nameCol ? ' (' + nameCol + ')' : ''}`;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.deletingRecordId = null;
    this.deletingRecordSummary = '';
    this.forceCascadeDelete = false;
  }

  executeDelete(): void {
    if (!this.deletingRecordId || !this.selectedTable) return;
    this.deletingRow = true;

    this.api.adminDeleteMasterRecord(this.selectedTable, this.deletingRecordId, this.forceCascadeDelete).subscribe({
      next: (res: any) => {
        this.deletingRow = false;
        this.closeDeleteModal();
        this.showToast('success', `Record #${this.deletingRecordId} deleted successfully from "${this.selectedTable}".`);
        this.loadTableData(this.selectedTable, this.currentPage);
      },
      error: (err: any) => {
        this.deletingRow = false;
        alert(err?.error?.message || 'Failed to delete record.');
      }
    });
  }

  // Helper for UI notifications
  showToast(type: 'success' | 'danger', msg: string): void {
    if (type === 'success') {
      this.successMessage = msg;
      setTimeout(() => this.successMessage = '', 4500);
    } else {
      this.errorMessage = msg;
    }
  }

  // Helper to format cell values cleanly in table
  formatCell(row: any, col: TableColumn): string {
    const val = row[col.name];
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? '✓ True' : '✗ False';
    if (col.name.toLowerCase().includes('password') || col.name.toLowerCase().includes('hash')) return '••••••••';
    if (typeof val === 'object') return JSON.stringify(val);
    const str = String(val);
    return str.length > 50 ? str.slice(0, 47) + '...' : str;
  }

  isPill(colName: string): boolean {
    const c = colName.toLowerCase();
    return c.includes('status') || c.includes('role') || c.includes('type');
  }

  getPillClass(val: any): string {
    const s = String(val || '').toLowerCase();
    if (s.includes('active') || s.includes('approved') || s.includes('success') || s.includes('true')) return 'pill-success';
    if (s.includes('pending') || s.includes('hold') || s.includes('inquiry')) return 'pill-warning';
    if (s.includes('reject') || s.includes('suspend') || s.includes('block') || s.includes('false')) return 'pill-danger';
    return 'pill-info';
  }

  // ── FORM HELPERS FOR EDIT MODAL ──────────────────────────────────
  formatColLabel(name: string): string {
    if (!name) return '';
    const acronyms: Record<string, string> = {
      id: 'ID',
      uid: 'UID',
      pk: 'PK',
      kyc: 'KYC',
      dob: 'DOB',
      pan: 'PAN',
      ifsc: 'IFSC',
      url: 'URL',
      emi: 'EMI',
      otp: 'OTP'
    };
    return name
      .split('_')
      .map(part => acronyms[part.toLowerCase()] || (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
      .join(' ');
  }

  getSimplifiedType(rawType: string): string {
    const t = (rawType || '').toLowerCase();
    if (t.includes('int')) return 'Integer';
    if (t.includes('numeric') || t.includes('decimal') || t.includes('double') || t.includes('real')) return 'Decimal';
    if (t.includes('timestamp')) return 'DateTime';
    if (t === 'date') return 'Date';
    if (t.includes('bool')) return 'Boolean';
    if (t.includes('json')) return 'JSON';
    if (t.includes('char') || t.includes('text')) return 'Text';
    if (t.includes('user-defined')) return 'Custom';
    return rawType || 'Text';
  }

  getTypeBadgeClass(rawType: string): string {
    const t = (rawType || '').toLowerCase();
    if (t.includes('int') || t.includes('numeric')) return 'type-number';
    if (t.includes('time') || t.includes('date')) return 'type-date';
    if (t.includes('bool')) return 'type-bool';
    if (t.includes('json')) return 'type-json';
    return 'type-text';
  }

  isTextArea(colName: string, rawType: string): boolean {
    const n = (colName || '').toLowerCase();
    const t = (rawType || '').toLowerCase();
    return t.includes('json') || n.includes('address') || n.includes('description') || n.includes('remarks') || n.includes('notes') || n.includes('details');
  }

  isSelectField(colName: string): boolean {
    const n = (colName || '').toLowerCase();
    return ['user_type', 'gender', 'status', 'user_role', 'role'].includes(n);
  }

  getSelectOptions(colName: string): string[] {
    const n = (colName || '').toLowerCase();
    if (n === 'gender') return ['Male', 'Female', 'Other'];
    if (n === 'user_type') return ['Associate', 'Team Member', 'Customer', 'Investor', 'Admin', 'SuperAdmin'];
    if (n === 'user_role') return ['Associate', 'Team Member', 'Customer', 'Investor', 'Admin'];
    if (n === 'status') return ['Active', 'Pending', 'Approved', 'Rejected', 'Hold', 'Inactive'];
    return [];
  }
}
