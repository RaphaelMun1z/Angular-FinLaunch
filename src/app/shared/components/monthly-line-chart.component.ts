import { ChangeDetectionStrategy, Component, computed, input, signal } from "@angular/core";
import { FinanceRecord } from "../../core/models/finance.models";

interface ChartPoint {
  index: number;
  day: number;
  value: number;
  x: number;
  y: number;
}

@Component({
  selector: "app-monthly-line-chart",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="monthly-chart dash-section" aria-label="Gráfico mensal de receitas e gastos">
      <div class="dash-title">RECEITAS E GASTOS DO MÊS</div>
      <div class="chart-legend"><span class="legend-income"><i></i>Receitas</span><span class="legend-expense"><i></i>Gastos</span></div>
      <div class="line-chart-wrap" [class.chart-empty]="!chart().hasData">
        <svg class="line-chart" viewBox="0 0 760 260" role="img" [attr.aria-label]="'Receitas e gastos de ' + monthLabel()">
          <line class="chart-axis" x1="44" y1="20" x2="44" y2="218"></line><line class="chart-axis" x1="44" y1="218" x2="744" y2="218"></line>
          @for (grid of gridLines(); track grid.y) { <line class="chart-grid-line" x1="44" [attr.y1]="grid.y" x2="744" [attr.y2]="grid.y"></line><text class="chart-axis-label" x="4" [attr.y]="grid.y + 4">{{ moneyShort(grid.value) }}</text> }
          <polyline class="chart-line chart-line-income" [attr.points]="pointString(chart().income)"></polyline><polyline class="chart-line chart-line-expense" [attr.points]="pointString(chart().expense)"></polyline>
          @for (point of chart().income; track point.index) { <circle class="chart-point chart-point-income" [attr.cx]="point.x" [attr.cy]="point.y" r="3.5" (mouseenter)="hovered.set(point.index)" (focus)="hovered.set(point.index)" tabindex="0"></circle> }
          @for (point of chart().expense; track point.index) { <circle class="chart-point chart-point-expense" [attr.cx]="point.x" [attr.cy]="point.y" r="3.5" (mouseenter)="hovered.set(point.index)" (focus)="hovered.set(point.index)" tabindex="0"></circle> }
          @for (point of chart().labels; track point.index) { @if (point.index % labelStep() === 0) { <text class="chart-day-label" [attr.x]="point.x" y="240">{{ point.day }}</text> } }
          @if (hoveredPoint(); as point) { <line class="chart-hover-line" [attr.x1]="point.x" y1="20" [attr.x2]="point.x" y2="218"></line><g class="chart-tooltip"><rect [attr.x]="tooltipX(point.x)" y="28" width="142" height="55" rx="6"></rect><text [attr.x]="tooltipX(point.x) + 10" y="49">{{ point.day }} de {{ monthLabel() }}</text><text [attr.x]="tooltipX(point.x) + 10" y="69">{{ money(point.income) }} · {{ money(point.expense) }}</text></g> }
        </svg>
      </div>
    </section>
  `,
})
export class MonthlyLineChartComponent {
  readonly records = input.required<FinanceRecord[]>();
  readonly month = input.required<string>();
  readonly hovered = signal<number | null>(null);
  readonly chart = computed(() => {
    const [year, month] = this.month().split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    const incomeValues = Array.from({ length: days }, (_, index) => this.totalForDay(index + 1, "income"));
    const expenseValues = Array.from({ length: days }, (_, index) => this.totalForDay(index + 1, "expense"));
    const hasData = this.records().some((record) => record.date?.startsWith(this.month()) && record.amount !== undefined);
    const max = Math.max(...incomeValues, ...expenseValues, 1);
    const createPoints = (values: number[]): ChartPoint[] => values.map((value, index) => ({ index, day: index + 1, value, x: 44 + (index / Math.max(days - 1, 1)) * 700, y: 218 - (value / max) * 198 }));
    return { income: createPoints(incomeValues), expense: createPoints(expenseValues), labels: createPoints(incomeValues), max, hasData };
  });
  readonly gridLines = computed(() => { const max = this.chart().max; return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({ y: 218 - ratio * 198, value: max * ratio })); });
  readonly hoveredPoint = computed(() => { const index = this.hovered(); if (index === null) return null; const chart = this.chart(); return { day: index + 1, x: chart.labels[index].x, income: chart.income[index].value, expense: chart.expense[index].value }; });
  monthLabel(): string { return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(`${this.month()}-01T12:00:00`)); }
  labelStep(): number { return this.chart().labels.length > 20 ? 5 : 2; }
  pointString(points: ChartPoint[]): string { return points.map((point) => `${point.x},${point.y}`).join(" "); }
  tooltipX(x: number): number { return Math.min(Math.max(x - 71, 48), 596); }
  money(value: number): string { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value); }
  moneyShort(value: number): string { return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`; }
  private totalForDay(day: number, type: "income" | "expense"): number { const prefix = `${this.month()}-${String(day).padStart(2, "0")}`; return this.records().filter((record) => record.date === prefix && record.type === type && record.amount !== undefined).reduce((sum, record) => sum + record.amount!, 0); }
}
