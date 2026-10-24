import { Injectable, computed, signal, inject, Injector } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { FinanceApiService } from "../api/finance-api.service";
import { LoginRequest, LoginResponse, RegisterRequest, UserDetailsResponse } from "../api/api.models";
import { toUserError } from "../http/http-error.util";
import { FinanceStore } from "../store/finance.store";

const TOKEN_KEY = "financeiro.access-token";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly api = inject(FinanceApiService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly token = signal<string | null>(this.readToken());
  readonly user = signal<UserDetailsResponse | null>(null);
  readonly isAuthenticated = computed(() => this.hasValidToken());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.login(credentials).pipe(tap((response) => {
      const accessToken = response.token.accessToken;
      localStorage.setItem(TOKEN_KEY, accessToken);
      this.token.set(accessToken);
      this.loadUser();
    }));
  }
  register(values: RegisterRequest): Observable<UserDetailsResponse> { return this.api.register(values); }

  currentToken(): string | null { return this.hasValidToken() ? this.token() : null; }
  hasToken(): boolean { return this.token() !== null; }
  hasValidToken(): boolean { return this.isTokenValid(this.token()); }
  me(): Observable<UserDetailsResponse> { return this.api.me(); }
  deleteAccount(): Observable<void> { return this.api.deleteCurrentUser(); }
  loadUser(): void { this.api.me().subscribe({ next: (user) => this.user.set(user), error: () => this.user.set(null) }); }

  userMessage(error: unknown): string { return toUserError(error); }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
    this.injector.get(FinanceStore).resetSession();
    void this.router.navigate(["/login"]);
  }

  unauthorized(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
    this.injector.get(FinanceStore).resetSession();
    void this.router.navigate(["/unauthorized"]);
  }

  private readToken(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  private isTokenValid(value: string | null): boolean {
    if (!value) return false;
    const parts = value.split(".");
    if (parts.length !== 3) return false;
    try {
      const payload = JSON.parse(this.decodeBase64Url(parts[1])) as { exp?: unknown };
      return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  }

  private decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return atob(normalized);
  }
}
