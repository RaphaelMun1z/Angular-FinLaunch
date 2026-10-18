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
  @Input() navigation: NavItem[] = [];
  @Input() activeKey = "";
  @Input() transactionsCount = 0;
  @Input() user: { nomeCompleto?: string; email?: string } | null = null;
  @Input() initials = "";
  @Input() activeAccountTitle = "";
  @Output() readonly navigate = new EventEmitter<NavItem>();
  isActive(item: NavItem): boolean { return this.activeKey === item.key || item.children?.some((child) => this.isActive(child)) === true; }
  overviewItem(): NavItem | undefined { return this.navigation.find((item) => item.key === "overview"); }
  accountItem(): NavItem | undefined { return this.navigation.find((item) => item.key === "accounts"); }
  independentItems(): NavItem[] { return this.navigation.filter((item) => item.key === "categories" || item.key === "goals"); }
  otherItems(): NavItem[] { return this.navigation.filter((item) => !["overview", "accounts", "categories", "goals"].includes(item.key)); }
  isExpanded(item: NavItem): boolean { return this.expandedItems()[item.key] !== false; }
  toggleNested(item: NavItem): void {
    this.expandedItems.update((items) => ({ ...items, [item.key]: !this.isExpanded(item) }));
    this.navigate.emit(item);
  }
}
