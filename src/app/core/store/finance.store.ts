import { computed, inject } from "@angular/core";
import { patchState, signalStore, withComputed, withMethods, withState } from "@ngrx/signals";
import { forkJoin, Observable, of } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";
import { FinanceApiService } from "../api/finance-api.service";
import { BankAccountRequest, BankAccountResponse, BudgetRequest, CardRequest, CardResponse, CategoryRequest, CategoryResponse, GoalRequest, GoalResponse, InvestmentRequest, InvestmentResponse, MovementRequest, PeriodRequest } from "../api/api.models";
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
  withMethods((store, api = inject(FinanceApiService)) => {
    const loadedSections = new Set<SectionKey>();
    const loadingSections = new Set<SectionKey>();
    let dashboardLoading = false;
    let dashboardMonthInFlight: string | undefined;
    let pendingDashboardMonth: string | undefined;
    const loadDashboard = (force = false, mesReferencia?: string): void => {
      if (dashboardLoading) {
        if (force && mesReferencia !== dashboardMonthInFlight) pendingDashboardMonth = mesReferencia;
        return;
      }
      if (!force && store.dashboard() !== null) return;
      dashboardLoading = true;
      dashboardMonthInFlight = mesReferencia;
      patchState(store, { loading: true, error: null });
      api.dashboard(mesReferencia).subscribe({
        next: (dashboard) => {
          dashboardLoading = false;
          dashboardMonthInFlight = undefined;
          patchState(store, { dashboard, loading: false, error: null });
          if (pendingDashboardMonth !== undefined && pendingDashboardMonth !== dashboard.mesReferencia) {
            const nextMonth = pendingDashboardMonth;
            pendingDashboardMonth = undefined;
            loadDashboard(true, nextMonth);
          } else {
            pendingDashboardMonth = undefined;
          }
        },
        error: (error: unknown) => {
          dashboardLoading = false;
          dashboardMonthInFlight = undefined;
          patchState(store, { loading: false, error: toUserError(error) });
          if (pendingDashboardMonth !== undefined) {
            const nextMonth = pendingDashboardMonth;
            pendingDashboardMonth = undefined;
            loadDashboard(true, nextMonth);
          }
        },
      });
    };
    const loadSection = (section: SectionKey, force = false): void => {
      if (loadingSections.has(section) || (!force && loadedSections.has(section))) return;
      if (section === "overview" || section === "transactions" || section === "statements" || section === "budgets" || section === "invoices") return;
      loadingSections.add(section);
      patchState(store, { loading: true, error: null });
      const update = (records: FinanceRecord[]): void => {
        loadingSections.delete(section);
        patchState(store, { sections: { ...store.sections(), [section]: { ...store.sections()[section], records } }, loading: false, error: null });
        loadedSections.add(section);
      };
      const fail = (error: unknown): void => {
        loadingSections.delete(section);
        patchState(store, { loading: false, error: toUserError(error) });
      };
      if (section === "accounts") {
        api.listAccounts().pipe(map((items) => items.map(mapAccountRecord).filter((record): record is FinanceRecord => record !== null))).subscribe({ next: update, error: fail });
        return;
      }
      if (section === "categories") {
        api.listCategories().pipe(map(mapCategoryRecords)).subscribe({ next: update, error: fail });
        return;
      }
      if (section === "investments") {
        api.listInvestments().pipe(map((items) => items.filter((item) => item.id !== undefined && item.categoria !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.categoria!, category: "Investimento", amount: item.valorCorrente ?? item.valorInicial, initialAmount: item.valorInicial, currentAmount: item.valorCorrente, interestRate: item.jurosAoMes, date: item.dataInicio ?? "", type: "income" as const })))).subscribe({ next: update, error: fail });
        return;
      }
      if (section === "goals") {
        api.listGoals().pipe(map((items) => items.filter((item) => item.id !== undefined && item.objetivo !== undefined && item.valorAlvo !== undefined && item.dataConclusaoPrevista !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.objetivo!, category: "Meta financeira", amount: item.valorAlvo!, targetAmount: item.valorAlvo, accumulatedAmount: item.valorAcumulado, dueDate: item.dataConclusaoPrevista, date: item.dataConclusaoPrevista!, type: "income" as const })))).subscribe({ next: update, error: fail });
        return;
      }
      const loadCards = (accounts: BankAccountResponse[]): void => {
        const accountIds = accounts.map((account) => account.id).filter((id): id is string => id !== undefined);
        const accountRecords = accounts.map(mapAccountRecord).filter((record): record is FinanceRecord => record !== null);
        if (accountRecords.length) {
          patchState(store, { sections: { ...store.sections(), accounts: { ...store.sections().accounts, records: accountRecords } } });
          loadedSections.add("accounts");
        }
        if (!accountIds.length) { update([]); return; }
        forkJoin(accountIds.map((accountId) => api.listCards(accountId).pipe(map((cards) => cards.map((card) => ({ ...card, contaBancariaId: card.contaBancariaId ?? accountId })))))).pipe(
          map((groups) => groups.reduce((cards, group) => cards.concat(group), [] as CardResponse[])),
          map(mapCardRecords),
        ).subscribe({ next: (records) => {
          loadingSections.delete(section);
          const cardRecords = records;
          const selectedRecords = section === "cardCredit" ? cardRecords.filter((record) => record.category === "CREDITO") : section === "cardDebit" ? cardRecords.filter((record) => record.category === "DEBITO") : section === "cardVoucher" ? cardRecords.filter((record) => record.category === "VOUCHER") : cardRecords;
          patchState(store, { sections: { ...store.sections(), cards: { ...store.sections().cards, records: cardRecords }, cardCredit: { ...store.sections().cardCredit, records: cardRecords.filter((record) => record.category === "CREDITO") }, cardDebit: { ...store.sections().cardDebit, records: cardRecords.filter((record) => record.category === "DEBITO") }, cardVoucher: { ...store.sections().cardVoucher, records: cardRecords.filter((record) => record.category === "VOUCHER") }, [section]: { ...store.sections()[section], records: selectedRecords }, }, loading: false, error: null });
          loadedSections.add("cards");
          loadedSections.add("cardCredit");
          loadedSections.add("cardDebit");
          loadedSections.add("cardVoucher");
        }, error: fail });
      };
      const accounts = store.sections().accounts.records;
      if (accounts.length) loadCards(accounts.map((account) => ({ id: account.apiId, nomeDoBanco: account.title, creditoTotal: account.creditTotal ?? 0, saldoCorrente: account.balance })));
      else api.listAccounts().subscribe({ next: loadCards, error: fail });
    };
    return {
    loadDashboard,
    loadFromApi(force = false): void { loadSection(store.active(), force); },
    loadSection,
    loadAccountMovements(accountId: string, period: PeriodRequest): void {
      if (!period.dataInicial || !period.dataFinal) {
        patchState(store, { loading: false, error: "Informe a data inicial e a data final para consultar as movimentações." });
        return;
      }
      patchState(store, { loading: true, error: null });
      api.listMovements(accountId, period).subscribe({
        next: (items) => {
          const movements: Movement[] = items.filter((item) => item.descricao !== undefined && item.categoriaId !== undefined && item.valorTotal !== undefined && item.dataLancamento !== undefined).map((item) => ({ title: item.descricao!, category: item.categoriaId!, amount: item.valorTotal!, date: item.dataLancamento!, type: item.valorTotal! >= 0 ? "income" : "expense" }));
          const statementRecords: FinanceRecord[] = items.filter((item) => item.valorTotal !== undefined && item.dataLancamento !== undefined).map((item, index) => ({ id: item.id ?? `${accountId}-${item.dataLancamento}-${index}`, apiId: item.id, title: item.descricao?.trim() || "Movimentação", category: item.categoriaId ?? "", amount: item.valorTotal!, date: item.dataLancamento!, type: item.valorTotal! >= 0 ? "income" as const : "expense" as const, method: item.metodoPagamento, recurring: item.ehRecorrente, nextRecurrence: item.proximaRecorrencia, installments: item.qntParcelas, notes: item.descricao }));
          const records = store.sections().accounts.records.map((record) => record.apiId === accountId ? { ...record, movements } : record);
          patchState(store, { sections: { ...store.sections(), accounts: { ...store.sections().accounts, records }, statements: { ...store.sections().statements, records: statementRecords } }, loading: false, error: null });
        },
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    loadMovementDetail(movementId: string): Observable<FinanceRecord | null> {
      patchState(store, { loading: true, error: null });
      return api.getMovement(movementId).pipe(
        map((item) => {
          if (item.id === undefined || item.valorTotal === undefined || item.dataLancamento === undefined) {
            patchState(store, { loading: false, error: "A API nao retornou os dados necessarios da movimentacao." });
            return null;
          }
          const record: FinanceRecord = { id: item.id, apiId: item.id, title: item.descricao?.trim() || "Movimentação", category: item.categoriaId ?? "", amount: item.valorTotal, date: item.dataLancamento, type: item.valorTotal >= 0 ? "income" : "expense", method: item.metodoPagamento, recurring: item.ehRecorrente, nextRecurrence: item.proximaRecorrencia, installments: item.qntParcelas, notes: item.descricao, accountId: item.contaBancariaId };
          patchState(store, { loading: false, error: null });
          return record;
        }),
        catchError((error: unknown) => { patchState(store, { loading: false, error: toUserError(error) }); return of(null); }),
      );
    },
    loadTransactions(accountId: string, period: PeriodRequest): void {
      patchState(store, { loading: true, error: null });
      api.listEntries(accountId, period).subscribe({
        next: (items) => {
          const records: FinanceRecord[] = items
            .filter((item) => item.valor !== undefined && item.dataLancamento !== undefined)
            .map((item, index) => ({
              id: `${accountId}-${item.dataLancamento}-${index}`,
              title: item.descricao?.trim() || "Lancamento",
              category: "Lancamento",
              amount: item.valor!,
              date: item.dataLancamento!,
              type: item.valor! >= 0 ? "income" as const : "expense" as const,
              notes: item.descricao,
              installments: item.totalParcelas,
            }));
          patchState(store, { sections: { ...store.sections(), transactions: { ...store.sections().transactions, records } }, loading: false, error: null });
        },
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    loadAccountEntries(accountId: string, period: PeriodRequest): void {
      patchState(store, { loading: true, error: null });
      api.listEntries(accountId, period).subscribe({
        next: (items) => {
          const movements: Movement[] = items.filter((item) => item.descricao !== undefined && item.valor !== undefined && item.dataLancamento !== undefined).map((item) => ({ title: item.descricao!, category: "Lançamento", amount: item.valor!, date: item.dataLancamento!, type: item.valor! >= 0 ? "income" : "expense" }));
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
    loadInvoices(accountId: string, cardId: string, period: PeriodRequest): void {
      patchState(store, { loading: true, error: null });
      api.listInvoices(accountId, cardId, period).subscribe({
        next: (items) => {
          const records = items.filter((item) => item.id !== undefined && item.valorTotal !== undefined && item.dataReferencia !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: `Fatura ${formatMonthYear(item.dataReferencia!)}`, category: item.status ?? "", amount: item.valorTotal!, date: item.dataReferencia!, type: "expense" as const, status: item.status }));
          patchState(store, { sections: { ...store.sections(), invoices: { ...store.sections().invoices, records } }, loading: false, error: null });
        },
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    loadInvoiceDetail(accountId: string, cardId: string, invoiceId: string): Observable<FinanceRecord | null> {
      patchState(store, { loading: true, error: null });
      return api.getInvoice(accountId, cardId, invoiceId).pipe(
        map((item) => {
          if (item.id === undefined || item.valorTotal === undefined || item.dataReferencia === undefined) {
            patchState(store, { loading: false, error: "A API nao retornou os dados necessarios da fatura." });
            return null;
          }
          const movements = (item.lancamentos ?? [])
            .map((entry) => {
              const amount = entry.valor;
              if (amount === undefined || entry.dataLancamento === undefined) return null;
              return {
                title: entry.descricao?.trim() || "Lançamento",
                category: "Lançamento",
                amount,
                date: entry.dataLancamento,
                type: amount >= 0 ? "income" as const : "expense" as const,
                installments: entry.totalParcelas,
              };
            })
            .filter((movement): movement is NonNullable<typeof movement> => movement !== null);
          const record: FinanceRecord = { id: item.id, apiId: item.id, title: `Fatura ${formatMonthYear(item.dataReferencia)}`, category: item.status ?? "", amount: item.valorTotal, date: item.dataReferencia, type: "expense", status: item.status, paidDate: item.dataPagamento, paidAmount: item.valorPago, accountId: item.cartaoDeCreditoId };
          record.movements = movements;
          patchState(store, { loading: false, error: null });
          return record;
        }),
        catchError((error: unknown) => { patchState(store, { loading: false, error: toUserError(error) }); return of(null); }),
      );
    },
    payInvoice(invoiceId: string): Observable<boolean> {
      patchState(store, { loading: true, error: null });
      return api.payInvoice(invoiceId).pipe(
        map((invoice) => {
          const update = (record: FinanceRecord): FinanceRecord => record.apiId === invoiceId ? { ...record, status: invoice.status } : record;
          patchState(store, {
            sections: { ...store.sections(), invoices: { ...store.sections().invoices, records: store.sections().invoices.records.map(update) } },
            loading: false,
            error: null,
          });
          return true;
        }),
        catchError((error: unknown) => { patchState(store, { loading: false, error: toUserError(error) }); return of(false); }),
      );
    },
    clearInvoices(): void {
      patchState(store, { sections: { ...store.sections(), invoices: { ...store.sections().invoices, records: [] } } });
    },
    navigate(active: SectionKey): void { patchState(store, { active, selectedId: null, query: "", accountTab: "overview", cardTab: "overview", categoryTab: "overview", editingId: null }); },
    setActiveAccountId(activeAccountId: string | null): void { patchState(store, { activeAccountId }); },
    resetSession(): void { loadedSections.clear(); loadingSections.clear(); dashboardLoading = false; dashboardMonthInFlight = undefined; pendingDashboardMonth = undefined; patchState(store, { ...initialState, sections: initialState.sections }); },
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
        map((created) => {
          const record = mapCategoryRecords([created])[0];
          if (!record) { patchState(store, { error: "A categoria foi salva, mas a API não retornou os dados necessários para atualizar a listagem." }); return false; }
          patchState(store, { sections: { ...store.sections(), categories: { ...store.sections().categories, records: [...store.sections().categories.records, record] } }, error: null });
          loadedSections.add("categories");
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
        map((created) => {
          const record = mapCardRecords([{ ...created, contaBancariaId: created.contaBancariaId ?? values.contaBancariaId }])[0];
          if (!record) { patchState(store, { error: "O cartão foi salvo, mas a API não retornou os dados necessários para atualizar a listagem." }); return false; }
          patchState(store, { sections: mapCardsInAccountSections([{ ...created, contaBancariaId: created.contaBancariaId ?? values.contaBancariaId }], store.sections()), error: null });
          loadedSections.add("cards");
          loadedSections.add("cardCredit");
          loadedSections.add("cardDebit");
          loadedSections.add("cardVoucher");
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
    createInvestment(values: InvestmentRequest): Observable<boolean> {
      return api.createInvestment(values).pipe(
        map((created) => {
          if (created.id === undefined || created.categoria === undefined) {
            patchState(store, { error: "O investimento foi salvo, mas a API não retornou os dados necessários para atualizar a listagem." });
            return false;
          }
          const record: FinanceRecord = { id: created.id, apiId: created.id, title: created.categoria, category: "Investimento", amount: created.valorCorrente ?? created.valorInicial, initialAmount: created.valorInicial, currentAmount: created.valorCorrente, interestRate: created.jurosAoMes, date: created.dataInicio ?? "", type: "income" };
          patchState(store, { sections: { ...store.sections(), investments: { ...store.sections().investments, records: [...store.sections().investments.records, record] } }, error: null });
          loadedSections.add("investments");
          return true;
        }),
        catchError((error: unknown) => { patchState(store, { error: toUserError(error) }); return of(false); }),
      );
    },
    createMovement(accountId: string, values: MovementRequest): Observable<boolean> {
      return api.createMovement(accountId, values).pipe(
        map((created) => {
          if (!created.id) {
            patchState(store, { error: "A movimentação foi salva, mas a API não retornou o identificador do registro." });
            return false;
          }
          patchState(store, { error: null });
          return true;
        }),
        catchError((error: unknown) => { patchState(store, { error: toUserError(error) }); return of(false); }),
      );
    },
    saveRecord(values: Omit<FinanceRecord, "id" | "type" | "status" | "method">): void {
      const active = store.active();
      const editingId = store.editingId();
      const refresh = (): void => (store as unknown as { loadFromApi: (force?: boolean) => void }).loadFromApi(true);
      if (active === "statements" && editingId) {
        api.updateMovement(editingId, { descricao: values.title.trim() }).subscribe({
          next: () => { patchState(store, { error: null, selectedId: null }); refresh(); },
          error: (error: unknown) => patchState(store, { error: toUserError(error) }),
        });
        return;
      }
      if (active === "goals" && values.amount !== undefined && values.date) {
        const request: GoalRequest = { objetivo: values.title, valorAlvo: values.amount, dataConclusaoPrevista: values.date };
        const operation = editingId ? api.updateGoal(editingId, request) : api.createGoal(request);
        operation.subscribe({ next: refresh, error: (error: unknown) => patchState(store, { error: toUserError(error) }) });
        return;
      }
      patchState(store, { error: "Esta operação não está disponível porque os campos exigidos pelo endpoint não foram fornecidos." });
    },
    deleteSelected(): void {
      const record = store.selectedRecord();
      if (!record) return;
      if (!record.apiId) {
        patchState(store, { error: "A API documentada só permite excluir movimentações pelo identificador do registro." });
        return;
      }
      const active = store.active();
      const operation = active === "statements" ? api.deleteMovement(record.apiId)
        : active === "accounts" ? api.deleteAccount(record.apiId)
        : active === "categories" ? api.deleteCategory(record.apiId)
        : active === "investments" ? api.deleteInvestment(record.apiId)
        : active === "goals" ? api.deleteGoal(record.apiId)
        : active === "cards" || active === "cardCredit" || active === "cardDebit" || active === "cardVoucher" ? api.deleteCard(record.apiId)
        : null;
      if (!operation) {
        patchState(store, { error: "A API não disponibiliza exclusão para este tipo de registro." });
        return;
      }
      patchState(store, { loading: true, error: null });
      operation.subscribe({
        next: () => patchState(store, {
          sections: removeRecordFromSections(store.sections(), record.apiId!, active),
          selectedId: null,
          loading: false,
          error: null,
        }),
        error: (error: unknown) => patchState(store, { loading: false, error: toUserError(error) }),
      });
    },
    };
  }),
);

function removeRecordFromSections(sections: FinanceState["sections"], recordId: string, active: SectionKey): FinanceState["sections"] {
  const without = (key: SectionKey) => ({ ...sections[key], records: sections[key].records.filter((record) => record.apiId !== recordId && record.id !== recordId) });
  if (active === "cards" || active === "cardCredit" || active === "cardDebit" || active === "cardVoucher") {
    return { ...sections, cards: without("cards"), cardCredit: without("cardCredit"), cardDebit: without("cardDebit"), cardVoucher: without("cardVoucher") };
  }
  return { ...sections, [active]: without(active) };
}

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

function formatMonthYear(value: string): string {
  const month = value.slice(0, 7);
  const date = new Date(`${month}-01T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function mapCardRecords(cards: CardResponse[]): FinanceRecord[] {
  return cards.filter((item) => item.id !== undefined && item.apelido !== undefined && item.tipoCartao !== undefined).map((item) => ({ id: item.id!, apiId: item.id!, title: item.apelido!, category: item.tipoCartao!, amount: item.limiteCredito ?? item.saldoCorrente ?? item.valorRecarga, creditLimit: item.limiteCredito, balance: item.saldoCorrente, rechargeAmount: item.valorRecarga, accountId: item.contaBancariaId, cardType: item.tipoCartao, closingDay: item.diaFechamento, dueDay: item.diaVencimento, rechargeDay: item.diaRecarga, date: "", type: "expense" as const }));
}

function mapCardsInSections(cards: CardResponse[], current: FinanceState["sections"]): FinanceState["sections"] {
  const cardRecords = mapCardRecords(cards);
  return { ...current, cards: { ...current.cards, records: cardRecords }, cardCredit: { ...current.cardCredit, records: cardRecords.filter((record) => record.category === "CREDITO") }, cardDebit: { ...current.cardDebit, records: cardRecords.filter((record) => record.category === "DEBITO") }, cardVoucher: { ...current.cardVoucher, records: cardRecords.filter((record) => record.category === "VOUCHER") } };
}

function mapCardsInAccountSections(cards: CardResponse[], current: FinanceState["sections"]): FinanceState["sections"] {
  const newRecords = mapCardRecords(cards);
  const newIds = new Set(newRecords.map((record) => record.id));
  const cardRecords = [...current.cards.records.filter((record) => !newIds.has(record.id)), ...newRecords];
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
