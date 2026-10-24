import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get("senha")?.value;
  const confirmation = control.get("confirmarSenha")?.value;
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
}

@Component({
  selector: "app-register",
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="register-page">
      <section class="register-card">
        <div class="register-content">
          <img class="register-brand-logo" src="assets/finlaunch_logo.png" alt="FinLaunch" />
          <div class="register-copy">
            <span class="register-kicker">COMECE AGORA</span>
            <h1>Crie sua<br />conta</h1>
            <p>Organize sua vida financeira em um só lugar.</p>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label>Nome completo<input type="text" formControlName="nome" autocomplete="name" placeholder="Seu nome" /></label>
            @if (form.controls.nome.touched && form.controls.nome.invalid) { <small class="register-field-error">Informe seu nome.</small> }
            <label>E-mail<input type="email" formControlName="email" autocomplete="email" placeholder="seu@email.com" /></label>
            @if (form.controls.email.touched && form.controls.email.invalid) { <small class="register-field-error">Informe um e-mail válido.</small> }
            <label>Senha<input type="password" formControlName="senha" autocomplete="new-password" placeholder="Mínimo de 12 caracteres" /></label>
            @if (form.controls.senha.touched && form.controls.senha.invalid) { <small class="register-field-error">A senha deve ter entre 12 e 72 caracteres.</small> }
            <label>Confirmar senha<input type="password" formControlName="confirmarSenha" autocomplete="new-password" placeholder="Repita sua senha" /></label>
            @if (form.controls.confirmarSenha.touched && (form.controls.confirmarSenha.invalid || form.hasError("passwordMismatch"))) { <small class="register-field-error">As senhas precisam ser iguais.</small> }
            @if (error(); as message) { <div class="register-error" role="alert">{{ message }}</div> }
            <button class="register-submit" type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? "CRIANDO CONTA..." : "CRIAR CONTA" }}
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
          <button type="button" class="register-back" (click)="goToLogin()">Já tenho uma conta · Entrar</button>
        </div>
        <div class="register-art" aria-hidden="true"><span class="material-symbols-outlined">account_balance</span><strong>Seu dinheiro,<br />seu ritmo.</strong><small>Finanças simples para decisões melhores.</small></div>
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100dvh; }
    .register-page { min-height:100dvh; background:#fff; }
    .register-card { display:grid; grid-template-columns:minmax(380px, 1fr) minmax(420px, 1fr); min-height:100dvh; overflow:hidden; background:#fff; }
    .register-content { display:flex; flex-direction:column; justify-content:center; padding:60px clamp(42px, 7vw, 116px); color:#17191e; }
    .register-brand-logo { display:block; width:min(190px, 58vw); height:auto; margin-bottom:54px; object-fit:contain; }
    .register-copy { margin-bottom:28px; }
    .register-kicker { color:#ed3114; font:800 11px Inter,sans-serif; letter-spacing:1.4px; }
    .register-copy h1 { margin:9px 0 12px; font:800 42px/1.08 Inter,sans-serif; letter-spacing:-2px; }
    .register-copy p { margin:0; color:#85868b; font-size:14px; }
    .register-content form { display:grid; gap:9px; max-width:365px; }
    .register-content label { display:grid; gap:7px; margin-top:7px; color:#55565d; font-size:11px; font-weight:800; }
    .register-content input { width:100%; box-sizing:border-box; padding:14px 16px; border:1px solid #d8d9dd; border-radius:7px; outline:0; background:#fff; color:#17191e; font:500 13px Inter,sans-serif; transition:border-color .18s,box-shadow .18s; }
    .register-content input:focus { border-color:#ed3114; box-shadow:0 0 0 3px #ed311422; }
    .register-content input::placeholder { color:#b3b4b9; }
    .register-field-error { color:#c93924; font-size:11px; }
    .register-error { padding:11px 13px; border-radius:6px; background:#fff0ed; color:#c93924; font-size:12px; line-height:1.4; }
    .register-submit { display:flex; align-items:center; justify-content:center; gap:12px; width:fit-content; min-width:160px; margin-top:10px; padding:14px 20px; border:0; border-radius:7px; background:#ed3114; color:#fff; font:800 12px Inter,sans-serif; cursor:pointer; transition:background .18s,transform .18s; }
    .register-submit:hover:not(:disabled) { background:#d92b12; transform:translateY(-1px); }
    .register-submit:disabled { opacity:.55; cursor:not-allowed; }
    .register-submit .material-symbols-outlined { font-size:17px; }
    .register-back { width:fit-content; margin-top:20px; padding:0; border:0; background:transparent; color:#ed3114; font:700 12px Inter,sans-serif; cursor:pointer; }
    .register-back:hover { text-decoration:underline; }
    .register-art { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; min-height:100dvh; background:radial-gradient(circle at 28% 24%, #ed311444 0 12%, transparent 33%), linear-gradient(145deg,#101113,#44221c); color:#fff; text-align:center; }
    .register-art .material-symbols-outlined { display:grid; place-items:center; width:112px; height:112px; border:1px solid #ff7b5d; border-radius:30px; background:#ed311433; color:#ff8b70; font-size:62px; }
    .register-art strong { font:800 34px/1.05 Inter,sans-serif; letter-spacing:-1px; }
    .register-art small { color:#e7b5a8; font-size:13px; }
    @media (max-width:800px) { .register-card { grid-template-columns:1fr; } .register-content { min-height:100dvh; padding:42px 28px; } .register-art { display:none; } .register-copy h1 { font-size:36px; } }
  `],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    nome: ["", [Validators.required, Validators.maxLength(255)]],
    email: ["", [Validators.required, Validators.email, Validators.maxLength(255)]],
    senha: ["", [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    confirmarSenha: ["", Validators.required],
  }, { validators: matchingPasswords });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { nome, email, senha } = this.form.getRawValue();
    this.auth.register({ nome: nome.trim(), email: email.trim(), senha }).subscribe({
      next: () => void this.router.navigate(["/login"], { queryParams: { cadastro: "sucesso" } }),
      error: (error: unknown) => { this.loading.set(false); this.error.set(this.auth.userMessage(error)); },
    });
  }
  goToLogin(): void { void this.router.navigate(["/login"]); }
}
