import { ChangeDetectionStrategy, Component, effect, inject } from "@angular/core";
import { FinanceStore } from "../../core/store/finance.store";
import { NotificationService, ToastNotification } from "../../core/notifications/notification.service";

@Component({
  selector: "app-api-status",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="toast-region" aria-label="Notificações">@for (toast of notifications.notifications(); track toast.id) { <article class="toast" [class]="'toast-' + toast.type" [class.toast-closing]="toast.closing" role="status"><span class="toast-icon material-symbols-outlined">{{ icon(toast) }}</span><span class="toast-message">{{ toast.message }}</span><button type="button" class="toast-close" aria-label="Fechar notificação" (click)="notifications.remove(toast.id)">close</button></article> }</section>`,
  styles: [`:host{display:contents}.toast-region{position:fixed;top:86px;right:22px;z-index:50;display:grid;gap:10px;width:min(380px,calc(100vw - 30px));pointer-events:none}.toast{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;min-height:52px;padding:12px 12px;border:1px solid #484b56;border-radius:8px;background:#292b33;color:#f6f6f7;box-shadow:0 16px 34px #0007;font-size:12px;font-weight:700;pointer-events:auto;animation:toast-in .2s ease-out}.toast-closing{animation:toast-out .16s ease-in forwards}.toast-icon{font-size:20px}.toast-message{line-height:1.4}.toast-close{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;background:transparent;color:#aeb0bb;font-family:'Material Symbols Outlined';font-size:18px;cursor:pointer}.toast-close:hover{color:#fff}.toast-error{border-color:#ed5a3b}.toast-error .toast-icon{color:#ff7157}.toast-success{border-color:#16b880}.toast-success .toast-icon{color:#36d69b}.toast-warning{border-color:#d8a743}.toast-warning .toast-icon{color:#f0c45d}.toast-info{border-color:#5c8fd8}.toast-info .toast-icon{color:#82b0f2}@keyframes toast-in{from{opacity:0;transform:translate3d(18px,-6px,0)}to{opacity:1;transform:translate3d(0,0,0)}}@keyframes toast-out{to{opacity:0;transform:translate3d(18px,-6px,0)}}@media(max-width:700px){.toast-region{top:74px;right:15px;width:calc(100vw - 30px)}}`],
})
export class ApiStatusComponent {
  readonly store = inject(FinanceStore);
  readonly notifications = inject(NotificationService);

  constructor() { effect(() => { const error = this.store.error(); if (error) { this.notifications.error(error); this.store.clearError(); } }); }
  icon(toast: ToastNotification): string { return toast.type === "error" ? "error" : toast.type === "success" ? "check_circle" : toast.type === "warning" ? "warning" : "info"; }
}
