import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, input, OnDestroy, output, ViewChild } from "@angular/core";
import { OverviewSelection } from "../../core/models/finance.models";

@Component({
  selector: "app-calendar-view",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="calendar-view">
      <div class="calendar-heading"><div><span class="calendar-kicker">PLANEJAMENTO ANUAL</span><h1>Calendário<span class="accent">.</span></h1></div><span class="calendar-year">{{ year }}</span></div>
      <p class="calendar-hint">Selecione um mês ou dia para atualizar o dashboard.</p>
      <div class="calendar-carousel" aria-label="Meses do ano">
        <div #monthViewport class="calendar-carousel-viewport" (pointerdown)="startDrag($event)" (pointermove)="drag($event)" (pointerup)="endDrag($event)" (pointercancel)="endDrag($event)" aria-label="Arraste para navegar pelos meses">
          <div class="calendar-year-grid">
            @for (month of months(); track month.value) {
            <section class="calendar-month" [attr.data-month]="month.value" [class.current-month]="month.current">
              <button type="button" class="calendar-month-title" [class.selected]="selection().type === 'month' && selection().value === month.value" (click)="selectMonth(month.value, monthViewport)">{{ month.label }}</button>
            </section>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CalendarViewComponent implements AfterViewInit, OnDestroy {
  readonly selection = input.required<OverviewSelection>();
  readonly availableMonths = input<string[]>([]);
  readonly selected = output<OverviewSelection>();
  readonly year = new Date().getFullYear();
  readonly months = computed(() => {
    const fallback = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const values = this.availableMonths().length ? this.availableMonths() : [fallback];
    return [...new Set(values)]
      .filter((value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value))
      .sort()
      .map((value) => {
        const date = new Date(`${value}-01T12:00:00`);
        return { value, label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date), current: value === fallback };
      });
  });
  readonly periodYears = computed(() => [...new Set(this.months().map((month) => month.value.slice(0, 4)))].join(" · "));
  private dragStartY = 0;
  private dragStartScrollTop = 0;
  private dragging = false;
  private dragMoved = false;
  private centerTimer: ReturnType<typeof setTimeout> | null = null;
  @ViewChild("monthViewport") private readonly monthViewport?: ElementRef<HTMLElement>;
  ngAfterViewInit(): void { this.centerTimer = setTimeout(() => this.centerMonth(this.selection().value), 0); }
  ngOnDestroy(): void {
    if (this.centerTimer !== null) clearTimeout(this.centerTimer);
    this.centerTimer = null;
    this.dragging = false;
  }
  selectMonth(value: string, viewport: HTMLElement): void {
    this.selected.emit({ type: "month", value });
    requestAnimationFrame(() => this.centerMonth(value, viewport));
  }
  private centerMonth(value: string, viewport = this.monthViewport?.nativeElement): void {
    if (!viewport || this.selection().type !== "month") return;
    const month = viewport.querySelector<HTMLElement>(`[data-month="${value}"]`);
    if (!month) return;
    viewport.scrollTo({ top: month.offsetTop - (viewport.clientHeight - month.offsetHeight) / 2, behavior: "smooth" });
  }
  startDrag(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest("button")) {
      this.dragging = false;
      this.dragMoved = false;
      return;
    }
    const viewport = event.currentTarget as HTMLElement;
    this.dragging = true;
    this.dragMoved = false;
    this.dragStartY = event.clientY;
    this.dragStartScrollTop = viewport.scrollTop;
    viewport.setPointerCapture(event.pointerId);
  }
  drag(event: PointerEvent): void {
    if (!this.dragging) return;
    const viewport = event.currentTarget as HTMLElement;
    if (Math.abs(event.clientY - this.dragStartY) > 4) this.dragMoved = true;
    viewport.scrollTop = this.dragStartScrollTop - (event.clientY - this.dragStartY);
  }
  endDrag(event: PointerEvent): void {
    this.dragging = false;
    this.dragMoved = false;
    const viewport = event.currentTarget as HTMLElement;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  }
}
