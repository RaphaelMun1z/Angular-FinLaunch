import { CommonModule } from "@angular/common";
import { Component, forwardRef, Input } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

@Component({
  selector: "app-date-picker",
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true }],
  styleUrl: "./date-picker.component.scss",
  template: `
    <div class="date-picker" [class.date-picker-inline]="inline">
      @if (!inline) {
        <button type="button" class="date-picker-trigger" [disabled]="disabled" (click)="toggle()" [attr.aria-label]="ariaLabel">
          <span class="material-symbols-outlined">calendar_month</span>
          <span>{{ displayValue }}</span>
          <span class="material-symbols-outlined date-picker-chevron">expand_more</span>
        </button>
      }
      @if (inline || open) {
        <div class="date-picker-popover" role="dialog" [attr.aria-label]="ariaLabel">
          <div class="date-picker-header">
            <button type="button" (click)="changeMonth(-1)" aria-label="Mês anterior"><span class="material-symbols-outlined">chevron_left</span></button>
            <strong>{{ monthLabel }}</strong>
            <button type="button" (click)="changeMonth(1)" aria-label="Próximo mês"><span class="material-symbols-outlined">chevron_right</span></button>
          </div>
          <div class="date-picker-weekdays">@for (day of weekdays; track day) { <span>{{ day }}</span> }</div>
          <div class="date-picker-grid">
            @for (day of calendarDays; track $index) {
              @if (day) {
                <button type="button" [class.selected]="day === value" [class.today]="day === today" (click)="select(day)">{{ day.slice(8, 10) }}</button>
              } @else { <span></span> }
            }
          </div>
          <button type="button" class="date-picker-today" (click)="select(today)">Hoje</button>
        </div>
      }
    </div>
  `,
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() ariaLabel = "Selecionar data";
  @Input() inline = true;
  value = "";
  viewMonth = this.monthFromDate(new Date());
  open = false;
  disabled = false;
  readonly weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get today(): string { return this.toIsoDate(new Date()); }
  get monthLabel(): string {
    const date = new Date(`${this.viewMonth}-01T12:00:00`);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  }
  get displayValue(): string {
    if (!this.value) return "Selecionar data";
    const date = new Date(`${this.value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "Selecionar data" : date.toLocaleDateString("pt-BR");
  }
  get calendarDays(): Array<string | null> {
    const first = new Date(`${this.viewMonth}-01T12:00:00`);
    const start = first.getDay();
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return [...Array(start).fill(null), ...Array.from({ length: lastDay }, (_, index) => `${this.viewMonth}-${String(index + 1).padStart(2, "0")}`)];
  }
  writeValue(value: string | null): void {
    this.value = value ?? "";
    if (this.value) this.viewMonth = this.value.slice(0, 7);
  }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
  toggle(): void { if (!this.disabled) this.open = !this.open; }
  changeMonth(offset: number): void {
    const date = new Date(`${this.viewMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + offset);
    this.viewMonth = this.monthFromDate(date);
  }
  select(value: string): void {
    this.value = value;
    this.viewMonth = value.slice(0, 7);
    this.onChange(value);
    this.onTouched();
    this.open = false;
  }
  private monthFromDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
  private toIsoDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
}
