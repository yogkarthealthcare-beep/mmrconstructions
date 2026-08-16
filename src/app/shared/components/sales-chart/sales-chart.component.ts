import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sales-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-chart.component.html',
  styleUrls: ['./sales-chart.component.css'],
})
export class SalesChartComponent {
  @Input() title = 'Monthly Sales';
  @Input() subtitle = 'Last 12 months';
  @Input() data: any[] = [];
  @Input() labelKey = 'month';
  @Input() valueKey = 'total_sales';
  @Input() countKey = 'sales_count';
  @Input() currency = false;

  readonly width = 720;
  readonly height = 250;
  readonly left = 58;
  readonly right = 18;
  readonly top = 20;
  readonly bottom = 48;

  get values(): number[] {
    return this.data.map(item => Number(item?.[this.valueKey] || 0));
  }

  get maxValue(): number {
    return Math.max(...this.values, 0);
  }

  get totalValue(): number {
    return this.values.reduce((sum, value) => sum + value, 0);
  }

  get hasData(): boolean {
    return this.values.some(value => value > 0);
  }

  get plotWidth(): number {
    return this.width - this.left - this.right;
  }

  get plotHeight(): number {
    return this.height - this.top - this.bottom;
  }

  get points() {
    const denominator = Math.max(this.data.length - 1, 1);
    const max = this.maxValue || 1;
    return this.data.map((item, index) => ({
      x: this.left + (index / denominator) * this.plotWidth,
      y: this.top + this.plotHeight - (Number(item?.[this.valueKey] || 0) / max) * this.plotHeight,
      label: item?.[this.labelKey] || '',
      value: Number(item?.[this.valueKey] || 0),
      count: Number(item?.[this.countKey] || 0),
    }));
  }

  get polylinePoints(): string {
    return this.points.map(point => `${point.x},${point.y}`).join(' ');
  }

  get areaPoints(): string {
    if (!this.points.length) return '';
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    const baseline = this.top + this.plotHeight;
    return `${first.x},${baseline} ${this.polylinePoints} ${last.x},${baseline}`;
  }

  get yTicks() {
    const max = this.maxValue || 1;
    return [0, .25, .5, .75, 1].map(ratio => ({
      y: this.top + this.plotHeight - ratio * this.plotHeight,
      value: max * ratio,
    }));
  }

  showLabel(index: number): boolean {
    return this.data.length <= 6 || index % 2 === 0 || index === this.data.length - 1;
  }

  formatValue(value: number): string {
    if (!this.currency) return Math.round(value).toLocaleString('en-IN');
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  }
}
