import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { bankLogoForName } from "../utils/bank-logo";

export interface BankFilterOption {
  apiId: string;
  title: string;
}

@Component({
  selector: "app-bank-filter",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bank-filter" role="group" [attr.aria-label]="label">
      <span class="bank-filter-label">{{ label }}</span>
      <div class="bank-filter-options">
        <button type="button" class="bank-filter-option" [class.selected]="selectedAccountId === 'all'" [attr.aria-pressed]="selectedAccountId === 'all'" (click)="select('all')">
          <span class="bank-filter-all-icon material-symbols-outlined">account_balance</span>
          <span>Todas as contas</span>
        </button>
        @for (account of accounts; track account.apiId) {
          <button type="button" class="bank-filter-option" [class.selected]="selectedAccountId === account.apiId" [attr.aria-pressed]="selectedAccountId === account.apiId" (click)="select(account.apiId)">
            @if (bankLogoForName(account.title); as logo) {
              <img class="bank-filter-logo" [src]="logo" [alt]="'Logo ' + account.title" />
            } @else {
              <span class="bank-filter-fallback material-symbols-outlined">account_balance</span>
            }
            <span>{{ account.title }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .bank-filter { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
    .bank-filter-label { color: #8f93a1; font: 800 9px Inter, sans-serif; letter-spacing: .08em; }
    .bank-filter-options { display: flex; flex-wrap: wrap; gap: 7px; min-width: 0; }
    .bank-filter-option { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; max-width: 100%; padding: 5px 10px; border: 1px solid #454650; border-radius: 8px; background: #24262e; color: #c9cbd2; font: 600 11px Inter, sans-serif; cursor: pointer; }
    .bank-filter-option:hover { border-color: #777984; color: #fff; }
    .bank-filter-option.selected { border-color: #ed654c; background: #352522; color: #fff; }
    .bank-filter-option > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bank-filter-logo, .bank-filter-fallback, .bank-filter-all-icon { display: block; flex: 0 0 22px; width: 22px; height: 22px; }
    .bank-filter-logo { border: 0; background: transparent; object-fit: contain; }
    .bank-filter-fallback, .bank-filter-all-icon { display: grid; place-items: center; color: #ff8b73; font-size: 18px; }
    .bank-filter-all-icon { color: #aeb0bb; }
  `],
})
export class BankFilterComponent {
  @Input() accounts: BankFilterOption[] = [];
  @Input() selectedAccountId = "all";
  @Input() label = "BANCO";
  @Output() readonly selectedAccountIdChange = new EventEmitter<string>();
  readonly bankLogoForName = bankLogoForName;

  select(accountId: string): void {
    this.selectedAccountIdChange.emit(accountId);
  }
}
