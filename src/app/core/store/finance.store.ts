import { computed, inject } from "@angular/core";
import { patchState, signalStore, withComputed, withMethods, withState } from "@ngrx/signals";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { FinanceApiService } from "../api/finance-api.service";
import { BankAccountResponse, CardResponse, CategoryRequest, CategoryResponse, GoalResponse, InvestmentResponse, MovementRequest, PeriodRequest } from "../api/api.models";
import { toUserError } from "../http/http-error.util";
import { initialState } from "../models/finance.data";
import { FinanceRecord, FinanceState, Filters, Movement, OverviewSelection, SectionKey } from "../models/finance.models";

export const FinanceStore = signalStore(
  { providedIn: "root" },
  withState<FinanceState>(initialState),
  withComputed((store) => ({
    activeSection: computed(() => store.sections()[store.active()]),
    selectedRecord: computed(() => store.sections()[store.active()]?.records.find((record) => record.id === store.selectedId()) ?? null),
    filteredRecords: computed(() => {
      const section = store.sections()[store.active()];
      if (!section || store.active() === "overview") return [];
      const filters = store.filters();
      const query = store.query().toLowerCase();
      return [...section.records]
        .filter((record) => `${record.title} ${record.category} ${record.notes ?? ""}`.toLowerCase().includes(query))
        .filter((record) => (filters.type === "all" || record.type === filters.type) && (filters.category === "all" || record.category === filters.category) && (!filters.from || (record.date !== undefined && record.date >= filters.from)) && (!filters.to || (record.date !== undefined && record.date <= filters.to)))
        .sort((a, b) => filters.sort === "oldest" ? (a.date ?? "").localeCompare(b.date ?? "") : filters.sort === "higher" ? (b.amount ?? 0) - (a.amount ?? 0) : filters.sort === "lower" ? (a.amount ?? 0) - (b.amount ?? 0) : filters.sort === "az" ? a.title.localeCompare(b.title, "pt-BR") : (b.date ?? "").localeCompare(a.date ?? ""));
    }),
  })),
  withMethods((store, api = inject(FinanceApiService)) => ({
    loadFromApi(): void {
      patchState(store, { loading: true, error: null });
      forkJoin({ accounts: api.listAccounts(), cards: api.listCards(), categories: api.listCategories(), investments: api.listInvestments(), goals: api.listGoals() })
        .pipe(map((data) => ({ sections: mapApiSections(data.accounts, data.cards, data.categories, data.investments, data.goals) })), catchError((error: unknown) => { patchState(store, { sections: emptySections(), loading: false, error: toUserError(error) }); return of(null); }))
        .subscribe((data) => { if (data) patchState(store, { sections: data.sections, loading: false, error: null }); });
    },
    loadAccountMovements(accountId: string, period: PeriodRequest): void {
      api.listMovements(accountId, period).subscribe({
        next: (items) => {
          const movements: Movement[] = items.filter((item) => item.descricao !== undefined && item.categoriaId !== undefined && item.valorTotal !== undefined && item.dataLancamento !== undefined).map((item) => ({ title: item.descricao!, category: item.categoriaId!, amount: item.valorTotal!, date: item.dataLancamento!, type: item.valorTotal! >= 0 ? "income" : "expense" }));
          const records = store.sections().accounts.records.map((record) => record.apiId === accountId ? { ...record, movements } : record);
          patchState(store, { sections: { ...store.sections(), accounts: { ...store.sections().accounts, records } }, error: null });
        },
        error: (error: unknown) => patchState(store, { error: toUserError(error) }),
      });
    },
    loadAccountEntries(accountId: string, period: PeriodRequest): void {
      api.listEntries(accountId, period).subscribe({
        next: (items) => {
          const movements: Movement[] = items.filter((item) => item.descricao !== undefined && item.valor !== undefined && item.dataLancamento !== undefined).map((item) => ({ title: item.descricao!, category: "Lançamento", amount: item.valor!, date: item.dataLancamento!, type: "expense" }));
          const records = store.sections().accounts.records.map((record) => record.apiId === accountId ? { ...record, movements } : record);
          patchState(store, { sections: { ...store.sections(), accounts: { ...store.sections().accounts, records } }, error: null });
        },
        error: (error: unknown) => patchState(store, { error: toUserError(error) }),
      });
    },
    loadBudgets(categoryId: string): void {
      api.listBudgets(categoryId).subscribe({
        next: (items) => {
          const records = items.filter((item) => item.id !== undefined && item.categoria !== undefined && item.valorLimite !== undefined && item.mesReferencia !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.categoria!, category: "Limite mensal", amount: item.valorLimite!, currentAmount: item.valorCorrente, date: item.mesReferencia!, type: "expense" as const }));
          patchState(store, { sections: { ...store.sections(), budgets: { ...store.sections().budgets, records } }, error: null });
        },
        error: (error: unknown) => patchState(store, { error: toUserError(error) }),
      });
    },
    loadInvoices(cardId: string, period: PeriodRequest): void {
      api.listInvoices(cardId, period).subscribe({
        next: (items) => {
          const records = items.filter((item) => item.id !== undefined && item.valorTotal !== undefined && item.dataReferencia !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: `Fatura ${item.dataReferencia!}`, category: item.status ?? "", amount: item.valorTotal!, date: item.dataReferencia!, type: "expense" as const, status: item.status }));
          patchState(store, { sections: { ...store.sections(), invoices: { ...store.sections().invoices, records } }, error: null });
        },
        error: (error: unknown) => patchState(store, { error: toUserError(error) }),
      });
    },
    navigate(active: SectionKey): void { patchState(store, { active, selectedId: null, query: "", accountTab: "overview", categoryTab: "overview", editingId: null }); },
    resetSession(): void { patchState(store, { ...initialState, sections: initialState.sections }); },
    clearError(): void { patchState(store, { error: null }); },
    selectRecord(selectedId: string | null): void { patchState(store, { selectedId }); },
    setQuery(query: string): void { patchState(store, { query }); },
    setFilters(filters: Filters): void { patchState(store, { filters }); },
    setAccountTab(accountTab: FinanceState["accountTab"]): void { patchState(store, { accountTab }); },
    setCategoryTab(categoryTab: FinanceState["categoryTab"]): void { patchState(store, { categoryTab }); },
    selectOverview(overviewSelection: OverviewSelection): void { patchState(store, { overviewSelection, selectedId: null }); },
    startEditing(editingId: string | null): void { patchState(store, { editingId }); },
    createCategory(values: CategoryRequest): Observable<boolean> {
      return api.createCategory(values).pipe(
        map(() => {
          api.listCategories().subscribe({
            next: (items) => patchState(store, { sections: { ...store.sections(), categories: { ...store.sections().categories, records: mapCategoryRecords(items) } }, error: null }),
          });
          return true;
        }),
        catchError((error: unknown) => { patchState(store, { error: toUserError(error) }); return of(false); }),
      );
    },
    createMovement(accountId: string, values: MovementRequest): Observable<boolean> {
      return api.createMovement(accountId, values).pipe(
        map(() => { return true; }),
        catchError((error: unknown) => { patchState(store, { error: toUserError(error) }); return of(false); }),
      );
    },
    saveRecord(values: Omit<FinanceRecord, "id" | "type" | "status" | "method">): void {
      const active = store.active();
      const refresh = (): void => (store as unknown as { loadFromApi: () => void }).loadFromApi();
      if (active === "goals" && values.amount !== undefined && values.date) {
        api.createGoal({ objetivo: values.title, valorAlvo: values.amount, dataConclusaoPrevista: values.date }).subscribe({ next: refresh, error: (error: unknown) => patchState(store, { error: toUserError(error) }) });
        return;
      }
      patchState(store, { error: "Esta operação não está disponível porque os campos exigidos pelo endpoint não foram fornecidos." });
    },
    deleteSelected(): void { if (store.selectedId() !== null && store.active() !== "overview") patchState(store, { error: "A API documentada não disponibiliza endpoint de exclusão para este recurso." }); },
  })),
);

function mapApiSections(accounts: BankAccountResponse[], cards: CardResponse[], categories: CategoryResponse[], investments: InvestmentResponse[], goals: GoalResponse[]): FinanceState["sections"] {
  const accountRecords = accounts.filter((item) => item.id !== undefined && item.nomeDoBanco !== undefined && item.saldoCorrente !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.nomeDoBanco!, category: "Conta corrente", amount: item.saldoCorrente!, balance: item.saldoCorrente, creditTotal: item.creditoTotal, creditRemaining: item.creditoRestante, date: "", type: "income" as const }));
  const categoryRecords = mapCategoryRecords(categories);
  const budgetRecords: FinanceRecord[] = [];
  const cardRecords = cards.filter((item) => item.id !== undefined && item.apelido !== undefined && item.tipoCartao !== undefined && (item.limiteCredito !== undefined || item.saldoCorrente !== undefined || item.valorRecarga !== undefined)).map((item) => ({ id: item.id!, apiId: item.id!, title: item.apelido!, category: item.tipoCartao!, amount: item.limiteCredito ?? item.saldoCorrente ?? item.valorRecarga!, creditLimit: item.limiteCredito, balance: item.saldoCorrente, rechargeAmount: item.valorRecarga, accountId: item.contaBancariaId, cardType: item.tipoCartao, closingDay: item.diaFechamento, dueDay: item.diaVencimento, rechargeDay: item.diaRecarga, date: "", type: "expense" as const }));
  const investmentRecords = investments.filter((item) => item.id !== undefined && item.categoria !== undefined && (item.valorCorrente !== undefined || item.valorInicial !== undefined)).map((item) => ({ id: item.id!, apiId: item.id!, title: item.categoria!, category: "Investimento", amount: item.valorCorrente ?? item.valorInicial!, initialAmount: item.valorInicial, currentAmount: item.valorCorrente, interestRate: item.jurosAoMes, date: item.dataInicio ?? "", type: "income" as const }));
  const goalRecords = goals.filter((item) => item.id !== undefined && item.objetivo !== undefined && item.valorAlvo !== undefined && item.dataConclusaoPrevista !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.objetivo!, category: "Meta financeira", amount: item.valorAlvo!, targetAmount: item.valorAlvo, accumulatedAmount: item.valorAcumulado, dueDate: item.dataConclusaoPrevista, date: item.dataConclusaoPrevista!, type: "income" as const }));
  const current = initialState.sections;
  return { ...current, accounts: { ...current.accounts, records: accountRecords }, categories: { ...current.categories, records: categoryRecords }, budgets: { ...current.budgets, records: budgetRecords }, cards: { ...current.cards, records: cardRecords }, cardCredit: { ...current.cardCredit, records: cardRecords.filter((record) => record.category === "CREDITO") }, cardDebit: { ...current.cardDebit, records: cardRecords.filter((record) => record.category === "DEBITO") }, cardVoucher: { ...current.cardVoucher, records: cardRecords.filter((record) => record.category === "VOUCHER") }, investments: { ...current.investments, records: investmentRecords }, goals: { ...current.goals, records: goalRecords } };
}

function mapCategoryRecords(categories: CategoryResponse[]): FinanceRecord[] {
  return categories.filter((item) => item.id !== undefined && item.nome !== undefined && item.tipo !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.nome!, category: item.tipo === "ENTRADA" ? "Entradas" : "Saídas", type: item.tipo === "ENTRADA" ? "income" as const : "expense" as const, icon: item.icone, color: item.cor, budget: item.orcamento ? { id: item.orcamento.id, month: item.orcamento.mesReferencia, amount: item.orcamento.valorLimite, currentAmount: item.orcamento.valorCorrente } : undefined }));
}

function emptySections(): FinanceState["sections"] {
  return Object.fromEntries(Object.entries(initialState.sections).map(([key, section]) => [key, { ...section, records: [] }])) as unknown as FinanceState["sections"];
}
