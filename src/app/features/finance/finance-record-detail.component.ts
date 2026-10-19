import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AccountTab, CardTab, FinanceRecord, SectionKey } from "../../core/models/finance.models";

@Component({
  selector: "app-finance-record-detail",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./finance-record-detail.component.scss",
  template: `
    <div class="domain-detail card-detail" [class.resource-detail-loading]="loading" [class.resource-detail-revealed]="reveal" [class.account-detail]="section === 'accounts'" [class.entries-active]="section === 'accounts' && accountTab === 'entries'" [class.invoices-active]="record.cardType === 'CREDITO' && cardTab === 'invoices'" [class.card-credit-detail]="record.cardType === 'CREDITO'" [class.card-debit-detail]="record.cardType === 'DEBITO'" [class.card-voucher-detail]="record.cardType === 'VOUCHER'">
      @if (loading) { <div class="resource-loading detail-resource-loading" [class.resource-loading-active]="loadingActive" role="status" aria-live="polite"><span class="material-symbols-outlined">rocket_launch</span></div> }
      @if (section === 'accounts') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">account_balance</span><div><span class="domain-kicker">CONTA BANCÁRIA</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-tabs" role="tablist"><button [class.active]="accountTab === 'overview'" (click)="accountTabChange.emit('overview')">Visão geral</button><button [class.active]="accountTab === 'movements'" (click)="accountTabChange.emit('movements')">Movimentações</button><button [class.active]="accountTab === 'entries'" (click)="accountTabChange.emit('entries')">Lançamentos</button></div>
        @if (accountTab === 'overview') {
          <section class="domain-section"><div class="domain-section-heading"><span class="material-symbols-outlined">account_balance_wallet</span><strong>Resumo da conta</strong></div><div class="domain-metrics"><div><span>SALDO</span><strong>{{ money(record.balance) }}</strong></div><div><span>CRÉDITO TOTAL</span><strong>{{ money(record.creditTotal) }}</strong></div><div><span>CRÉDITO DISPONÍVEL</span><strong>{{ money(record.creditRemaining) }}</strong></div></div></section>
        } @else if (accountTab === 'movements') {
          <section class="domain-section"><div class="domain-section-heading"><span class="material-symbols-outlined">swap_vert</span><strong>Movimentações</strong></div><div class="domain-list">@for (movement of record.movements ?? []; track movement.title + movement.date) { <div class="domain-list-row"><span class="material-symbols-outlined">{{ movement.type === 'income' ? 'south_west' : 'north_east' }}</span><div><strong>{{ movement.title }}</strong><small>{{ movement.category }} · {{ date(movement.date) }}</small></div><b>{{ money(movement.amount) }}</b></div> } @empty { <div class="domain-empty">Nenhuma movimentação disponível para este período.</div> }</div></section>
        } @else {
          <section class="domain-section"><div class="domain-section-heading"><span class="material-symbols-outlined">receipt_long</span><strong>Lançamentos</strong></div><div class="domain-list">@for (movement of record.movements ?? []; track movement.title + movement.date) { <div class="domain-list-row"><span class="material-symbols-outlined">receipt_long</span><div><strong>{{ movement.title }}</strong><small>{{ movement.category }} · {{ date(movement.date) }}</small></div><b>{{ money(movement.amount) }}</b></div> } @empty { <div class="domain-empty">Nenhum lançamento disponível para este período.</div> }</div></section>
        }
        @if (section === 'accounts' && accountTab === 'entries') {
          <section class="domain-section entries-query-section">
            <div class="entry-period-form">
              <label>Data inicial *<input type="date" [value]="entryPeriod.from" (change)="entryDateChange('from', $event)" /></label>
              <label>Data final *<input type="date" [value]="entryPeriod.to" (change)="entryDateChange('to', $event)" /></label>
              <button type="button" class="entry-search-button" (click)="entrySearch.emit()" [disabled]="loadingActive">
                <span class="material-symbols-outlined">search</span>CONSULTAR LANÇAMENTOS
              </button>
            </div>
            <div class="domain-section-heading"><span class="material-symbols-outlined">receipt_long</span><strong>Lançamentos</strong></div>
            <div class="domain-list">
              @for (movement of record.movements ?? []; track movement.title + movement.date) {
                <div class="domain-list-row"><span class="material-symbols-outlined">receipt_long</span><div><strong>{{ movement.title }}</strong><small>{{ movement.category }} - {{ date(movement.date) }}</small></div><b>{{ money(movement.amount) }}</b></div>
              } @empty { <div class="domain-empty">Nenhum lançamento disponível para este período.</div> }
            </div>
          </section>
        }
      } @else if (section === 'cards' || section === 'cardCredit' || section === 'cardDebit' || section === 'cardVoucher') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">credit_card</span><div><span class="domain-kicker">{{ cardType(record.cardType) }}</span><h2>{{ record.title }}</h2></div></div>
        @if ((cardTab === 'overview' || record.cardType !== 'CREDITO') && record.cardType !== 'DEBITO') { <div class="card-detail-section-heading"><span class="material-symbols-outlined">{{ record.cardType === 'VOUCHER' ? 'payments' : 'credit_card' }}</span><strong>{{ record.cardType === 'VOUCHER' ? 'Recarga' : 'Resumo do cartão' }}</strong></div> }
        @if (record.cardType === 'CREDITO') { <div class="domain-tabs" role="tablist"><button [class.active]="cardTab === 'overview'" (click)="cardTabChange.emit('overview')">Visão geral</button><button [class.active]="cardTab === 'invoices'" (click)="cardTabChange.emit('invoices')">Faturas</button></div> }
        @if (record.cardType !== 'DEBITO') {
          <div class="domain-metrics"><div><span>LIMITE DE CRÉDITO</span><strong>{{ money(record.creditLimit) }}</strong></div><div><span>SALDO</span><strong>{{ money(record.balance) }}</strong></div><div><span>RECARGA</span><strong>{{ money(record.rechargeAmount) }}</strong></div></div>
          <div class="domain-fields"><div><span>FECHAMENTO</span><strong>{{ day(record.closingDay) }}</strong></div><div><span>VENCIMENTO</span><strong>{{ day(record.dueDay) }}</strong></div><div><span>RECARGA</span><strong>{{ day(record.rechargeDay) }}</strong></div></div>
        }
        @if (record.cardType === 'CREDITO' && cardTab === 'invoices') { <section class="domain-section card-invoices-section"><div class="domain-section-heading"><span class="material-symbols-outlined">receipt_long</span><strong>Faturas</strong></div><div class="domain-list">@for (invoice of invoices; track invoice.id) { <div class="domain-list-row"><span class="material-symbols-outlined">receipt_long</span><div><strong>{{ invoice.title }}</strong></div><div class="invoice-list-total"><span class="invoice-status-tag">{{ invoice.status ?? 'Status indisponível' }}</span><b>{{ money(invoice.amount) }}</b></div></div> } @empty { <div class="domain-empty">Nenhuma fatura disponível para este período.</div> }</div></section> }
        @if (record.cardType === 'CREDITO' && cardTab === 'invoices') { <div class="invoice-month-picker standalone-month-picker"><strong>Filtro</strong><label><select [value]="invoiceMonthValue()" (change)="changeInvoiceMonthPart('month', $event)" aria-label="Selecionar mês">@for (month of invoiceMonths; track month.value) { <option [value]="month.value">{{ month.label }}</option> }</select></label><span class="invoice-period-separator">/</span><label><select [value]="invoiceYearValue()" (change)="changeInvoiceMonthPart('year', $event)" aria-label="Selecionar ano">@for (year of invoiceYears; track year) { <option [value]="year">{{ year }}</option> }</select></label><div class="invoice-period-presets" aria-label="Períodos rápidos"><button type="button" (click)="invoicePreset.emit('current')">Este mês</button><button type="button" (click)="invoicePreset.emit('previous3')">Últimos 3 meses</button><button type="button" (click)="invoicePreset.emit('previous6')">Últimos 6 meses</button><button type="button" (click)="invoicePreset.emit('next3')">Próximos 3 meses</button><button type="button" (click)="invoicePreset.emit('next6')">Próximos 6 meses</button><button type="button" (click)="invoicePreset.emit('next12')">Próximos 12 meses</button></div></div> }
        @if (record.cardType === 'CREDITO' && cardTab === 'invoices') {
          <div class="invoice-range-picker">
            <label>Data inicial<input type="date" [value]="invoicePeriod.from" (change)="changeInvoicePeriod('from', $event)" /></label>
            <label>Data final<input type="date" [value]="invoicePeriod.to" (change)="changeInvoicePeriod('to', $event)" /></label>
            <div class="invoice-period-presets" aria-label="Períodos rápidos"><button type="button" (click)="invoicePreset.emit('current')">Este mês</button><button type="button" (click)="invoicePreset.emit('previous3')">Últimos 3 meses</button><button type="button" (click)="invoicePreset.emit('previous6')">Últimos 6 meses</button><button type="button" (click)="invoicePreset.emit('next3')">Próximos 3 meses</button><button type="button" (click)="invoicePreset.emit('next6')">Próximos 6 meses</button><button type="button" (click)="invoicePreset.emit('next12')">Próximos 12 meses</button></div>
          </div>
        }
        @if (record.cardType === 'CREDITO' && cardTab === 'invoices') {
          <button type="button" class="invoice-search-button" (click)="invoiceSearch.emit()"><span class="material-symbols-outlined">search</span>BUSCAR FATURAS</button>
        }
        @if (record.cardType === 'CREDITO' && cardTab === 'overview') {
          <section class="domain-section card-invoices-section overview-next-invoice">
            <div class="domain-section-heading"><span class="material-symbols-outlined">receipt_long</span><strong>Fatura do proximo mes</strong></div>
            <div class="domain-list">
              @for (invoice of invoices; track invoice.id) {
                <div class="domain-list-row"><span class="material-symbols-outlined">receipt_long</span><div><strong>{{ invoice.title }}</strong></div><div class="invoice-list-total"><span class="invoice-status-tag">{{ invoice.status ?? "Status indisponivel" }}</span><b>{{ money(invoice.amount) }}</b></div></div>
              } @empty { <div class="domain-empty">Nenhuma fatura encontrada para o proximo mes.</div> }
            </div>
          </section>
          <div class="domain-list overview-invoice-click-list">
            @for (invoice of invoices; track invoice.id) {
              <button type="button" class="domain-list-row invoice-list-button" (click)="invoiceSelect.emit(invoice)"><span class="material-symbols-outlined">receipt_long</span><div><strong>{{ invoice.title }}</strong></div><div class="invoice-list-total"><span class="invoice-status-tag">{{ invoice.status ?? "Status indisponivel" }}</span><b>{{ money(invoice.amount) }}</b></div></button>
            }
          </div>
        }
        @if (cardTab === 'invoices') {
          <section class="domain-section invoice-click-list">
            <div class="domain-section-heading"><span class="material-symbols-outlined">receipt_long</span><strong>Faturas</strong></div>
            <div class="domain-list">
              @for (invoice of invoices; track invoice.id) {
                <button type="button" class="domain-list-row invoice-list-button" (click)="invoiceSelect.emit(invoice)"><span class="material-symbols-outlined">receipt_long</span><div><strong>{{ invoice.title }}</strong></div><div class="invoice-list-total"><span class="invoice-status-tag">{{ invoice.status ?? "Status indisponivel" }}</span><b>{{ money(invoice.amount) }}</b></div></button>
              } @empty { <div class="domain-empty">Nenhuma fatura disponivel para este periodo.</div> }
            </div>
          </section>
        }
       } @else if (section === 'investments') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">monitoring</span><div><span class="domain-kicker">INVESTIMENTO</span><h2>{{ record.title }}</h2></div></div>
        <div class="card-detail-section-heading"><span class="material-symbols-outlined">monitoring</span><strong>Resumo do investimento</strong></div>
        <div class="domain-metrics"><div><span>VALOR INICIAL</span><strong>{{ money(record.initialAmount) }}</strong></div><div><span>VALOR CORRENTE</span><strong>{{ money(record.currentAmount) }}</strong></div><div><span>VARIAÇÃO</span><strong>{{ money(difference(record.currentAmount, record.initialAmount)) }}</strong></div></div>
        <div class="domain-fields"><div><span>INÍCIO</span><strong>{{ date(record.date) }}</strong></div><div><span>JUROS AO MÊS</span><strong>{{ percent(record.interestRate) }}</strong></div></div>
      } @else if (section === 'goals') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">flag</span><div><span class="domain-kicker">META FINANCEIRA</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-metrics"><div><span>VALOR ALVO</span><strong>{{ money(record.targetAmount) }}</strong></div><div><span>VALOR ACUMULADO</span><strong>{{ money(record.accumulatedAmount) }}</strong></div><div><span>RESTANTE</span><strong>{{ money(difference(record.targetAmount, record.accumulatedAmount)) }}</strong></div></div><div class="domain-progress"><span [style.width.%]="progress(record.accumulatedAmount, record.targetAmount)"></span></div><div class="domain-progress-meta"><span>PROGRESSO</span><strong>{{ progressLabel(record.accumulatedAmount, record.targetAmount) }}</strong></div><div class="domain-fields"><div><span>DATA PREVISTA</span><strong>{{ date(record.dueDate) }}</strong></div></div>
      } @else if (section === 'budgets') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">pie_chart</span><div><span class="domain-kicker">ORÇAMENTO</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-metrics"><div><span>VALOR LIMITE</span><strong>{{ money(record.amount) }}</strong></div><div><span>VALOR UTILIZADO</span><strong>{{ money(record.currentAmount) }}</strong></div><div><span>RESTANTE</span><strong>{{ money(difference(record.amount, record.currentAmount)) }}</strong></div></div><div class="domain-progress"><span [style.width.%]="progress(record.currentAmount, record.amount)"></span></div><div class="domain-progress-meta"><span>MÊS DE REFERÊNCIA</span><strong>{{ month(record.date) }}</strong></div>
      } @else if (section === 'invoices') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">receipt_long</span><div><span class="domain-kicker">FATURA</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-metrics"><div><span>VALOR TOTAL</span><strong>{{ money(record.amount) }}</strong></div><div><span>STATUS</span><strong>{{ record.status ?? 'Status indisponível' }}</strong></div></div><div class="domain-fields"><div><span>REFERÊNCIA</span><strong>{{ month(record.date) }}</strong></div></div>
      } @else if (section === 'transactions') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">receipt_long</span><div><span class="domain-kicker">LANÇAMENTO</span><h2>{{ record.title }}</h2></div></div><div class="domain-metrics"><div><span>VALOR</span><strong>{{ money(record.amount) }}</strong></div><div><span>CATEGORIA</span><strong>{{ record.category }}</strong></div><div><span>DATA</span><strong>{{ date(record.date) }}</strong></div></div>
      }
    </div>
  `,
})
export class FinanceRecordDetailComponent {
	readonly invoiceMonths = [{ value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" }, { value: "03", label: "Março" }, { value: "04", label: "Abril" }, { value: "05", label: "Maio" }, { value: "06", label: "Junho" }, { value: "07", label: "Julho" }, { value: "08", label: "Agosto" }, { value: "09", label: "Setembro" }, { value: "10", label: "Outubro" }, { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" }];
	readonly invoiceYears = Array.from({ length: 11 }, (_, index) => 2026 + index);
  @Input({ required: true }) section!: SectionKey;
  @Input({ required: true }) record!: FinanceRecord;
  @Input() accountTab: AccountTab = "overview";
  @Output() readonly accountTabChange = new EventEmitter<AccountTab>();
  @Input() cardTab: CardTab = "overview";
  @Input() loading = false;
  @Input() loadingActive = false;
  @Input() reveal = false;
  @Input() invoices: FinanceRecord[] = [];
  @Input() entryPeriod: { from: string; to: string } = { from: "", to: "" };
  @Input() invoiceMonth = "";
  @Input() invoicePeriod: { from: string; to: string } = { from: "", to: "" };
  @Output() readonly cardTabChange = new EventEmitter<CardTab>();
  @Output() readonly invoiceMonthChange = new EventEmitter<string>();
  @Output() readonly invoicePreset = new EventEmitter<"current" | "previous3" | "previous6" | "next3" | "next6" | "next12">();
  @Output() readonly invoicePeriodChange = new EventEmitter<{ from: string; to: string }>();
  @Output() readonly invoiceSearch = new EventEmitter<void>();
  @Output() readonly invoiceSelect = new EventEmitter<FinanceRecord>();
  @Output() readonly entrySearch = new EventEmitter<void>();
  @Output() readonly entryPeriodChange = new EventEmitter<{ from: string; to: string }>();

	entryDateChange(field: "from" | "to", event: Event): void {
		const value = (event.target as HTMLInputElement).value;
		this.entryPeriodChange.emit({ ...this.entryPeriod, [field]: value });
	}

	invoiceMonthValue(): string { return this.invoiceMonth.slice(5, 7); }
	invoiceYearValue(): string { return this.invoiceMonth.slice(0, 4); }
	changeInvoiceMonthPart(part: "month" | "year", event: Event): void {
		const value = (event.target as HTMLSelectElement).value;
		const month = part === "month" ? value : this.invoiceMonthValue();
		const year = part === "year" ? value : this.invoiceYearValue();
		this.invoiceMonthChange.emit(`${year}-${month}`);
	}

  changeInvoicePeriod(field: "from" | "to", event: Event): void {
    this.invoicePeriodChange.emit({ ...this.invoicePeriod, [field]: (event.target as HTMLInputElement).value });
  }

  money(value: number | undefined): string { return value === undefined ? "Valor indisponível" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
  date(value: string | undefined): string { if (!value) return "Data indisponível"; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? "Data indisponível" : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", ""); }
  month(value: string | undefined): string { if (!value) return "Mês indisponível"; const date = new Date(`${value}-01T12:00:00`); return Number.isNaN(date.getTime()) ? "Mês indisponível" : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date); }
  difference(first: number | undefined, second: number | undefined): number | undefined { return first !== undefined && second !== undefined ? first - second : undefined; }
  progress(current: number | undefined, target: number | undefined): number | null { if (current === undefined || target === undefined || target <= 0) return null; return Math.min(Math.max(current / target * 100, 0), 100); }
  progressLabel(current: number | undefined, target: number | undefined): string { const value = this.progress(current, target); return value === null ? "Progresso indisponível" : `${value.toFixed(0)}%`; }
  percent(value: number | undefined): string { return value === undefined ? "Valor indisponível" : `${value}%`; }
  day(value: number | undefined): string { return value === undefined ? "Não informado" : `Dia ${value}`; }
  cardType(value: string | undefined): string { return value === undefined ? "CARTÃO" : value.replaceAll("_", " "); }
}
