import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FinanceApiService } from "../../core/api/finance-api.service";
import { toUserError } from "../../core/http/http-error.util";

@Component({
  selector: "app-telegram-settings",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./telegram-settings.component.scss",
  template: `
    <section class="telegram-settings-page" aria-labelledby="telegram-title">
      <header class="telegram-page-heading">
        <h1 id="telegram-title">Telegram</h1>
      </header>

      <article class="telegram-settings-card">
        <div class="telegram-card-icon" aria-hidden="true">
          <span class="material-symbols-outlined">send</span>
        </div>
        <div class="telegram-card-content">
          <h2>Vincular sua conta</h2>

          @if (loading()) {
            <div class="telegram-code-loading" role="status">Carregando código…</div>
          } @else if (code()) {
            <div class="telegram-code-row">
              <code>{{ code() }}</code>
              <button type="button" class="secondary-btn" (click)="copyCode()">
                <span class="material-symbols-outlined">content_copy</span>
                COPIAR CÓDIGO
              </button>
            </div>
          } @else {
            <div class="telegram-code-empty">A API não retornou um código de vínculo.</div>
          }

          @if (error(); as message) {
            <div class="form-error" role="alert">{{ message }}</div>
          }
          @if (notice(); as message) {
            <div class="telegram-notice" role="status">{{ message }}</div>
          }

          <div class="telegram-card-actions">
            <button
              type="button"
              class="primary-btn"
              [disabled]="loading() || regenerating()"
              (click)="generateNewCode()"
            >
              <span class="material-symbols-outlined">autorenew</span>
              {{ regenerating() ? "GERANDO..." : "GERAR NOVO CÓDIGO" }}
            </button>
          </div>
        </div>
      </article>
    </section>
  `,
})
export class TelegramSettingsComponent implements OnInit {
  private readonly api = inject(FinanceApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly code = signal<string | null>(null);
  readonly loading = signal(true);
  readonly regenerating = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCode();
  }

  loadCode(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getTelegramLinkCode()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.code.set(response.codigo ?? null);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(toUserError(error));
        },
      });
  }

  copyCode(): void {
    const code = this.code();
    if (!code) return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      this.error.set("A cópia automática não está disponível. Selecione e copie o código manualmente.");
      return;
    }
    navigator.clipboard.writeText(code).then(
      () => {
        this.error.set(null);
        this.notice.set("Código copiado.");
      },
      () => this.error.set("Não foi possível copiar o código. Selecione e copie o texto manualmente."),
    );
  }

  generateNewCode(): void {
    if (this.regenerating() || this.loading()) return;
    if (
      !window.confirm(
        "Deseja gerar um novo código de vínculo?",
      )
    ) {
      return;
    }
    this.regenerating.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api
      .generateTelegramLinkCode()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.code.set(response.codigo ?? null);
          this.regenerating.set(false);
          if (response.codigo) this.notice.set("Novo código de vínculo gerado.");
          else this.error.set("A API não retornou o novo código de vínculo.");
        },
        error: (error: unknown) => {
          this.regenerating.set(false);
          this.error.set(toUserError(error));
        },
      });
  }
}
