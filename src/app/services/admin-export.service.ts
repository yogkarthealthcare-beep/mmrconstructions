import { Injectable } from '@angular/core';

export interface ExportColumn {
  header: string;
  key?: string;
  width?: number;
  transform?: (row: any, index?: number) => any;
}

@Injectable({
  providedIn: 'root'
})
export class AdminExportService {

  /**
   * Export structured dataset to Excel/CSV
   */
  exportToExcel(data: any[], columns: ExportColumn[], filename: string, title?: string): void {
    const headers = columns.map(c => c.header);
    const rows = data.map((item, idx) => {
      return columns.map(col => {
        if (col.transform) return col.transform(item, idx);
        if (col.key) return item[col.key] ?? '';
        return '';
      });
    });
    this.exportToCsv(filename, headers, rows);
  }

  /**
   * Export data to Excel/CSV with UTF-8 BOM support
   */
  exportToCsv(filename: string, headers: string[], rows: any[][]): void {
    if (!rows || rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const escapeCsvCell = (cell: any): string => {
      if (cell === null || cell === undefined) return '""';
      let str = String(cell).replace(/"/g, '""');
      // If cell starts with formula characters, prefix with single quote to prevent CSV injection
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\r\n');

    // Add UTF-8 BOM so Excel opens Hindi/Special chars correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const cleanFilename = (filename.endsWith('.csv') ? filename : `${filename}.csv`).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    
    this.triggerDownload(blob, cleanFilename);
  }

  /**
   * Export data to printable PDF formatted document (Supports both object arrays with columns and raw arrays)
   */
  exportToPdf(
    titleOrData: string | any[],
    headersOrColumns: string[] | ExportColumn[],
    rowsOrFilename?: any[][] | string,
    subtitleOrTitle?: string
  ): void {
    if (Array.isArray(titleOrData) && Array.isArray(headersOrColumns)) {
      // Called as: exportToPdf(data, columns, filename, title)
      const data = titleOrData;
      const columns = headersOrColumns as ExportColumn[];
      const title = subtitleOrTitle || (typeof rowsOrFilename === 'string' ? rowsOrFilename : 'Report');
      const headers = columns.map(c => c.header);
      const rows = data.map((item, idx) => {
        return columns.map(col => {
          if (col.transform) return col.transform(item, idx);
          if (col.key) return item[col.key] ?? '';
          return '';
        });
      });
      this.renderPdf(title, headers, rows, 'MMR Constructions & Developers — Admin Report');
    } else {
      // Called as: exportToPdf(title, headers, rows, subtitle)
      const title = String(titleOrData || 'Report');
      const headers = (headersOrColumns as string[]) || [];
      const rows = (rowsOrFilename as any[][]) || [];
      const subtitle = subtitleOrTitle || 'MMR Constructions & Developers — Admin Report';
      this.renderPdf(title, headers, rows, subtitle);
    }
  }

  private renderPdf(
    title: string,
    headers: string[],
    rows: any[][],
    subtitle: string = 'MMR Constructions & Developers — Admin Report'
  ): void {
    if (!rows || rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const headerHtml = headers.map(h => `<th style="background:#062b18;color:#e8c97a;padding:8px 10px;font-size:11px;text-align:left;border:1px solid #cbd5e1;white-space:nowrap;">${this.escapeHtml(h)}</th>`).join('');
    
    const rowsHtml = rows.map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = row.map(c => `<td style="padding:7px 10px;font-size:11px;color:#1e293b;border:1px solid #e2e8f0;vertical-align:middle;">${this.escapeHtml(String(c ?? '—'))}</td>`).join('');
      return `<tr style="background:${bg};">${cells}</tr>`;
    }).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.escapeHtml(title)} - MMR Constructions</title>
        <meta charset="utf-8" />
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 15px; color: #0f172a; background: #fff; }
          .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #062b18; padding-bottom: 12px; margin-bottom: 16px; }
          .report-brand { font-size: 18px; font-weight: 800; color: #062b18; letter-spacing: -0.5px; }
          .report-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .report-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px; }
          .report-meta { text-align: right; font-size: 10px; color: #64748b; line-height: 1.4; }
          .report-badge { display: inline-block; background: #062b18; color: #e8c97a; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .report-footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="report-brand">MMR CONSTRUCTIONS &amp; DEVELOPERS</div>
            <div class="report-sub">${this.escapeHtml(subtitle)}</div>
            <div class="report-title">${this.escapeHtml(title)}</div>
          </div>
          <div class="report-meta">
            <div class="report-badge">CONFIDENTIAL ADMIN REPORT</div>
            <div><strong>Generated:</strong> ${dateFormatted}</div>
            <div><strong>Total Records:</strong> ${rows.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <div>MMR Constructions Admin Management Console &bull; Generated Automatically</div>
          <div>Page 1 &bull; Total Rows: ${rows.length}</div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      // Fallback to iframe printing if popups blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 2000);
        }, 500);
      }
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
}
