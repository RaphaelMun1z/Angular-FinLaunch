import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";

interface AuthUserView {
  nomeCompleto?: string;
  email?: string;
}

interface BankAccountOption {
  id: string;
  title: string;
}

@Component({
  selector: "app-finance-header",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./finance-header.component.html",
  styleUrl: "./finance-header.component.scss",
})
export class FinanceHeaderComponent {
  @Input() user: AuthUserView | null = null;
  @Input() period = "";
  @Input() initials = "US";
  @Input() userMenuOpen = false;
  @Input() accounts: BankAccountOption[] = [];
  @Input() activeAccountId = "";
  @Output() readonly create = new EventEmitter<void>();
  @Output() readonly accountChange = new EventEmitter<string>();
  @Output() readonly toggleMenu = new EventEmitter<void>();
  @Output() readonly logout = new EventEmitter<void>();
}
