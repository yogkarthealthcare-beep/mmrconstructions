import { Component, EventEmitter, Input, Output, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AdminExportEvent {
  mode: 'current' | 'all';
  format: 'excel' | 'pdf';
}

@Component({
  selector: 'app-admin-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pagination.component.html',
  styleUrls: ['./admin-pagination.component.css']
})
export class AdminPaginationComponent {
  @Input() set page(val: number) {
    if (val !== undefined && val !== null) {
      this.currentPage = Number(val);
    }
  }
  get page(): number {
    return this.currentPage;
  }

  @Input() currentPage = 1;
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];
  @Input() showExport = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() export = new EventEmitter<AdminExportEvent>();
  @Output() exportCurrentExcel = new EventEmitter<void>();
  @Output() exportAllExcel = new EventEmitter<void>();
  @Output() exportCurrentPdf = new EventEmitter<void>();
  @Output() exportAllPdf = new EventEmitter<void>();

  exportDropdownOpen = false;

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.exportDropdownOpen = false;
    }
  }

  get totalPages(): number {
    return Math.ceil(Math.max(1, this.totalItems) / this.pageSize);
  }

  get startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get pageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    }

    if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  onPageClick(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPrev(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNext(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onPageSizeSelect(size: any): void {
    const s = Number(size);
    if (s && s !== this.pageSize) {
      this.pageSizeChange.emit(s);
    }
  }

  toggleExportDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.exportDropdownOpen = !this.exportDropdownOpen;
  }

  triggerExport(type: 'current-excel' | 'all-excel' | 'current-pdf' | 'all-pdf'): void {
    this.exportDropdownOpen = false;
    if (type === 'current-excel') {
      this.export.emit({ mode: 'current', format: 'excel' });
      this.exportCurrentExcel.emit();
    } else if (type === 'all-excel') {
      this.export.emit({ mode: 'all', format: 'excel' });
      this.exportAllExcel.emit();
    } else if (type === 'current-pdf') {
      this.export.emit({ mode: 'current', format: 'pdf' });
      this.exportCurrentPdf.emit();
    } else if (type === 'all-pdf') {
      this.export.emit({ mode: 'all', format: 'pdf' });
      this.exportAllPdf.emit();
    }
  }
}
