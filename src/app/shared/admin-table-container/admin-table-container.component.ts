import { Component, Input, Output, EventEmitter, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-table-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-table-container.component.html',
  styleUrls: ['./admin-table-container.component.css']
})
export class AdminTableContainerComponent implements OnDestroy {
  @Input() title: string = 'Data Records';
  @Input() count: number | string | null = null;
  @Input() showMobileToolbar: boolean = true;
  @Input() showExport: boolean = false;

  @Output() export = new EventEmitter<void>();

  isFullscreen = false;

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      document.body.classList.add('table-fullscreen-active');
    } else {
      document.body.classList.remove('table-fullscreen-active');
    }
  }

  closeFullscreen() {
    this.isFullscreen = false;
    document.body.classList.remove('table-fullscreen-active');
  }

  triggerExport() {
    this.export.emit();
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.isFullscreen) {
      this.closeFullscreen();
    }
  }

  ngOnDestroy() {
    document.body.classList.remove('table-fullscreen-active');
  }
}
