import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { bankLogoForName } from "../../shared/utils/bank-logo";

interface AuthUserView {
  nomeCompleto?: string;
  email?: string;
}

interface BankAccountOption {
  id: string;
  title: string;
  balance?: number;
  creditTotal?: number;
  creditRemaining?: number;
}

@Component({
  selector: "app-finance-header",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./finance-header.component.html",
  styleUrl: "./finance-header.component.scss",
})
export class FinanceHeaderComponent {
  readonly bankLogoForName = bankLogoForName;
  @Input() user: AuthUserView | null = null;
  @Input() period = "";
  @Input() initials = "US";
  @Input() userMenuOpen = false;
  @Input() accounts: BankAccountOption[] = [];
  @Input() totalBalance = 0;
  balancesOpen = false;
  @Output() readonly create = new EventEmitter<void>();
  @Output() readonly toggleMenu = new EventEmitter<void>();
  @Output() readonly logout = new EventEmitter<void>();
  @Output() readonly deleteUser = new EventEmitter<void>();

  money(value: number | undefined): string {
    return value === undefined ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  totalCredit(): number { return this.accounts.reduce((total, account) => total + (account.creditTotal ?? 0), 0); }
  totalCreditRemaining(): number { return this.accounts.reduce((total, account) => total + (account.creditRemaining ?? 0), 0); }
  toggleBalances(): void { this.balancesOpen = !this.balancesOpen; }
}
