import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject } from "@angular/core";
import { NgControl } from "@angular/forms";
import { Subscription } from "rxjs";

@Directive({
  selector: "[appCurrencyInput]",
  standalone: true,
})
export class CurrencyInputDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly control = inject(NgControl);
  private readonly subscription = new Subscription();

  ngAfterViewInit(): void {
    const formControl = this.control.control;
    if (!formControl) return;
    this.formatValue(formControl.value);
    this.subscription.add(formControl.valueChanges.subscribe((value) => this.formatValue(value)));
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); }

  @HostListener("input", ["$event"])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, "");
    const value = digits ? Number(digits) / 100 : null;
    this.control.control?.setValue(value, { emitEvent: false });
    this.formatValue(value, true);
  }

  private formatValue(value: unknown, force = false): void {
    const input = this.element.nativeElement;
    if (!force && document.activeElement === input && input.value !== "") return;
    const numeric = typeof value === "number" ? value : Number(value);
    input.value = Number.isFinite(numeric) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric) : "";
  }
}
