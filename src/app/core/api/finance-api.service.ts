import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  BankAccountRequest, BankAccountResponse, BankAccountUpdateRequest, BudgetRequest, BudgetResponse, CardRequest, CardResponse,
  CategoryRequest, CategoryResponse, EntryResponse, GoalRequest, GoalResponse, InvestmentRequest,
  DashboardResponse, InvestmentResponse, InvoiceResponse, LoginRequest, LoginResponse, MovementRequest, MovementResponse, MovementUpdateRequest, RecurrenceRequest, RegisterRequest,
  PeriodRequest, UserDetailsResponse,
} from "./api.models";

// Em desenvolvimento, o Angular CLI encaminha /api para localhost:8080.
// Em produção, a API deve ser publicada sob o mesmo domínio ou substituída por configuração de ambiente.
export const API_BASE_URL = "/api";

@Injectable({ providedIn: "root" })
export class FinanceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  login(body: LoginRequest): Observable<LoginResponse> { return this.http.post<LoginResponse>(`${this.baseUrl}/auth/acessar`, body); }
  register(body: RegisterRequest): Observable<UserDetailsResponse> { return this.http.post<UserDetailsResponse>(`${this.baseUrl}/auth/cadastrar`, body); }
  me(): Observable<UserDetailsResponse> { return this.http.get<UserDetailsResponse>(`${this.baseUrl}/auth/me`); }
  deleteCurrentUser(): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/auth/me`); }
  dashboard(mesReferencia?: string): Observable<DashboardResponse> {
    const params = mesReferencia ? new HttpParams().set("mesReferencia", mesReferencia) : undefined;
    return this.http.get<DashboardResponse>(`${this.baseUrl}/dashboard`, params ? { params } : undefined);
  }

  listGoals(): Observable<GoalResponse[]> { return this.http.get<GoalResponse[]>(`${this.baseUrl}/metas-financeiras`); }
  createGoal(body: GoalRequest): Observable<GoalResponse> { return this.http.post<GoalResponse>(`${this.baseUrl}/metas-financeiras`, body); }
  getGoal(goalId: string): Observable<GoalResponse> { return this.http.get<GoalResponse>(`${this.baseUrl}/metas-financeiras/${encodeURIComponent(goalId)}`); }
  updateGoal(goalId: string, body: GoalRequest): Observable<GoalResponse> { return this.http.put<GoalResponse>(`${this.baseUrl}/metas-financeiras/${encodeURIComponent(goalId)}`, body); }
  deleteGoal(goalId: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/metas-financeiras/${encodeURIComponent(goalId)}`); }
  listInvestments(): Observable<InvestmentResponse[]> { return this.http.get<InvestmentResponse[]>(`${this.baseUrl}/investimentos`); }
  createInvestment(body: InvestmentRequest): Observable<InvestmentResponse> { return this.http.post<InvestmentResponse>(`${this.baseUrl}/investimentos`, body); }
  getInvestment(investmentId: string): Observable<InvestmentResponse> { return this.http.get<InvestmentResponse>(`${this.baseUrl}/investimentos/${encodeURIComponent(investmentId)}`); }
  updateInvestment(investmentId: string, body: InvestmentRequest): Observable<InvestmentResponse> { return this.http.put<InvestmentResponse>(`${this.baseUrl}/investimentos/${encodeURIComponent(investmentId)}`, body); }
  deleteInvestment(investmentId: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/investimentos/${encodeURIComponent(investmentId)}`); }

  listAccounts(): Observable<BankAccountResponse[]> { return this.http.get<BankAccountResponse[]>(`${this.baseUrl}/contas-bancarias`); }
  createAccount(body: BankAccountRequest): Observable<BankAccountResponse> { return this.http.post<BankAccountResponse>(`${this.baseUrl}/contas-bancarias`, body); }
  getAccount(accountId: string): Observable<BankAccountResponse> { return this.http.get<BankAccountResponse>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}`); }
  updateAccount(accountId: string, body: BankAccountUpdateRequest): Observable<BankAccountResponse> { return this.http.put<BankAccountResponse>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}`, body); }
  deleteAccount(accountId: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}`); }
  listMovements(accountId: string, period: PeriodRequest): Observable<MovementResponse[]> {
    const params = new HttpParams()
      .set("dataInicial", period.dataInicial)
      .set("dataFinal", period.dataFinal);
    return this.http.get<MovementResponse[]>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}/registros-de-movimentacao`, { params });
  }
  getMovement(movementId: string): Observable<MovementResponse> { return this.http.get<MovementResponse>(`${this.baseUrl}/contas-bancarias/registros-de-movimentacao/${encodeURIComponent(movementId)}`); }
  createMovement(accountId: string, body: MovementRequest): Observable<MovementResponse> { return this.http.post<MovementResponse>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}/registros-de-movimentacao`, body); }
  updateMovement(movementId: string, body: MovementUpdateRequest): Observable<MovementResponse> { return this.http.patch<MovementResponse>(`${this.baseUrl}/contas-bancarias/registros-de-movimentacao/${encodeURIComponent(movementId)}`, body); }
  updateMovementRecurrence(movementId: string, body: RecurrenceRequest): Observable<MovementResponse> { return this.http.patch<MovementResponse>(`${this.baseUrl}/contas-bancarias/registros-de-movimentacao/${encodeURIComponent(movementId)}/recorrencia`, body); }
  listEntries(accountId: string, period: PeriodRequest): Observable<EntryResponse[]> { return this.periodGet<EntryResponse[]>(`/contas-bancarias/${encodeURIComponent(accountId)}/lancamentos`, period); }

  listCategories(): Observable<CategoryResponse[]> { return this.http.get<CategoryResponse[]>(`${this.baseUrl}/categorias-movimentacao`); }
  createCategory(body: CategoryRequest): Observable<CategoryResponse> { return this.http.post<CategoryResponse>(`${this.baseUrl}/categorias-movimentacao`, body); }
  getCategory(categoryId: string): Observable<CategoryResponse> { return this.http.get<CategoryResponse>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}`); }
  updateCategory(categoryId: string, body: CategoryRequest): Observable<CategoryResponse> { return this.http.put<CategoryResponse>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}`, body); }
  deleteCategory(categoryId: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}`); }
  listBudgets(categoryId: string): Observable<BudgetResponse[]> { return this.http.get<BudgetResponse[]>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}/orcamentos`); }
  createBudget(categoryId: string, body: BudgetRequest): Observable<BudgetResponse> {
    return this.http.post<BudgetResponse>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}/orcamentos`, body);
  }
  getBudget(categoryId: string, budgetId: string): Observable<BudgetResponse> { return this.http.get<BudgetResponse>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}/orcamentos/${encodeURIComponent(budgetId)}`); }
  updateBudget(categoryId: string, budgetId: string, body: BudgetRequest): Observable<BudgetResponse> { return this.http.put<BudgetResponse>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}/orcamentos/${encodeURIComponent(budgetId)}`, body); }
  deleteBudget(categoryId: string, budgetId: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}/orcamentos/${encodeURIComponent(budgetId)}`); }

  listCards(accountId: string): Observable<CardResponse[]> { return this.http.get<CardResponse[]>(`${this.baseUrl}/cartoes/${encodeURIComponent(accountId)}`); }
  createCard(body: CardRequest): Observable<CardResponse> { return this.http.post<CardResponse>(`${this.baseUrl}/cartoes`, body); }
  getCard(accountId: string, cardId: string): Observable<CardResponse> { return this.http.get<CardResponse>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}/cartoes/${encodeURIComponent(cardId)}`); }
  updateCard(cardId: string, body: CardRequest): Observable<CardResponse> { return this.http.put<CardResponse>(`${this.baseUrl}/cartoes/${encodeURIComponent(cardId)}`, body); }
  deleteCard(cardId: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/cartoes/${encodeURIComponent(cardId)}`); }
  listInvoices(accountId: string, cardId: string, period: PeriodRequest): Observable<InvoiceResponse[]> { return this.periodGet<InvoiceResponse[]>(`/contas-bancarias/${encodeURIComponent(accountId)}/cartoes/${encodeURIComponent(cardId)}/faturas`, period); }
  getInvoice(accountId: string, cardId: string, invoiceId: string): Observable<InvoiceResponse> { return this.http.get<InvoiceResponse>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}/cartoes/${encodeURIComponent(cardId)}/faturas/${encodeURIComponent(invoiceId)}`); }
  payInvoice(invoiceId: string): Observable<InvoiceResponse> { return this.http.post<InvoiceResponse>(`${this.baseUrl}/cartoes/faturas/${encodeURIComponent(invoiceId)}/pagamento`, null); }
  deleteMovement(movementId: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/contas-bancarias/registros-de-movimentacao/${encodeURIComponent(movementId)}`); }

  private periodGet<T>(path: string, period: PeriodRequest): Observable<T> {
    const params = new HttpParams().set("dataInicial", period.dataInicial).set("dataFinal", period.dataFinal);
    return this.http.get<T>(`${this.baseUrl}${path}`, { params });
  }
}
