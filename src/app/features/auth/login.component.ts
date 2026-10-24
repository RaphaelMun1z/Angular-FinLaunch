import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { NotificationService } from "../../core/notifications/notification.service";

@Component({
	selector: "app-login",
	standalone: true,
	imports: [ReactiveFormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<main class="login-page">
		<section class="login-card">
			<div class="login-content">
				<img
					class="login-brand-logo"
					src="assets/finlaunch_logo.png"
					alt="FinLaunch"
				/>
				<div class="login-copy">
					<h1>Olá,<br />bem-vindo de volta</h1>
					<p></p>
				</div>
				<form [formGroup]="form" (ngSubmit)="submit()">
					<label
						>E-mail<input
							type="email"
							formControlName="email"
							autocomplete="email"
							placeholder="seu@email.com" /></label
					><label
						>Senha<input
							type="password"
							formControlName="senha"
							autocomplete="current-password"
							placeholder="Digite sua senha"
					/></label>
					@if (error(); as message) {
						<div class="login-error" role="alert">
							{{ message }}
						</div>
					}
					<button
						class="login-submit"
						type="submit"
						[disabled]="form.invalid || loading()"
					>
						{{ loading() ? "ENTRANDO..." : "ENTRAR"
						}}<span class="material-symbols-outlined"
							>arrow_forward</span
						>
					</button>
				</form>
				<button type="button" class="login-register-link" (click)="goToRegister()">Ainda não tenho uma conta · Criar cadastro</button>
			</div>
			<div class="login-art" aria-hidden="true">
				<svg
					class="finance-art"
					viewBox="0 0 760 900"
					preserveAspectRatio="xMidYMid slice"
					role="presentation"
				>
					<defs>
						<linearGradient id="art-bg" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" stop-color="#101113" />
							<stop offset=".52" stop-color="#17181c" />
							<stop offset="1" stop-color="#44221c" />
						</linearGradient>
						<linearGradient
							id="phone-bg"
							x1="0"
							y1="0"
							x2="1"
							y2="1"
						>
							<stop offset="0" stop-color="#ff754c" />
							<stop offset="1" stop-color="#ed3114" />
						</linearGradient>
						<filter
							id="shadow"
							x="-30%"
							y="-30%"
							width="160%"
							height="160%"
						>
							<feDropShadow
								dx="0"
								dy="18"
								stdDeviation="16"
								flood-color="#000000"
								flood-opacity=".35"
							/>
						</filter>
					</defs>
					<rect width="760" height="900" fill="url(#art-bg)" />
					<circle
						cx="42"
						cy="90"
						r="215"
						fill="#ed3114"
						opacity=".12"
					/>
					<circle
						cx="710"
						cy="806"
						r="260"
						fill="#ff754c"
						opacity=".13"
					/>
					<path
						d="M-60 620 C170 510 250 720 430 610 S700 480 820 560 V900 H-60Z"
						fill="#101113"
						opacity=".72"
					/>
					<path
						d="M-40 690 C180 580 300 780 475 670 S710 545 820 630"
						fill="none"
						stroke="#ed3114"
						stroke-width="3"
						opacity=".62"
					/>
					<g fill="#d9fff3" opacity=".7">
						<circle cx="97" cy="207" r="4" />
						<circle cx="659" cy="126" r="3" />
						<circle cx="624" cy="720" r="4" />
					</g>
					<g>
						<rect
							x="72"
							y="160"
							width="186"
							height="118"
							rx="16"
							fill="#f8fffd"
							filter="url(#shadow)"
						/>
						<text
							x="94"
							y="195"
							fill="#405e62"
							font-size="12"
							font-family="Arial, sans-serif"
							font-weight="800"
							letter-spacing="1"
						></text>
						<text
							x="94"
							y="235"
							fill="#112d39"
							font-size="27"
							font-family="Arial, sans-serif"
							font-weight="800"
						></text>
						<text
							x="94"
							y="258"
							fill="#20a981"
							font-size="11"
							font-family="Arial, sans-serif"
							font-weight="700"
						></text>
					</g>
					<g transform="translate(476 126)">
						<rect
							width="184"
							height="122"
							rx="16"
							fill="#173454"
							stroke="#43c8aa"
							stroke-width="2"
						/>
						<text
							x="20"
							y="34"
							fill="#effff9"
							font-size="11"
							font-family="Arial, sans-serif"
							font-weight="800"
							letter-spacing="1"
						></text>
						<path
							d="M20 91 L54 71 L82 80 L113 48 L145 57"
							fill="none"
							stroke="#51d8b6"
							stroke-width="4"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M20 92 H158"
							stroke="#5d7788"
							stroke-opacity=".55"
						/>
					</g>
					<g
						transform="translate(253 246) rotate(7)"
						filter="url(#shadow)"
					>
						<rect
							x="0"
							y="0"
							width="258"
							height="464"
							rx="37"
							fill="#071525"
						/>
						<rect
							x="11"
							y="11"
							width="236"
							height="442"
							rx="29"
							fill="url(#phone-bg)"
						/>
						<rect
							x="89"
							y="22"
							width="80"
							height="16"
							rx="8"
							fill="#071525"
						/>
						<circle cx="180" cy="30" r="4" fill="#8be8d1" />
						<text
							x="31"
							y="80"
							fill="#effffb"
							font-size="12"
							font-family="Arial, sans-serif"
							font-weight="700"
						>
							MINHA CARTEIRA
						</text>
						<text
							x="31"
							y="120"
							fill="#fff"
							font-size="29"
							font-family="Arial, sans-serif"
							font-weight="800"
						></text>
						<text
							x="31"
							y="147"
							fill="#e4fff7"
							font-size="11"
							font-family="Arial, sans-serif"
						>
							disponível para investir
						</text>
						<rect
							x="28"
							y="179"
							width="180"
							height="108"
							rx="16"
							fill="#fbfffe"
						/>
						<text
							x="45"
							y="205"
							fill="#496b6c"
							font-size="10"
							font-family="Arial, sans-serif"
							font-weight="700"
						>
							DESPESAS DA SEMANA
						</text>
						<path
							d="M45 261 L73 246 L96 253 L124 222 L149 234 L182 210"
							fill="none"
							stroke="#1d987d"
							stroke-width="4"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<circle cx="182" cy="210" r="6" fill="#f4a340" />
						<path d="M45 267 H188" stroke="#d7e5e1" />
						<rect
							x="28"
							y="313"
							width="180"
							height="58"
							rx="13"
							fill="#075a68"
						/>
						<circle cx="55" cy="342" r="17" fill="#f4a340" />
						<path
							d="M48 342h14M55 335v14"
							stroke="#fff"
							stroke-width="2.5"
						/>
						<text
							x="82"
							y="337"
							fill="#fff"
							font-size="11"
							font-family="Arial, sans-serif"
							font-weight="700"
						>
							Nova entrada
						</text>
						<text
							x="82"
							y="353"
							fill="#d1fff2"
							font-size="10"
							font-family="Arial, sans-serif"
						>
							Receita recebida
						</text>
						<rect
							x="89"
							y="422"
							width="80"
							height="5"
							rx="3"
							fill="#b5eee1"
						/>
					</g>
					<g transform="translate(563 430)" filter="url(#shadow)">
						<circle cx="60" cy="60" r="60" fill="#f8fffd" />
						<path
							d="M60 28v65M42 43c0-10 8-16 18-16s18 6 18 16c0 24-36 14-36 38 0 10 8 16 18 16s18-6 18-16"
							fill="none"
							stroke="#1b9f82"
							stroke-width="8"
							stroke-linecap="round"
						/>
						<path
							d="M35 94h50"
							stroke="#f4a340"
							stroke-width="7"
							stroke-linecap="round"
						/>
					</g>
					<g transform="translate(98 604)">
						<rect width="128" height="52" rx="26" fill="#f4a340" />
						<text
							x="64"
							y="32"
							text-anchor="middle"
							fill="#fff"
							font-size="13"
							font-family="Arial, sans-serif"
							font-weight="800"
						>
							+ investir
						</text>
					</g>
					<text
						x="70"
						y="805"
						fill="#d9fff3"
						font-size="14"
						font-family="Arial, sans-serif"
						font-weight="700"
						letter-spacing="2"
					>
						SEU DINHEIRO, SEU RITMO
					</text>
					<path d="M70 824 H285" stroke="#4bd5b3" stroke-width="2" />
				</svg>
			</div>
		</section>
	</main>`,
	styles: [
		`
			:host {
				display: block;
				min-height: 100dvh;
			}
			.login-page {
				width: 100%;
				min-height: 100dvh;
				display: block;
				background: #fff;
			}
			.login-card {
				display: grid;
				grid-template-columns: minmax(380px, 1fr) minmax(420px, 1fr);
				width: 100%;
				min-height: 100dvh;
				overflow: hidden;
				background: #fff;
			}
			.login-content {
				display: flex;
				flex-direction: column;
				justify-content: center;
				padding: 70px clamp(42px, 7vw, 116px);
				color: #17191e;
			}
			.login-brand {
				display: none;
			}
			.login-brand-logo {
				display: block;
				width: min(190px, 58vw);
				height: auto;
				margin-bottom: 70px;
				object-fit: contain;
			}
			.login-brand > span:last-child span {
				color: #ed3114;
			}
			.login-brand-mark {
				display: grid;
				place-items: center;
				width: 24px;
				height: 24px;
				border-radius: 6px;
				background: #ed3114;
				color: #fff;
				font-size: 18px;
			}
			.login-copy h1 {
				margin: 0;
				font-size: 42px;
				line-height: 1.12;
				letter-spacing: -2px;
			}
			.login-copy p {
				max-width: 360px;
				margin: 17px 0 36px;
				color: #85868b;
				font-size: 14px;
				line-height: 1.55;
			}
			.login-content form {
				display: grid;
				gap: 16px;
				max-width: 365px;
			}
			.login-content label {
				display: grid;
				gap: 7px;
				color: #55565d;
				font-size: 11px;
				font-weight: 800;
			}
			.login-content input {
				width: 100%;
				padding: 15px 16px;
				border: 1px solid #d8d9dd;
				border-radius: 7px;
				outline: 0;
				background: #fff;
				color: #17191e;
				font:
					500 13px Inter,
					sans-serif;
				transition:
					border-color 0.18s,
					box-shadow 0.18s;
			}
			.login-content input:focus {
				border-color: #ed3114;
				box-shadow: 0 0 0 3px #ed311422;
			}
			.login-content input::placeholder {
				color: #b3b4b9;
			}
			.login-error {
				padding: 11px 13px;
				border-radius: 6px;
				background: #fff0ed;
				color: #c93924;
				font-size: 12px;
				line-height: 1.4;
			}
			.login-submit {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 12px;
				width: fit-content;
				min-width: 140px;
				margin-top: 7px;
				padding: 14px 20px;
				border: 0;
				border-radius: 7px;
				background: #ed3114;
				color: #fff;
				font:
					800 12px Inter,
					sans-serif;
				cursor: pointer;
				transition:
					background 0.18s,
					transform 0.18s;
			}
			.login-submit:hover:not(:disabled) {
				background: #d92b12;
				transform: translateY(-1px);
			}
			.login-submit:disabled {
				opacity: 0.55;
				cursor: not-allowed;
			}
			.login-submit .material-symbols-outlined {
				font-size: 17px;
			}
			.login-register-link {
				width: fit-content;
				margin-top: 18px;
				padding: 0;
				border: 0;
				background: transparent;
				color: #ed3114;
				font: 700 12px Inter, sans-serif;
				cursor: pointer;
			}
			.login-register-link:hover { text-decoration: underline; }
			.login-art {
				position: relative;
				min-height: 100dvh;
				overflow: hidden;
				background: #101b35;
			}
			.finance-art {
				display: block;
				width: 100%;
				height: 100%;
				min-height: 100dvh;
			}
			.finance-art text {
				font-family: Inter, Arial, sans-serif;
			}
			.finance-art > g:nth-of-type(1),
			.finance-art > g:nth-of-type(2),
			.finance-art > g:nth-of-type(3),
			.finance-art > g:nth-of-type(4),
			.finance-art > g:nth-of-type(5),
			.finance-art > g:nth-of-type(6),
			.finance-art > text,
			.finance-art > path:last-child {
				display: none;
			}
			@media (max-width: 800px) {
				.login-card {
					grid-template-columns: 1fr;
					min-height: 100dvh;
				}
				.login-content {
					min-height: 100dvh;
					padding: 42px 28px;
				}
				.login-brand {
					margin-bottom: 52px;
				}
				.login-brand-logo {
					width: min(180px, 70vw);
					margin-bottom: 52px;
				}
				.login-copy h1 {
					font-size: 36px;
				}
				.login-art {
					display: none;
				}
			}
			@media (min-width: 801px) and (max-width: 980px) {
				.login-card {
					grid-template-columns: minmax(340px, 1fr) minmax(320px, 1fr);
				}
				.login-content {
					padding: 54px;
				}
				.login-copy h1 {
					font-size: 36px;
				}
			}
		`,
	],
})
export class LoginComponent {
	private readonly fb = inject(FormBuilder);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly notifications = inject(NotificationService);
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);
	readonly form = this.fb.nonNullable.group({
		email: ["", [Validators.required, Validators.email]],
		senha: ["", Validators.required],
	});

	submit(): void {
		if (this.form.invalid) return;
		this.loading.set(true);
		this.error.set(null);
		this.auth.login(this.form.getRawValue()).subscribe({
			next: () => {
				this.notifications.success("Login realizado com sucesso.");
				void this.router.navigate(["/visao-geral"]);
			},
			error: (error: unknown) => {
				this.loading.set(false);
				this.error.set(this.auth.userMessage(error));
			},
		});
	}
	goToRegister(): void { void this.router.navigate(["/cadastro"]); }
}
