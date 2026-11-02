import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";

@Component({
  selector: "app-confirmation-dialog",
  standalone: true,
  template: `
    <dialog #dialog aria-labelledby="confirmation-title" aria-describedby="confirmation-description" (cancel)="onCancel($event)">
      <h2 id="confirmation-title">{{ title }}</h2>
      <p id="confirmation-description">{{ message }}</p>
      @if (error) { <p class="confirmation-error" role="alert">{{ error }}</p> }
      <div class="confirmation-actions">
        <button type="button" autofocus [disabled]="busy" (click)="cancel.emit()">Cancelar</button>
        <button type="button" class="danger" [disabled]="busy" (click)="confirm.emit()">{{ busy ? "Excluindo..." : "Confirmar exclusão" }}</button>
      </div>
    </dialog>
  `,
  styles: [`
    dialog { width: min(440px, calc(100vw - 48px)); box-sizing: border-box; padding: 26px; border: 1px solid #454650; border-radius: 16px; background: #22242b; color: #f6f6f8; box-shadow: 0 20px 80px #0008; }
    dialog::backdrop { background: #0009; }
    h2 { margin: 0 0 16px; font-size: 20px; }
    p { font-size: 14px; line-height: 1.6; }
    .confirmation-error { color: #ff9986; }
    .confirmation-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    button { padding: 12px 16px; border: 1px solid #555762; border-radius: 8px; background: #30323a; color: white; font: inherit; cursor: pointer; }
    button.danger { background: #bc2819; border-color: #bc2819; }
    button:disabled { opacity: .6; cursor: wait; }
    button:focus-visible { outline: 2px solid #ffb3a6; outline-offset: 3px; }
  `],
})
export class ConfirmationDialogComponent implements AfterViewInit {
  @Input() title = "Confirmar exclusão";
  @Input() message = "";
  @Input() busy = false;
  @Input() error: string | null = null;
  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();
  @ViewChild("dialog", { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  ngAfterViewInit(): void { this.dialog.nativeElement.showModal(); }
  onCancel(event: Event): void { event.preventDefault(); if (!this.busy) this.cancel.emit(); }
}
