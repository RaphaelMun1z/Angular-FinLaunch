import { Injectable, signal } from "@angular/core";

export type NotificationType = "error" | "success" | "warning" | "info";
export interface ToastNotification { id: number; type: NotificationType; message: string; closing?: boolean; }

@Injectable({ providedIn: "root" })
export class NotificationService {
  readonly notifications = signal<ToastNotification[]>([]);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(type: NotificationType, message: string, duration = type === "success" ? 3000 : 5000): void {
    const normalized = message.trim();
    if (!normalized || this.notifications().some((item) => item.type === type && item.message === normalized)) return;
    const notification: ToastNotification = { id: ++this.nextId, type, message: normalized };
    const current = this.notifications();
    if (current.length >= 3) this.drop(current[0].id);
    this.notifications.update((items) => [...items, notification]);
    this.timers.set(notification.id, setTimeout(() => this.remove(notification.id), duration));
  }

  error(message: string): void { this.show("error", message, 5000); }
  success(message: string): void { this.show("success", message, 3000); }
  warning(message: string): void { this.show("warning", message, 5000); }
  info(message: string): void { this.show("info", message, 5000); }

  remove(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    if (!this.notifications().some((item) => item.id === id)) return;
    this.notifications.update((items) => items.map((item) => item.id === id ? { ...item, closing: true } : item));
    setTimeout(() => this.drop(id), 160);
  }

  private drop(id: number): void { this.notifications.update((items) => items.filter((item) => item.id !== id)); }
}
