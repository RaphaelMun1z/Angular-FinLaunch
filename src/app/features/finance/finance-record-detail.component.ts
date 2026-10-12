import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AccountTab, FinanceRecord, SectionKey } from "../../core/models/finance.models";

@Component({
  selector: "app-finance-record-detail",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="domain-detail">
      @if (section === 'accounts') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">account_balance</span><div><span class="domain-kicker">CONTA BANCÁRIA</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-tabs" role="tablist"><button [class.active]="accountTab === 'overview'" (click)="accountTabChange.emit('overview')">Visão geral</button><button [class.active]="accountTab === 'movements'" (click)="accountTabChange.emit('movements')">Movimentações</button><button [class.active]="accountTab === 'entries'" (click)="accountTabChange.emit('entries')">Lançamentos</button></div>
        @if (accountTab === 'overview') { <div class="domain-metrics"><div><span>SALDO</span><strong>{{ money(record.balance) }}</strong></div><div><span>CRÉDITO TOTAL</span><strong>{{ money(record.creditTotal) }}</strong></div><div><span>CRÉDITO DISPONÍVEL</span><strong>{{ money(record.creditRemaining) }}</strong></div></div> } @else { <div class="domain-list">@for (movement of record.movements ?? []; track movement.title + movement.date) { <div class="domain-list-row"><span class="material-symbols-outlined">{{ movement.type === 'income' ? 'south_west' : 'north_east' }}</span><div><strong>{{ movement.title }}</strong><small>{{ movement.category }} · {{ date(movement.date) }}</small></div><b>{{ money(movement.amount) }}</b></div> } @empty { <div class="domain-empty">Nenhum registro disponível para este período.</div> }</div> }
      } @else if (section === 'cards' || section === 'cardCredit' || section === 'cardDebit' || section === 'cardVoucher') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">credit_card</span><div><span class="domain-kicker">{{ cardType(record.cardType) }}</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-metrics"><div><span>LIMITE DE CRÉDITO</span><strong>{{ money(record.creditLimit) }}</strong></div><div><span>SALDO</span><strong>{{ money(record.balance) }}</strong></div><div><span>RECARGA</span><strong>{{ money(record.rechargeAmount) }}</strong></div></div>
        <div class="domain-fields"><div><span>FECHAMENTO</span><strong>{{ day(record.closingDay) }}</strong></div><div><span>VENCIMENTO</span><strong>{{ day(record.dueDay) }}</strong></div><div><span>RECARGA</span><strong>{{ day(record.rechargeDay) }}</strong></div></div>
      } @else if (section === 'investments') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">monitoring</span><div><span class="domain-kicker">INVESTIMENTO</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-metrics"><div><span>VALOR INICIAL</span><strong>{{ money(record.initialAmount) }}</strong></div><div><span>VALOR CORRENTE</span><strong>{{ money(record.currentAmount) }}</strong></div><div><span>VARIAÇÃO</span><strong>{{ money(difference(record.currentAmount, record.initialAmount)) }}</strong></div></div>
        <div class="domain-fields"><div><span>INÍCIO</span><strong>{{ date(record.date) }}</strong></div><div><span>JUROS AO MÊS</span><strong>{{ percent(record.interestRate) }}</strong></div></div>
      } @else if (section === 'goals') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">flag</span><div><span class="domain-kicker">META FINANCEIRA</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-metrics"><div><span>VALOR ALVO</span><strong>{{ money(record.targetAmount) }}</strong></div><div><span>VALOR ACUMULADO</span><strong>{{ money(record.accumulatedAmount) }}</strong></div><div><span>RESTANTE</span><strong>{{ money(difference(record.targetAmount, record.accumulatedAmount)) }}</strong></div></div>
        <div class="domain-progress"><span [style.width.%]="progress(record.accumulatedAmount, record.targetAmount)"></span></div><div class="domain-progress-meta"><span>PROGRESSO</span><strong>{{ progressLabel(record.accumulatedAmount, record.targetAmount) }}</strong></div><div class="domain-fields"><div><span>DATA PREVISTA</span><strong>{{ date(record.dueDate) }}</strong></div></div>
      } @else if (section === 'budgets') {
        <div class="domain-header"><span class="domain-icon material-symbols-outlined">pie_chart</span><div><span class="domain-kicker">ORÇAMENTO</span><h2>{{ record.title }}</h2></div></div>
        <div class="domain-metrics"><div><span>VALOR LIMITE</span><strong>{{ money(record.amount) }}</strong></div><div><span>VALOR UTILIZADO</span><strong>{{ money(record.currentAmount) }}</strong></div><div><span>RESTANTE</span><strong>{{ money(difference(record.amount, record.currentAmount)) }}</strong></div></div>
        <div class="domain-progress"><span [style.width.%]="progress(record.currentAmount, record.amount)"></span></div><div class="domain-progress-meta"><span>MÊS DE REFERÊNCIA</span><strong>{{ month(record.date) }}</strong></div>
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
  @Input({ required: true }) section!: SectionKey;
  @Input({ required: true }) record!: FinanceRecord;
  @Input() accountTab: AccountTab = "overview";
  @Output() accountTabChange = new EventEmitter<AccountTab>();

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
