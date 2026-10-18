import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-unauthorized",
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="unauthorized-page">
      <section class="unauthorized-content" aria-labelledby="unauthorized-title">
        <img src="assets/finlaunch_logo.png" alt="FinLaunch" class="brand-logo" />
        <div class="accent-line" aria-hidden="true"></div>
        <div class="status-code">401</div>
        <h1 id="unauthorized-title">Sessão inválida ou expirada</h1>
        <p>Seu acesso não está mais autorizado. Entre novamente para continuar usando o FinLaunch.</p>
        <a routerLink="/login" class="login-link">
          Acessar o sistema
          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </a>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .unauthorized-page { display: grid; place-items: center; min-height: 100dvh; padding: 32px 24px; border-top: 3px solid #ed3114; background: #191a1e; color: #f6f6f8; }
    .unauthorized-content { display: flex; flex-direction: column; align-items: center; width: min(100%, 560px); text-align: center; }
    .brand-logo { width: 190px; max-height: 58px; margin-bottom: 38px; object-fit: contain; }
    .accent-line { width: 42px; height: 3px; margin-bottom: 28px; background: #ed3114; }
    .status-code { color: #7e818b; font: 800 10px Inter, sans-serif; letter-spacing: 2px; }
    h1 { margin: 12px 0 15px; color: #f6f6f8; font-size: clamp(30px, 4vw, 44px); line-height: 1.08; letter-spacing: -1.8px; }
    p { max-width: 390px; margin: 0 0 32px; color: #9295a0; font-size: 14px; line-height: 1.65; }
    .login-link { display: inline-flex; align-items: center; justify-content: center; padding: 14px 24px; border-radius: 6px; background: #ed3114; color: #fff; box-shadow: 0 8px 20px rgb(237 49 20 / 18%); font: 800 11px Inter, sans-serif; letter-spacing: .3px; text-decoration: none; }
    .login-link:hover { background: #f04427; }
    .login-link .material-symbols-outlined { font-size: 18px; }
    @media (max-width: 700px) { .unauthorized-page { padding: 24px 18px; } .brand-logo { width: 160px; margin-bottom: 32px; } h1 { font-size: 31px; } }
  `],
})
export class UnauthorizedComponent {}
