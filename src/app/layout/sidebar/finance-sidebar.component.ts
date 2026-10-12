import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { NavItem } from "../../core/models/finance.models";

@Component({
  selector: "app-finance-sidebar",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./finance-sidebar.component.html",
  styleUrl: "./finance-sidebar.component.scss",
})
export class FinanceSidebarComponent {
  @Input() navigation: NavItem[] = [];
  @Input() activeKey = "";
  @Input() transactionsCount = 0;
  @Input() user: { nomeCompleto?: string; email?: string } | null = null;
  @Input() initials = "";
  @Output() readonly navigate = new EventEmitter<NavItem>();
  isActive(item: NavItem): boolean { return this.activeKey === item.key || item.children?.some((child) => this.isActive(child)) === true; }
}
