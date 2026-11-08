import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { NavItem } from "../../core/models/finance.models";

@Component({
  selector: "app-finance-sidebar",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./finance-sidebar.component.html",
  styleUrl: "./finance-sidebar.component.scss",
})
export class FinanceSidebarComponent {
  readonly expandedItems = signal<Record<string, boolean>>({ cards: true, cardCredit: true });
  readonly pinnedKeys = signal<string[]>(this.readPinnedKeys());
  @Input() navigation: NavItem[] = [];
  @Input() activeKey = "";
  @Input() transactionsCount = 0;
  @Input() user: { nomeCompleto?: string; email?: string } | null = null;
  @Input() initials = "";
  @Input() activeAccountTitle = "";
  @Output() readonly navigate = new EventEmitter<NavItem>();
  isActive(item: NavItem): boolean { return this.activeKey === item.key || item.children?.some((child) => this.isActive(child)) === true; }
  private readPinnedKeys(): string[] {
    if (typeof localStorage === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("finance-pinned-pages") ?? "[]") as string[]; }
    catch { return []; }
  }
  isPinned(item: NavItem): boolean { return this.pinnedKeys().includes(item.key); }
  togglePinned(item: NavItem, event: MouseEvent): void {
    event.stopPropagation();
    this.pinnedKeys.update((keys) => {
      const next = keys.includes(item.key) ? keys.filter((key) => key !== item.key) : [...keys, item.key];
      if (typeof localStorage !== "undefined") localStorage.setItem("finance-pinned-pages", JSON.stringify(next));
      return next;
    });
  }
  navigateItem(item: NavItem): void { this.navigate.emit(item); }
  pinnedItems(): NavItem[] { return this.navigation.filter((item) => this.isPinned(item)); }
  itemsFor(...keys: string[]): NavItem[] { return keys.map((key) => this.navigation.find((item) => item.key === key)).filter((item): item is NavItem => !!item && !this.isPinned(item)); }
  overviewItems(): NavItem[] { return this.itemsFor("overview", "transactions", "statements"); }
  bankingItems(): NavItem[] { return this.itemsFor("accounts", "cards", "invoices"); }
  planningItems(): NavItem[] { return this.itemsFor("budgets", "categories", "investments", "goals"); }
  integrationItems(): NavItem[] { return this.itemsFor("telegram"); }
  isExpanded(item: NavItem): boolean { return this.expandedItems()[item.key] !== false; }
  toggleNested(item: NavItem): void {
    this.expandedItems.update((items) => ({ ...items, [item.key]: !this.isExpanded(item) }));
    this.navigate.emit(item);
  }
}
