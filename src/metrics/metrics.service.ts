import { Injectable } from '@nestjs/common';

type Labels = Record<string, string | number | boolean | null | undefined>;

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  increment(name: string, labels: Labels = {}, value = 1) {
    const key = this.metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  observe(name: string, value: number, labels: Labels = {}) {
    const key = this.metricKey(name, labels);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    if (values.length > 1_000) {
      values.shift();
    }
    this.histograms.set(key, values);
  }

  render(): string {
    const lines: string[] = [];

    for (const [key, value] of this.counters.entries()) {
      lines.push(`${key} ${value}`);
    }

    for (const [key, values] of this.histograms.entries()) {
      const count = values.length;
      const sum = values.reduce((total, item) => total + item, 0);
      const avg = count > 0 ? sum / count : 0;
      const sorted = [...values].sort((a, b) => a - b);
      const p95 = sorted.length > 0 ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;

      lines.push(`${key}_count ${count}`);
      lines.push(`${key}_sum ${sum.toFixed(3)}`);
      lines.push(`${key}_avg ${avg.toFixed(3)}`);
      lines.push(`${key}_p95 ${p95.toFixed(3)}`);
    }

    return `${lines.join('\n')}\n`;
  }

  private metricKey(name: string, labels: Labels): string {
    const entries = Object.entries(labels).filter(([, value]) => value !== undefined && value !== null);
    if (entries.length === 0) {
      return this.safeMetricName(name);
    }

    const labelText = entries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${this.safeLabelName(key)}="${this.escapeLabel(String(value))}"`)
      .join(',');

    return `${this.safeMetricName(name)}{${labelText}}`;
  }

  private safeMetricName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_:]/g, '_');
  }

  private safeLabelName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private escapeLabel(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}
