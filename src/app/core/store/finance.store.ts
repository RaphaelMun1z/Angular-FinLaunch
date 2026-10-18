import { computed, inject } from "@angular/core";
import { patchState, signalStore, withComputed, withMethods, withState } from "@ngrx/signals";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";
import { FinanceApiService } from "../api/finance-api.service";
import { BankAccountRequest, BankAccountResponse, BudgetRequest, CardRequest, CardResponse, CategoryRequest, CategoryResponse, GoalResponse, InvestmentResponse, MovementRequest, PeriodRequest } from "../api/api.models";
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
      forkJoin({ accounts: api.listAccounts(), categories: api.listCategories(), investments: api.listInvestments(), goals: api.listGoals() })
        .pipe(switchMap((data) => {
          const accountIds = data.accounts.map((account) => account.id).filter((id): id is string => id !== undefined);
          if (!accountIds.length) return of({ ...data, cards: [] as CardResponse[] });
          return forkJoin(
            accountIds.map((accountId) => api.listCards(accountId).pipe(
              map((cards) => cards.map((card) => ({ ...card, contaBancariaId: card.contaBancariaId ?? accountId }))),
            )),
          ).pipe(map((cardGroups) => ({ ...data, cards: cardGroups.reduce((cards, group) => cards.concat(group), [] as CardResponse[]) })));
        }))
        .pipe(map((data) => ({ sections: mapApiSections(data.accounts, data.cards, data.categories, data.investments, data.goals) })), catchError((error: unknown) => { patchState(store, { sections: emptySections(), loading: false, error: toUserError(error) }); return of(null); }))
        .subscribe((data) => { if (data) patchState(store, { sections: data.sections, loading: false, error: null }); });
    },
    loadAccountMovements(accountId: string, period: PeriodRequest): void {
      patchState(store, { loading: true, error: null });
      api.listMovements(accountId, period).subscribe({
        next: (items) => {
          const movements: Movement[] = items.filter((item) => item.descricao !== undefined && item.categoriaId !== undefined && item.valorTotal !== undefined && item.dataLancamento !== undefined).map((item) => ({ title: item.descricao!, category: item.categoriaId!, amount: item.valorTotal!, date: item.dataLancamento!, type: item.valorTotal! >= 0 ? "income" : "expense" }));
          const records = store.sections().accounts.records.map((record) => record.apiId === accountId ? { ...record, movements } : record);
          patchState(store, { sections: { ...store.sections(), accounts: { ...store.sections().accounts, records } }, loading: false, error: null });
        },
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    loadAccountEntries(accountId: string, period: PeriodRequest): void {
      patchState(store, { loading: true, error: null });
      api.listEntries(accountId, period).subscribe({
        next: (items) => {
          const movements: Movement[] = items.filter((item) => item.descricao !== undefined && item.valor !== undefined && item.dataLancamento !== undefined).map((item) => ({ title: item.descricao!, category: "Lançamento", amount: item.valor!, date: item.dataLancamento!, type: "expense" }));
          const records = store.sections().accounts.records.map((record) => record.apiId === accountId ? { ...record, movements } : record);
          patchState(store, { sections: { ...store.sections(), accounts: { ...store.sections().accounts, records } }, loading: false, error: null });
        },
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    loadBudgets(categoryId: string): void {
      patchState(store, { loading: true, error: null });
      api.listBudgets(categoryId).subscribe({
        next: (items) => {
          const records = items.filter((item) => item.id !== undefined && item.categoria !== undefined && item.valorLimite !== undefined && item.mesReferencia !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.categoria!, category: "Limite mensal", amount: item.valorLimite!, currentAmount: item.valorCorrente, date: item.mesReferencia!, type: "expense" as const }));
          patchState(store, { sections: { ...store.sections(), budgets: { ...store.sections().budgets, records } }, loading: false, error: null });
        },
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    loadInvoices(cardId: string, period: PeriodRequest): void {
      patchState(store, { loading: true, error: null });
      api.listInvoices(cardId, period).subscribe({
        next: (items) => {
          const records = items.filter((item) => item.id !== undefined && item.valorTotal !== undefined && item.dataReferencia !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: `Fatura ${item.dataReferencia!}`, category: item.status ?? "", amount: item.valorTotal!, date: item.dataReferencia!, type: "expense" as const, status: item.status }));
          patchState(store, { sections: { ...store.sections(), invoices: { ...store.sections().invoices, records } }, loading: false, error: null });
        },
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    navigate(active: SectionKey): void { patchState(store, { active, selectedId: null, query: "", accountTab: "overview", cardTab: "overview", categoryTab: "overview", editingId: null }); },
    setActiveAccountId(activeAccountId: string | null): void { patchState(store, { activeAccountId }); },
    resetSession(): void { patchState(store, { ...initialState, sections: initialState.sections }); },
    clearError(): void { patchState(store, { error: null }); },
    selectRecord(selectedId: string | null): void { patchState(store, { selectedId }); },
    setQuery(query: string): void { patchState(store, { query }); },
    setFilters(filters: Filters): void { patchState(store, { filters }); },
    setAccountTab(accountTab: FinanceState["accountTab"]): void { patchState(store, { accountTab }); },
    setCardTab(cardTab: FinanceState["cardTab"]): void { patchState(store, { cardTab }); },
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
    createAccount(values: BankAccountRequest): Observable<boolean> {
      return api.createAccount(values).pipe(
        map((created) => {
          const record = mapAccountRecord(created);
          if (!record) {
            patchState(store, { error: "A conta foi salva, mas a API não retornou os dados necessários para atualizar a listagem." });
            return false;
          }
          patchState(store, {
            sections: {
              ...store.sections(),
              accounts: {
                ...store.sections().accounts,
                records: [...store.sections().accounts.records, record],
              },
            },
            error: null,
          });
          return true;
        }),
        catchError((error: unknown) => { patchState(store, { error: toUserError(error) }); return of(false); }),
      );
    },
    createCard(values: CardRequest): Observable<boolean> {
      return api.createCard(values).pipe(
        map(() => {
          api.listCards(values.contaBancariaId).subscribe({
            next: (items) => patchState(store, { sections: mapCardsInAccountSections(items, values.contaBancariaId, store.sections()), error: null }),
            error: (error: unknown) => patchState(store, { error: toUserError(error) }),
          });
          return true;
        }),
        catchError((error: unknown) => { patchState(store, { error: toUserError(error) }); return of(false); }),
      );
    },
    createBudget(categoryId: string, values: BudgetRequest): Observable<boolean> {
      return api.createBudget(categoryId, values).pipe(
        map(() => { (store as unknown as { loadBudgets: (id: string) => void }).loadBudgets(categoryId); return true; }),
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
  const accountRecords = accounts.map(mapAccountRecord).filter((record): record is FinanceRecord => record !== null);
  const categoryRecords = mapCategoryRecords(categories);
  const budgetRecords: FinanceRecord[] = [];
  const cardRecords = mapCardRecords(cards);
  const investmentRecords = investments.filter((item) => item.id !== undefined && item.categoria !== undefined && (item.valorCorrente !== undefined || item.valorInicial !== undefined)).map((item) => ({ id: item.id!, apiId: item.id!, title: item.categoria!, category: "Investimento", amount: item.valorCorrente ?? item.valorInicial!, initialAmount: item.valorInicial, currentAmount: item.valorCorrente, interestRate: item.jurosAoMes, date: item.dataInicio ?? "", type: "income" as const }));
  const goalRecords = goals.filter((item) => item.id !== undefined && item.objetivo !== undefined && item.valorAlvo !== undefined && item.dataConclusaoPrevista !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.objetivo!, category: "Meta financeira", amount: item.valorAlvo!, targetAmount: item.valorAlvo, accumulatedAmount: item.valorAcumulado, dueDate: item.dataConclusaoPrevista, date: item.dataConclusaoPrevista!, type: "income" as const }));
  const current = initialState.sections;
  return { ...current, accounts: { ...current.accounts, records: accountRecords }, categories: { ...current.categories, records: categoryRecords }, budgets: { ...current.budgets, records: budgetRecords }, cards: { ...current.cards, records: cardRecords }, cardCredit: { ...current.cardCredit, records: cardRecords.filter((record) => record.category === "CREDITO") }, cardDebit: { ...current.cardDebit, records: cardRecords.filter((record) => record.category === "DEBITO") }, cardVoucher: { ...current.cardVoucher, records: cardRecords.filter((record) => record.category === "VOUCHER") }, investments: { ...current.investments, records: investmentRecords }, goals: { ...current.goals, records: goalRecords } };
}

function mapCardRecords(cards: CardResponse[]): FinanceRecord[] {
  return cards.filter((item) => item.id !== undefined && item.apelido !== undefined && item.tipoCartao !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.apelido!, category: item.tipoCartao!, amount: item.limiteCredito ?? item.saldoCorrente ?? item.valorRecarga, creditLimit: item.limiteCredito, balance: item.saldoCorrente, rechargeAmount: item.valorRecarga, accountId: item.contaBancariaId, cardType: item.tipoCartao, closingDay: item.diaFechamento, dueDay: item.diaVencimento, rechargeDay: item.diaRecarga, date: "", type: "expense" as const }));
}

function mapCardsInSections(cards: CardResponse[], current: FinanceState["sections"]): FinanceState["sections"] {
  const cardRecords = mapCardRecords(cards);
  return { ...current, cards: { ...current.cards, records: cardRecords }, cardCredit: { ...current.cardCredit, records: cardRecords.filter((record) => record.category === "CREDITO") }, cardDebit: { ...current.cardDebit, records: cardRecords.filter((record) => record.category === "DEBITO") }, cardVoucher: { ...current.cardVoucher, records: cardRecords.filter((record) => record.category === "VOUCHER") } };
}

function mapCardsInAccountSections(cards: CardResponse[], accountId: string, current: FinanceState["sections"]): FinanceState["sections"] {
  const cardRecords = [...current.cards.records.filter((record) => record.accountId !== accountId), ...mapCardRecords(cards)];
  return { ...current, cards: { ...current.cards, records: cardRecords }, cardCredit: { ...current.cardCredit, records: cardRecords.filter((record) => record.category === "CREDITO") }, cardDebit: { ...current.cardDebit, records: cardRecords.filter((record) => record.category === "DEBITO") }, cardVoucher: { ...current.cardVoucher, records: cardRecords.filter((record) => record.category === "VOUCHER") } };
}

function mapAccountRecord(item: BankAccountResponse): FinanceRecord | null {
  if (item.id === undefined || item.nomeDoBanco === undefined) return null;
  return { id: item.id, apiId: item.id, title: item.nomeDoBanco, category: "Conta corrente", amount: item.saldoCorrente, balance: item.saldoCorrente, creditTotal: item.creditoTotal, creditRemaining: item.creditoRestante, date: "", type: "income" as const };
}

function mapCategoryRecords(categories: CategoryResponse[]): FinanceRecord[] {
  return categories.filter((item) => item.id !== undefined && item.nome !== undefined && item.tipo !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.nome!, category: item.tipo === "ENTRADA" ? "Entradas" : "Saídas", type: item.tipo === "ENTRADA" ? "income" as const : "expense" as const, icon: item.icone, color: item.cor, budget: item.orcamento ? { id: item.orcamento.id, month: item.orcamento.mesReferencia, amount: item.orcamento.valorLimite, currentAmount: item.orcamento.valorCorrente } : undefined }));
}

function emptySections(): FinanceState["sections"] {
  return Object.fromEntries(Object.entries(initialState.sections).map(([key, section]) => [key, { ...section, records: [] }])) as unknown as FinanceState["sections"];
}
