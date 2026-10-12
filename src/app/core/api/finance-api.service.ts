import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  BankAccountRequest, BankAccountResponse, BudgetRequest, BudgetResponse, CardRequest, CardResponse,
  CategoryRequest, CategoryResponse, EntryResponse, GoalRequest, GoalResponse, InvestmentRequest,
  InvestmentResponse, InvoiceResponse, LoginRequest, LoginResponse, MovementRequest, MovementResponse,
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
  me(): Observable<UserDetailsResponse> { return this.http.get<UserDetailsResponse>(`${this.baseUrl}/auth/me`); }

  listGoals(): Observable<GoalResponse[]> { return this.http.get<GoalResponse[]>(`${this.baseUrl}/metas-financeiras`); }
  createGoal(body: GoalRequest): Observable<GoalResponse> { return this.http.post<GoalResponse>(`${this.baseUrl}/metas-financeiras`, body); }
  listInvestments(): Observable<InvestmentResponse[]> { return this.http.get<InvestmentResponse[]>(`${this.baseUrl}/investimentos`); }
  createInvestment(body: InvestmentRequest): Observable<InvestmentResponse> { return this.http.post<InvestmentResponse>(`${this.baseUrl}/investimentos`, body); }

  listAccounts(): Observable<BankAccountResponse[]> { return this.http.get<BankAccountResponse[]>(`${this.baseUrl}/contas-bancarias`); }
  createAccount(body: BankAccountRequest): Observable<BankAccountResponse> { return this.http.post<BankAccountResponse>(`${this.baseUrl}/contas-bancarias`, body); }
  listMovements(accountId: string, period: PeriodRequest): Observable<MovementResponse[]> { return this.periodGet<MovementResponse[]>(`/contas-bancarias/${encodeURIComponent(accountId)}/registros-de-movimentacao`, period); }
  createMovement(accountId: string, body: MovementRequest): Observable<MovementResponse> { return this.http.post<MovementResponse>(`${this.baseUrl}/contas-bancarias/${encodeURIComponent(accountId)}/registros-de-movimentacao`, body); }
  listEntries(accountId: string, period: PeriodRequest): Observable<EntryResponse[]> { return this.periodGet<EntryResponse[]>(`/contas-bancarias/${encodeURIComponent(accountId)}/lancamentos`, period); }

  listCategories(): Observable<CategoryResponse[]> { return this.http.get<CategoryResponse[]>(`${this.baseUrl}/categorias-movimentacao`); }
  createCategory(body: CategoryRequest): Observable<CategoryResponse> { return this.http.post<CategoryResponse>(`${this.baseUrl}/categorias-movimentacao`, body); }
  getCategory(categoryId: string): Observable<CategoryResponse> { return this.http.get<CategoryResponse>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}`); }
  listBudgets(categoryId: string): Observable<BudgetResponse[]> { return this.http.get<BudgetResponse[]>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}/orcamentos`); }
  createBudget(categoryId: string, body: BudgetRequest): Observable<BudgetResponse> { return this.http.post<BudgetResponse>(`${this.baseUrl}/categorias-movimentacao/${encodeURIComponent(categoryId)}/orcamentos`, body); }

  listCards(): Observable<CardResponse[]> { return this.http.get<CardResponse[]>(`${this.baseUrl}/cartoes`); }
  createCard(body: CardRequest): Observable<CardResponse> { return this.http.post<CardResponse>(`${this.baseUrl}/cartoes`, body); }
  listInvoices(cardId: string, period: PeriodRequest): Observable<InvoiceResponse[]> { return this.periodGet<InvoiceResponse[]>(`/cartoes/${encodeURIComponent(cardId)}/faturas`, period); }

  private periodGet<T>(path: string, body: PeriodRequest): Observable<T> {
    return this.http.request<T>("GET", `${this.baseUrl}${path}`, { body });
  }
}
