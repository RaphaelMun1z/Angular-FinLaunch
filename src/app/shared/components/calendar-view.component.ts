import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { OverviewSelection } from "../../core/models/finance.models";

@Component({
  selector: "app-calendar-view",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="calendar-view">
      <div class="calendar-heading"><div><span class="calendar-kicker">PLANEJAMENTO ANUAL</span><h1>Calendário<span class="accent">.</span></h1></div><span class="calendar-year">{{ year }}</span></div>
      <p class="calendar-hint">Selecione um mês ou dia para atualizar o dashboard.</p>
      <div class="calendar-year-grid">
        @for (month of months(); track month.value) {
          <section class="calendar-month" [class.current-month]="month.current">
            <button class="calendar-month-title" [class.selected]="selection().type === 'month' && selection().value === month.value" (click)="selectMonth(month.value)">{{ month.label }}</button>
          </section>
        }
      </div>
    </div>
  `,
})
export class CalendarViewComponent {
  readonly selection = input.required<OverviewSelection>();
  readonly selected = output<OverviewSelection>();
  readonly year = new Date().getFullYear();
  readonly months = computed(() => Array.from({ length: 12 }, (_, month) => {
    const value = `${this.year}-${String(month + 1).padStart(2, "0")}`;
    return { value, label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(this.year, month, 1)), current: month === new Date().getMonth() };
  }));
  selectMonth(value: string): void { this.selected.emit({ type: "month", value }); }
}
