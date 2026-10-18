import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from "@angular/core";

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
  @Input() user: AuthUserView | null = null;
  @Input() period = "";
  @Input() initials = "US";
  @Input() userMenuOpen = false;
  @Input() accounts: BankAccountOption[] = [];
  @Input() activeAccountId = "";
  readonly accountPickerOpen = signal(false);
  @Output() readonly create = new EventEmitter<void>();
  @Output() readonly accountChange = new EventEmitter<string>();
  @Output() readonly toggleMenu = new EventEmitter<void>();
  @Output() readonly logout = new EventEmitter<void>();

  activeAccountTitle(): string {
    return this.accounts.find((account) => account.id === this.activeAccountId)?.title ?? "Selecionar conta";
  }

  activeAccount(): BankAccountOption | null {
    return this.accounts.find((account) => account.id === this.activeAccountId) ?? null;
  }

  money(value: number | undefined): string {
    return value === undefined ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }

  toggleAccountPicker(): void { this.accountPickerOpen.update((open) => !open); }

  selectAccount(accountId: string): void {
    this.accountPickerOpen.set(false);
    this.accountChange.emit(accountId);
  }
}
