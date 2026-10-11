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

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTablesList();
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

          // Auto-select 'users' or first table if available
          if (this.tables.length > 0) {
            const hasUsers = this.tables.some(t => t.tableName === 'users');
            this.selectedTable = hasUsers ? 'users' : this.tables[0].tableName;
            this.loadTableData(this.selectedTable, 1);
          }
        }
      },
      error: (err: any) => {
        this.loadingTables = false;
        this.errorMessage = err?.error?.message || 'Failed to load master tables list.';
      }
    });
  }

  // Filtered tables based on Category and Search text
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
    const nameCol = row['full_name'] || row['name'] || row['email'] || row['mobile_no'] || row['member_id'] || '';
    this.deletingRecordSummary = `${this.primaryKey} = ${pkVal}${nameCol ? ' (' + nameCol + ')' : ''}`;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.deletingRecordId = null;
    this.deletingRecordSummary = '';
  }

  executeDelete(): void {
    if (!this.deletingRecordId || !this.selectedTable) return;
    this.deletingRow = true;

    this.api.adminDeleteMasterRecord(this.selectedTable, this.deletingRecordId).subscribe({
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
}
