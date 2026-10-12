import { Injectable, computed, signal, inject, Injector } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { FinanceApiService } from "../api/finance-api.service";
import { LoginRequest, LoginResponse, UserDetailsResponse } from "../api/api.models";
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
  readonly isAuthenticated = computed(() => this.token() !== null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.login(credentials).pipe(tap((response) => {
      const accessToken = response.token.accessToken;
      localStorage.setItem(TOKEN_KEY, accessToken);
      this.token.set(accessToken);
      this.loadUser();
    }));
  }

  currentToken(): string | null { return this.token(); }
  me(): Observable<UserDetailsResponse> { return this.api.me(); }
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

  private readToken(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
}
