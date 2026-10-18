import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	HostListener,
	inject,
	signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CalendarViewComponent } from "../../shared/components/calendar-view.component";
import { MonthlyLineChartComponent } from "../../shared/components/monthly-line-chart.component";
import { FinanceRecordDetailComponent } from "./finance-record-detail.component";
import { FinanceStore } from "../../core/store/finance.store";
import { AuthService } from "../../core/auth/auth.service";
import { BudgetRequest, CardRequest, CategoryType, MovementMethod, MovementRequest } from "../../core/api/api.models";
import { navigation } from "../../core/models/finance.data";
import {
	CategoryTab,
	FinanceRecord,
	NavItem,
	OverviewSelection,
	SectionKey,
} from "../../core/models/finance.models";
import { FinanceHeaderComponent } from "../../layout/header/finance-header.component";
import { FinanceSidebarComponent } from "../../layout/sidebar/finance-sidebar.component";

@Component({
	selector: "app-finance-shell",
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		CalendarViewComponent,
		MonthlyLineChartComponent,
		FinanceRecordDetailComponent,
		FinanceHeaderComponent,
		FinanceSidebarComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: "./finance-shell.component.scss",
	template: `
		<div class="app-shell">
			<app-finance-header
				[user]="authUser()"
				[period]="headerPeriod()"
				[initials]="userInitials()"
				[userMenuOpen]="userMenuOpen()"
				[accounts]="movementAccounts()"
				[activeAccountId]="activeAccountId() || ''"
				(create)="openMovementAside()"
				(accountChange)="selectActiveAccount($event)"
				(toggleMenu)="toggleUserMenu()"
				(logout)="logout()"
			/>
			<div class="app-layout">
				<app-finance-sidebar [navigation]="sidebarNavigation()" [activeKey]="active()" [transactionsCount]="transactionsCount()" [user]="authUser()" [initials]="userInitials()" [activeAccountTitle]="activeAccountTitle()" (navigate)="navigate($event)" />
				<aside class="sidebar legacy-sidebar">
					<div class="sidebar-top">
						<div class="sidebar-heading">NAVEGAÇÃO</div>
						<nav class="nav-list" aria-label="Categorias de gestão">
							@for (item of navigation; track item.key) {
								<button
									class="nav-item"
									[class.active]="isActive(item)"
									(click)="navigate(item)"
								>
									<span
										class="nav-icon material-symbols-outlined"
										>{{ item.icon }}</span
									><span>{{ item.label }}</span>
									@if (item.key === "transactions") {
										<span class="nav-count">{{
											transactionsCount()
										}}</span>
									}
									@if (item.children) {
										<span
											class="material-symbols-outlined nav-chevron"
											>expand_more</span
										>
									}
								</button>
								@if (item.children) {
									<div class="nav-children">
										@for (
											child of item.children;
											track child.key
										) {
											<button
												class="nav-subitem"
												[class.active]="isActive(child)"
												(click)="navigate(child)"
											>
												<span
													class="nav-icon material-symbols-outlined"
													>{{ child.icon }}</span
												><span>{{ child.label }}</span>
												@if (child.children) {
													<span
														class="material-symbols-outlined nav-chevron"
														>expand_more</span
													>
												}
											</button>
											@if (child.children) {
												<div class="nav-children">
													@for (
														leaf of child.children;
														track leaf.key
													) {
														<button
															class="nav-subitem"
															[class.active]="
																isActive(leaf)
															"
															(click)="
																navigate(leaf)
															"
														>
															<span
																class="nav-icon material-symbols-outlined"
																>{{
																	leaf.icon
																}}</span
															><span>{{
																leaf.label
															}}</span>
														</button>
													}
												</div>
											}
										}
									</div>
								}
							}
						</nav>
					</div>
					<div class="sidebar-bottom">
						<div class="sidebar-heading">SUA CONTA</div>
						<div class="user-card">
							<div class="user-avatar">RM</div>
							<div>
								<strong>Minha conta</strong
								><span>Plano pessoal</span>
							</div>
							<span class="user-more material-symbols-outlined"
								>more_horiz</span
							>
						</div>
						<div class="sidebar-version">
							FinLaunch <span>v1.0</span>
						</div>
					</div>
				</aside>
				<main
					class="content"
					[class.overview-layout]="active() === 'overview'"
					[class.form-layout]="categoryFormOpen() || accountFormOpen() || cardFormOpen() || budgetFormOpen()"
				>
					<section
						class="list-panel"
						[class.calendar-mode]="active() === 'overview'"
						[class.categories-mode]="active() === 'categories'"
						[class.accounts-mode]="active() === 'accounts'"
						[class.cards-mode]="cardSectionActive()"
					>
						@if (active() === "overview") {
							<app-calendar-view
								[selection]="store.overviewSelection()"
								(selected)="selectOverview($event)"
							/>
						} @else {
							<div class="list-heading">
								<div>
									<h1>{{ activeSection().title }}</h1>
								</div>
				@if (active() === "categories" || active() === "accounts" || cardSectionActive()) {
									<button
										class="new-instance-icon"
										type="button"
										[title]="active() === 'categories' ? 'Nova categoria' : 'Nova conta bancária'"
										[attr.aria-label]="active() === 'categories' ? 'Nova categoria' : 'Nova conta bancária'"
						(click)="active() === 'categories' ? openCategoryForm() : active() === 'accounts' ? openAccountForm() : openCardForm()"
									>
										<span class="material-symbols-outlined"
											>add</span
										>
									</button>
								} @else {
									<span class="item-counter"
										>{{ filteredRecords().length }}
										{{
											filteredRecords().length === 1
												? "ITEM"
												: "ITENS"
										}}</span
									>
								}
							</div>
							<div class="list-tools">
								<div class="search">
									<span class="material-symbols-outlined"
										>search</span
									><input
										type="search"
										placeholder="Buscar registros..."
										[value]="store.query()"
										(input)="onQueryInput($event)"
									/>
								</div>
								@if (active() !== "categories") {
									<button class="filter-btn" title="Filtros" (click)="toggleCardTypeFilter()">
										<span class="material-symbols-outlined"
											>tune</span
										>
									</button>
								}
							</div>
							@if (cardSectionActive() && cardTypeFilterOpen()) {
								<div class="card-type-filter" role="group" aria-label="Filtrar por tipo de cartão">
					<span class="card-type-filter-heading">TIPO DE CARTÃO</span>
									@for (type of cardTypes; track type.value) {
										<button type="button" [class.selected]="selectedCardTypes().has(type.value)" (click)="toggleCardType(type.value)"><span class="material-symbols-outlined">{{ type.icon }}</span><span>{{ type.label }}</span><span class="material-symbols-outlined card-type-filter-check">{{ selectedCardTypes().has(type.value) ? 'check' : '' }}</span></button>
									}
								</div>
							}
							<div class="list-caption">
								<span>{{
									active() === "transactions"
										? "MOVIMENTAÇÕES RECENTES"
										: "REGISTROS CADASTRADOS"
								}}</span
								><span>{{ sortLabel() }}</span>
							</div>
							<div class="item-list">
								@for (
									record of filteredRecords();
									track record.id
								) {
									<button
										class="record"
										[class.selected]="
											store.selectedId() === record.id
										"
										(click)="selectRecord(record.id)"
									>
										<span
											class="record-icon"
										[class.material-symbols-outlined]="active() === 'accounts' || cardSectionActive()"
											[class.income]="
												record.type === 'income'
											"
											[style.backgroundColor]="
												active() === 'categories'
													? categoryColor(record)
													: null
											"
											>{{
												active() === "categories"
													? categoryIcon(record)
													: listRecordIcon(record)
											}}</span
										><span class="record-main"
											><span class="record-title-line"><strong>{{ record.title }}</strong>@if (active() === "categories") { <span class="category-list-type-tag" [class.income]="record.type === 'income'" [class.expense]="record.type === 'expense'" [attr.aria-label]="record.type === 'income' ? 'Entrada' : 'Saída'" [title]="record.type === 'income' ? 'Entrada' : 'Saída'"><span class="material-symbols-outlined">{{ record.type === "income" ? "arrow_upward" : "arrow_downward" }}</span></span> }</span>@if (active() !== "categories") { <span>{{ record.category }} <b>·</b> {{ active() === "accounts" ? (record.movements?.length ?? 0) + " movimentações" : shortDate(record.date) }}</span> }</span
										><span class="record-end"
											><strong
												[class.positive]="
													record.type === 'income'
												"
												>{{ movementIcon(record) }}
												{{
													money(record.amount)
												}}</strong
											><small>{{
												record.status ?? "Registrado"
											}}</small></span
										>
									</button>
								} @empty {
									<div class="no-records">
										Nenhum registro encontrado.
									</div>
								}
							</div>
							<div class="list-footer">
								<span
									>{{
										filteredRecords().length
									}}
									registros</span
								>
							</div>
						}
					</section>
					<section
						class="detail-panel"
						[class.account-list-only]="
							active() === 'accounts' &&
							store.accountTab() !== 'overview'
						"
						[class.category-budget-active]="
							active() === 'categories' &&
							store.categoryTab() === 'budgets'
						"
						[class.domain-detail-active]="
							selectedRecord() && active() !== 'categories'
						"
					>
						<div
							class="category-tabs domain-tabs"
							[class.visible]="
													false
							"
							role="tablist"
						>
							<button
								class="account-tab"
								[class.active]="
									store.categoryTab() === 'overview'
								"
														aria-label="Detalhes da categoria"
														title="Detalhes"
								(click)="setCategoryTab('overview')"
													>Visão geral</button
							><button
								class="account-tab"
								[class.active]="
									store.categoryTab() === 'budgets'
								"
														aria-label="Orçamentos da categoria"
														title="Orçamentos"
								(click)="setCategoryTab('budgets')"
													>Orçamentos</button>
						</div>
						@if (
							active() === "categories" &&
								store.categoryTab() === "budgets" &&
											selectedRecord()
						) {
							<div class="category-budget-panel">
								@for (
									budget of categoryBudgets();
									track budget.id
								) {
									<div class="category-budget-row">
										<div>
											<strong>{{ monthReference(budget.date) }}</strong>
										</div>
										<div
											class="budget-progress"
											role="progressbar"
											[attr.aria-valuenow]="
												budget.currentAmount ?? null
											"
											[attr.aria-valuemax]="
												budget.amount ?? null
											"
											aria-label="Consumo do orçamento"
										>
											<span
												[style.width.%]="
													budgetProgress(
														budget.currentAmount,
														budget.amount
													)
												"
											></span>
										</div>
										<div class="category-budget-values">
											<span>Consumido <strong>{{ money(budget.currentAmount) }}</strong></span>
											<span>Limite <strong>{{ money(budget.amount) }}</strong></span>
										</div>
									</div>
								} @empty {
									<div class="no-records">
										Nenhum orçamento cadastrado para esta
										categoria.
									</div>
								}
							</div>
						}
						@if (active() === "categories" && categoryFormOpen()) {
							<div class="category-form-panel">
								<div class="category-form-heading">
									<div>
										<h2>Nova categoria</h2>
									</div>
									<button
										type="button"
										class="category-form-close"
										aria-label="Fechar formulário"
										(click)="closeCategoryForm()"
									>
										<span class="material-symbols-outlined"
											>close</span
										>
									</button>
								</div>
								<form
									class="category-form"
									[formGroup]="categoryForm"
									(ngSubmit)="saveCategory()"
								>
									<div class="category-form-grid">
										<label
											>Nome da categoria<input
												formControlName="name"
												maxlength="80"
												autocomplete="off"
										/></label>
										<fieldset
											class="category-type-fieldset"
										>
											<legend>Tipo</legend>
											<div class="category-type-options">
												<label
													class="category-type-option"
													[class.selected]="
														categoryForm.controls
															.type.value ===
														'ENTRADA'
													"
												>
													<input
														type="radio"
														formControlName="type"
														value="ENTRADA"
													/>
													<span
														class="material-symbols-outlined"
														>arrow_upward</span
													><span>Entrada</span>
												</label>
												<label
													class="category-type-option"
													[class.selected]="
														categoryForm.controls
															.type.value ===
														'SAIDA'
													"
												>
													<input
														type="radio"
														formControlName="type"
														value="SAIDA"
													/>
													<span
														class="material-symbols-outlined"
														>arrow_downward</span
													><span>Saída</span>
												</label>
											</div>
										</fieldset>
										<fieldset
											class="category-color-fieldset"
										>
											<legend>
												Cor de identificação
											</legend>
											<div
												class="category-color-palette"
												role="radiogroup"
												aria-label="Paleta de cores da categoria"
											>
												@for (
													color of categoryColors;
													track color
												) {
													<button
														type="button"
														class="category-color-option"
														[class.selected]="
															categoryForm
																.controls.color
																.value === color
														"
														[style.backgroundColor]="
															color
														"
														[attr.aria-label]="
															'Selecionar cor ' +
															color
														"
														[attr.aria-pressed]="
															categoryForm
																.controls.color
																.value === color
														"
														(click)="
															selectCategoryColor(
																color
															)
														"
													></button>
												}
											</div>
										</fieldset>
										<label
											>Ícone<input
												formControlName="icon"
												maxlength="50"
												placeholder="Nome do ícone Material Symbols"
												autocomplete="off"
										/></label>
									</div>
									<div class="category-icon-preview">
										<span
											class="material-symbols-outlined"
											>{{
												categoryIconValue(
													categoryForm.controls.icon
														.value
												)
											}}</span
										><span>Pré-visualização do ícone</span>
									</div>
									@if (
										categoryForm.controls.name.touched &&
										categoryForm.controls.name.invalid
									) {
										<small class="field-error"
											>Informe um nome com até 80
											caracteres.</small
										>
									}
									@if (
										categoryForm.controls.type.touched &&
										categoryForm.controls.type.invalid
									) {
										<small class="field-error"
											>Selecione o tipo da
											categoria.</small
										>
									}
									@if (
										categoryForm.controls.color.touched &&
										categoryForm.controls.color.invalid
									) {
										<small class="field-error"
											>Informe uma cor hexadecimal no
											formato #RRGGBB.</small
										>
									}
									@if (
										categoryForm.controls.icon.touched &&
										categoryForm.controls.icon.invalid
									) {
										<small class="field-error"
											>Informe o identificador do
											ícone.</small
										>
									}
									@if (store.error(); as error) {
										<div class="form-error">
											{{ error }}
										</div>
									}
									<div class="category-form-actions">
										<button
											type="button"
											class="secondary-btn"
											(click)="closeCategoryForm()"
										>
											<span class="material-symbols-outlined">close</span>CANCELAR</button
										><button
											type="submit"
											class="primary-btn"
											[disabled]="
												categoryForm.invalid ||
												categorySaving()
											"
										>
											<span
												class="material-symbols-outlined"
												>save</span
											>{{
												categorySaving()
													? "SALVANDO..."
													: "SALVAR CATEGORIA"
											}}
										</button>
									</div>
								</form>
							</div>
						}
						@if (active() === "accounts" && accountFormOpen()) {
							<div class="category-form-panel">
								<div class="category-form-heading">
									<div>
										<h2>Nova conta bancária</h2>
									</div>
									<button type="button" class="category-form-close" aria-label="Fechar formulário" (click)="closeAccountForm()">
										<span class="material-symbols-outlined">close</span>
									</button>
								</div>
								<form class="category-form" [formGroup]="accountForm" (ngSubmit)="saveAccount()">
									<div class="category-form-grid">
										<label>Nome do banco<input formControlName="bankName" maxlength="100" autocomplete="organization" /></label>
										<label>Crédito total<input type="number" formControlName="creditTotal" min="0" step="0.01" inputmode="decimal" /></label>
										<label>Saldo corrente<input type="number" formControlName="currentBalance" step="0.01" inputmode="decimal" /></label>
									</div>
									@if (accountForm.controls.bankName.touched && accountForm.controls.bankName.invalid) {
										<small class="field-error">Informe o nome do banco.</small>
									}
									@if (accountForm.controls.creditTotal.touched && accountForm.controls.creditTotal.invalid) {
										<small class="field-error">Informe um crédito total válido.</small>
									}
									@if (accountForm.controls.currentBalance.touched && accountForm.controls.currentBalance.invalid) {
										<small class="field-error">Informe um saldo válido.</small>
									}
									@if (store.error(); as error) { <div class="form-error">{{ error }}</div> }
									<div class="category-form-actions">
										<button type="button" class="secondary-btn" (click)="closeAccountForm()"><span class="material-symbols-outlined">close</span>CANCELAR</button>
										<button type="submit" class="primary-btn" [disabled]="accountForm.invalid || accountSaving()">
											<span class="material-symbols-outlined">save</span>{{ accountSaving() ? "SALVANDO..." : "SALVAR CONTA" }}
										</button>
									</div>
								</form>
							</div>
						}
						@if (cardSectionActive() && cardFormOpen()) {
							<div class="category-form-panel">
								<div class="category-form-heading"><div><h2>Novo cartão</h2></div><button type="button" class="category-form-close" aria-label="Fechar formulário" (click)="closeCardForm()"><span class="material-symbols-outlined">close</span></button></div>
								<form class="category-form card-form" [formGroup]="cardForm" (ngSubmit)="saveCard()">
									<fieldset class="card-type-fieldset"><legend>Tipo</legend><div class="card-type-options"><button type="button" [class.selected]="cardForm.controls.type.value === 'CREDITO'" (click)="selectCardType('CREDITO')"><span class="material-symbols-outlined">credit_score</span>Crédito</button><button type="button" [class.selected]="cardForm.controls.type.value === 'DEBITO'" (click)="selectCardType('DEBITO')"><span class="material-symbols-outlined">payments</span>Débito</button><button type="button" [class.selected]="cardForm.controls.type.value === 'VOUCHER'" (click)="selectCardType('VOUCHER')"><span class="material-symbols-outlined">confirmation_number</span>Voucher</button></div></fieldset>
									<div class="card-account-readonly"><span class="card-account-readonly-label">Conta bancária</span><div><span class="card-account-icon material-symbols-outlined">account_balance</span><strong>{{ activeAccountTitle() }}</strong><span class="material-symbols-outlined">lock</span></div></div>
									<fieldset class="card-account-fieldset"><legend>Conta bancária</legend><div class="card-account-options">@for (account of movementAccounts(); track account.apiId) { <button type="button" [class.selected]="cardForm.controls.accountId.value === account.apiId" (click)="selectCardAccount(account.apiId)"><span class="card-account-icon material-symbols-outlined">account_balance</span><span><strong>{{ account.title }}</strong><small>Conta bancária</small></span><span class="material-symbols-outlined card-option-check">{{ cardForm.controls.accountId.value === account.apiId ? 'check' : '' }}</span></button> } @empty { <span class="card-account-empty">Nenhuma conta bancária disponível.</span> }</div></fieldset>
									<div class="category-form-grid card-main-fields">
										<label>Apelido<input formControlName="nickname" maxlength="80" autocomplete="off" placeholder="Ex.: Cartão principal" /></label>
										<label>Tipo<select formControlName="type"><option value="">Selecione o tipo</option><option value="CREDITO">Crédito</option><option value="DEBITO">Débito</option><option value="VOUCHER">Voucher</option></select></label>
										<label>Conta bancária<select formControlName="accountId"><option value="">Selecione uma conta</option>@for (account of movementAccounts(); track account.apiId) { <option [value]="account.apiId">{{ account.title }}</option> }</select></label>
									</div>
									@if (cardForm.controls.type.value === 'CREDITO') {
										<div class="card-specific-divider"></div>
										<div class="card-specific-fields"><label class="card-money-field">Limite de crédito<input type="text" inputmode="decimal" autocomplete="off" [value]="cardForm.controls.creditLimit.value" placeholder="R$ 0,00" (input)="formatCardMoney($event, 'creditLimit')" /></label><fieldset class="card-day-fieldset"><legend>Dia de fechamento</legend><div class="card-day-options">@for (day of cardDays; track day) { <button type="button" [class.selected]="cardForm.controls.closingDay.value === day" (click)="selectCardDay('closingDay', day)">{{ day }}</button> }</div></fieldset><fieldset class="card-day-fieldset"><legend>Dia de vencimento</legend><div class="card-day-options">@for (day of cardDays; track day) { <button type="button" [class.selected]="cardForm.controls.dueDay.value === day" (click)="selectCardDay('dueDay', day)">{{ day }}</button> }</div></fieldset></div>
										<div class="category-form-grid"><label>Limite de crédito<input type="number" formControlName="creditLimit" min="0.01" step="0.01" inputmode="decimal" /></label><label>Dia de fechamento<input type="number" formControlName="closingDay" min="1" max="31" step="1" /></label><label>Dia de vencimento<input type="number" formControlName="dueDay" min="1" max="31" step="1" /></label></div>
									}
									@if (cardForm.controls.type.value === 'VOUCHER') {
										<div class="card-specific-fields"><label class="card-money-field">Valor da recarga<input type="text" inputmode="decimal" autocomplete="off" [value]="cardForm.controls.rechargeAmount.value" placeholder="R$ 0,00" (input)="formatCardMoney($event, 'rechargeAmount')" /></label><fieldset class="card-day-fieldset"><legend>Dia da recarga</legend><div class="card-day-options">@for (day of cardDays; track day) { <button type="button" [class.selected]="cardForm.controls.rechargeDay.value === day" (click)="selectCardDay('rechargeDay', day)">{{ day }}</button> }</div></fieldset></div>
										<div class="card-specific-divider"></div>
										<fieldset class="card-voucher-fieldset"><legend>Tipo de voucher</legend><div class="card-voucher-options"><button type="button" [class.selected]="cardForm.controls.voucherType.value === 'VA_VR'" (click)="selectCardVoucherType('VA_VR')">VA / VR</button><button type="button" [class.selected]="cardForm.controls.voucherType.value === 'CREDITO_VOUNCHER'" (click)="selectCardVoucherType('CREDITO_VOUNCHER')">Crédito voucher</button></div></fieldset>
										<div class="category-form-grid"><label>Tipo de voucher<select formControlName="voucherType"><option value="VA_VR">VA / VR</option><option value="CREDITO_VOUNCHER">Crédito voucher</option></select></label><label>Valor da recarga<input type="number" formControlName="rechargeAmount" min="0.01" step="0.01" inputmode="decimal" /></label><label>Dia da recarga<input type="number" formControlName="rechargeDay" min="1" max="31" step="1" /></label></div>
									}
									@if (cardForm.controls.nickname.touched && cardForm.controls.nickname.invalid) { <small class="field-error">Informe o apelido do cartão.</small> } @if (cardForm.controls.accountId.touched && cardForm.controls.accountId.invalid) { <small class="field-error">Selecione uma conta bancária.</small> } @if (cardForm.controls.type.touched && cardForm.controls.type.invalid) { <small class="field-error">Selecione o tipo do cartão.</small> } @if (store.error(); as error) { <div class="form-error">{{ error }}</div> }
									<div class="category-form-actions"><button type="button" class="secondary-btn" (click)="closeCardForm()"><span class="material-symbols-outlined">close</span>CANCELAR</button><button type="submit" class="primary-btn" [disabled]="cardForm.invalid || cardSaving()"><span class="material-symbols-outlined">save</span>{{ cardSaving() ? "SALVANDO..." : "SALVAR CARTÃO" }}</button></div>
								</form>
							</div>
						}
						@if (selectedRecord(); as record) {
							@if (active() !== "categories") {
								<app-finance-record-detail
									[section]="active()"
									[record]="record"
									[accountTab]="store.accountTab()"
									(accountTabChange)="setAccountTab($event)"
									[cardTab]="store.cardTab()"
									[invoices]="store.sections().invoices.records"
									(cardTabChange)="setCardTab($event)"
								/>
							}
							@if (active() === "categories") {
								<div class="category-detail-view">
									<div
										class="category-detail-header"
										[style.--category-color]="
											categoryColor(record)
										"
									>
										<div class="category-detail-icon">
											<span
												class="material-symbols-outlined"
												>{{
													categoryIcon(record)
												}}</span
											>
										</div>
										<div class="category-detail-heading">
											<div class="category-name-block">
												<h2>{{ record.title }}</h2>
												@if (record.budget; as budget) {
													<small
														class="category-reference"
														>{{
															monthReference(
																budget.month
															)
														}}</small
													>
												}
											</div>
											<span class="category-type-tag"
												[class.income]="record.type === 'income'"
												[class.expense]="record.type === 'expense'"
												><span
													class="material-symbols-outlined"
													>{{
														record.type === "income"
															? "arrow_upward"
															: "arrow_downward"
													}}</span
												>{{
													record.type === "income"
														? "ENTRADA"
														: "SAÍDA"
												}}</span
											>
										</div>
									</div>
									<div class="category-tabs domain-tabs visible" role="tablist">
										<button class="account-tab" [class.active]="store.categoryTab() === 'overview'" aria-label="Detalhes da categoria" title="Detalhes" (click)="setCategoryTab('overview')">Visão geral</button>
										<button class="account-tab" [class.active]="store.categoryTab() === 'budgets'" aria-label="Orçamentos da categoria" title="Orçamentos" (click)="setCategoryTab('budgets')">Orçamentos</button>
									</div>
									@if (store.categoryTab() === 'budgets') {
										<div class="category-budget-panel category-budget-panel-inline">
											<div class="category-budget-toolbar"><strong>Orçamentos</strong>@if (!hasCurrentBudget() && !budgetFormOpen()) { <button type="button" class="primary-btn" (click)="openBudgetForm()"><span class="material-symbols-outlined">add</span>CRIAR ORÇAMENTO</button> }</div>
											@if (budgetFormOpen()) {
												<div class="category-form-panel budget-form-panel">
													<div class="category-form-heading"><div><h2>Novo orçamento</h2></div><button type="button" class="category-form-close" aria-label="Fechar formulário" (click)="closeBudgetForm()"><span class="material-symbols-outlined">close</span></button></div>
													<form class="category-budget-form category-form" [formGroup]="budgetForm" (ngSubmit)="saveBudget()">
													<label>VALOR LIMITE<input type="number" min="0.01" step="0.01" formControlName="limit" placeholder="0,00" /></label>
													@if (budgetForm.controls.limit.invalid && budgetForm.controls.limit.touched) { <span class="field-error">Informe um valor limite válido.</span> }
													<div class="category-form-actions"><button type="button" class="secondary-btn" (click)="closeBudgetForm()"><span class="material-symbols-outlined">close</span>CANCELAR</button><button type="submit" class="primary-btn" [disabled]="budgetForm.invalid || budgetSaving()"><span class="material-symbols-outlined">save</span>{{ budgetSaving() ? "SALVANDO..." : "SALVAR ORÇAMENTO" }}</button></div>
												</form>
												</div>
											}
											@for (budget of categoryBudgets(); track budget.id) {
												<div class="category-budget-row"><div><strong>{{ monthReference(budget.date) }}</strong></div><div class="budget-progress" role="progressbar" [attr.aria-valuenow]="budget.currentAmount ?? null" [attr.aria-valuemax]="budget.amount ?? null" aria-label="Consumo do orçamento"><span [style.width.%]="budgetProgress(budget.currentAmount, budget.amount)"></span></div><div class="category-budget-values"><span>Consumido <strong>{{ money(budget.currentAmount) }}</strong></span><span>Limite <strong>{{ money(budget.amount) }}</strong></span></div></div>
											} @empty {
												<div class="no-records">Nenhum orçamento cadastrado para esta categoria.</div>
											}
										</div>
									}
									<div class="category-budget-section">
										<div class="category-section-title">
											@if (!hasCurrentBudget() && !budgetFormOpen()) { <button type="button" class="category-budget-create" (click)="openBudgetForm()"><span class="material-symbols-outlined">add</span>CRIAR ORÇAMENTO</button> }
											<span
												class="material-symbols-outlined"
												>payments</span
											><strong>Orçamento</strong>
										</div>
										@if (record.budget; as budget) {
											<div class="category-budget-meter">
												<div
													class="category-budget-meter-labels"
												>
													<span
														><strong>{{
															money(
																budget.currentAmount
															)
														}}</strong></span
													><span
														><strong>{{
															money(budget.amount)
														}}</strong></span
													>
												</div>
												<div
													class="category-budget-progress"
													role="progressbar"
													[attr.aria-valuenow]="
														budget.currentAmount ??
														null
													"
													[attr.aria-valuemax]="
														budget.amount ?? null
													"
													aria-label="Consumo do orçamento"
												>
													<span
														[style.width.%]="
															budgetProgress(
																budget.currentAmount,
																budget.amount
															)
														"
													></span>
												</div>
												<div
													class="category-budget-meter-footer"
												>
													<span
														>RESTANTE
														<strong>{{
															money(
																budgetRemaining(
																	budget.currentAmount,
																	budget.amount
																)
															)
														}}</strong></span
													>
												</div>
											</div>
										} @else {
											<div class="category-empty-state">@if (!hasCurrentBudget() && !budgetFormOpen()) { <button type="button" class="category-empty-create" (click)="openBudgetForm()"><span class="material-symbols-outlined">add</span>CRIAR ORÇAMENTO</button> }
												Esta categoria não possui
												orçamento cadastrado.
											</div>
										}
									</div>
								</div>
							}
							@if (active() !== "categories") {
								<div class="detail-top">
									<span class="detail-view-title"
										>DETALHES</span
									>
									<div class="detail-actions">
										<button
											class="outline-icon"
											aria-label="Fechar registro"
											(click)="clearSelection()"
										>
											×</button
										><button
											class="outline-icon"
											aria-label="Editar registro"
											(click)="openModal(record)"
										>
											✎</button
										><button
											class="outline-icon"
											aria-label="Excluir registro"
											(click)="deleteRecord()"
										>
											▣
										</button>
									</div>
								</div>
								@if (active() === "accounts") {
									<div class="account-tabs" role="tablist">
										<button
											class="account-tab"
											[class.active]="
												store.accountTab() ===
												'overview'
											"
											(click)="setAccountTab('overview')"
										>
											Principal</button
										><button
											class="account-tab"
											[class.active]="
												store.accountTab() ===
												'movements'
											"
											(click)="setAccountTab('movements')"
										>
											Registros de movimentação</button
										><button
											class="account-tab"
											[class.active]="
												store.accountTab() === 'entries'
											"
											(click)="setAccountTab('entries')"
										>
											Lançamentos
										</button>
									</div>
								}
								@if (
									active() === "accounts" &&
									store.accountTab() !== "overview"
								) {
									<div
										class="detail-body account-movements-active"
									>
										<div
											class="content-section-title account-movements-title"
										>
											<span>{{
												store.accountTab() === "entries"
													? "REGISTROS DE LANÇAMENTOS"
													: "REGISTROS DE MOVIMENTAÇÃO"
											}}</span
											><span class="title-line"></span>
										</div>
										<div class="account-movements-list">
											@for (
												movement of record.movements ??
													[];
												track movement.title +
													movement.date
											) {
												<div class="account-movement">
													<span
														class="record-icon"
														[class.income]="
															movement.type ===
															'income'
														"
														>{{
															movementIcon(
																movement
															)
														}}</span
													>
													<div>
														<strong>{{
															movement.title
														}}</strong
														><small
															>{{
																movement.category
															}}
															·
															{{
																shortDate(
																	movement.date
																)
															}}</small
														>
													</div>
													<b
														[class.positive]="
															movement.type ===
															'income'
														"
														>{{
															movementIcon(
																movement
															)
														}}
														{{
															money(
																movement.amount
															)
														}}</b
													>
												</div>
											}
										</div>
									</div>
								} @else {
									<div class="detail-hero">
										<span class="detail-type"
											>{{
												activeSection().singular
													| uppercase
											}}
											<span
												>/ #{{
													record.id
														.toString()
														.padStart(4, "0")
												}}</span
											></span
										>
										<h2>{{ record.title }}</h2>
										<div class="detail-total">
											<span>VALOR REGISTRADO</span>
											<div
												class="detail-amount"
												[class.positive]="
													record.type === 'income'
												"
											>
												{{ movementIcon(record) }}
												{{ money(record.amount) }}
											</div>
										</div>
										<span class="status-pill"
											><span></span>
											{{
												record.status ?? "REGISTRADO"
											}}</span
										>
									</div>
									<div class="detail-body">
										<div class="content-section-title">
											<span>DETALHES DO REGISTRO</span
											><span class="title-line"></span>
										</div>
										@if (
											active() === "categories" &&
												record.budget;
											as budget
										) {
											<div class="category-budget-detail">
												<div
													class="category-budget-detail-head"
												>
													<span
														>ORÇAMENTO
														PRINCIPAL</span
													><strong
														>{{
															money(
																budget.currentAmount
															)
														}}
														<small
															>de
															{{
																money(
																	budget.amount
																)
															}}</small
														></strong
													>
												</div>
												<div
													class="budget-progress"
													role="progressbar"
													[attr.aria-valuenow]="
														budget.currentAmount ??
														null
													"
													[attr.aria-valuemax]="
														budget.amount ?? null
													"
													aria-label="Consumo do orçamento"
												>
													<span
														[style.width.%]="
															budgetProgress(
																budget.currentAmount,
																budget.amount
															)
														"
													></span>
												</div>
												<small
													class="category-budget-month"
													>{{
														fullDate(budget.month)
													}}</small
												>
											</div>
										}
										<div class="details-grid">
											<div class="detail-field">
												<span>CATEGORIA</span
												><strong>{{
													record.category
												}}</strong>
											</div>
											<div class="detail-field">
												<span>DATA DO REGISTRO</span
												><strong>{{
													fullDate(record.date)
												}}</strong>
											</div>
											<div class="detail-field">
												<span>{{
													record.method
														? "MÉTODO / TIPO"
														: "IDENTIFICADOR"
												}}</span
												><strong>{{
													record.method ??
														"#" +
															record.id
																.toString()
																.padStart(
																	4,
																	"0"
																)
												}}</strong>
											</div>
											<div class="detail-field">
												<span>{{
													record.account
														? "CONTA VINCULADA"
														: "SITUAÇÃO"
												}}</span
												><strong>{{
													record.account ??
														record.status ??
														"Ativo"
												}}</strong>
											</div>
										</div>
										<div
											class="content-section-title notes-title"
										>
											<span>OBSERVAÇÕES</span
											><span class="title-line"></span>
										</div>
										<div class="note-box">
											{{
												record.notes ??
													"Nenhuma observação adicionada."
											}}
										</div>
									</div>
								}
							}
						} @else if (active() === "overview") {
							<div class="dashboard">
								<div class="dashboard-selection">
									<span>{{
										store.overviewSelection().type === "day"
											? "DIA SELECIONADO"
											: "MÊS SELECIONADO"
									}}</span
									><strong>{{ overviewLabel() }}</strong>
								</div>
								<div class="dashboard-header">
									<div>
										<span class="dash-kicker"
											>RESUMO FINANCEIRO</span
										>
										<h2>
											Dashboard<span class="accent"
												>.</span
											>
										</h2>
									</div>
									<span class="dashboard-month">{{
										overviewLabel()
									}}</span>
								</div>
								<div class="dashboard-highlight">
									<span>SALDO DO PERÍODO</span
									><strong>{{ money(balance()) }}</strong
									><span class="dashboard-balance-note"
										>ENTRADAS − SAÍDAS</span
									>
								</div>
								<div class="dashboard-metrics">
									<div class="dash-metric">
										<span>ENTRADAS</span
										><strong class="positive">{{
											money(income())
										}}</strong
										><small>↑ Receitas</small>
									</div>
									<div class="dash-metric">
										<span>SAÍDAS</span
										><strong class="negative">{{
											money(expense())
										}}</strong
										><small>↓ Despesas</small>
									</div>
								</div>
								<div class="dash-section">
									<div class="dash-title">
										DESPESAS POR CATEGORIA
									</div>
									@for (
										item of categoryTotals();
										track item.name
									) {
										<div class="category-bar">
											<div class="bar-label">
												<span>{{ item.name }}</span
												><strong>{{
													money(item.amount)
												}}</strong>
											</div>
											<div class="bar-track">
												<span
													[style.width.%]="item.width"
												></span>
											</div>
										</div>
									} @empty {
										<div class="dashboard-empty">
											Nenhuma despesa no período
											selecionado.
										</div>
									}
								</div>
								<div class="dash-section">
									<div class="dash-title">
										ÚLTIMAS MOVIMENTAÇÕES
									</div>
									@for (
										item of recentRecords();
										track item.id
									) {
										<div class="dash-transaction">
											<span
												class="dash-tx-icon"
												[class.income]="
													item.type === 'income'
												"
												>{{ movementIcon(item) }}</span
											>
											<div>
												<strong>{{ item.title }}</strong
												><small>{{
													shortDate(item.date)
												}}</small>
											</div>
											<b
												[class.positive]="
													item.type === 'income'
												"
												>{{ movementIcon(item) }}
												{{ money(item.amount) }}</b
											>
										</div>
									} @empty {
										<div class="dashboard-empty">
											Nenhuma movimentação no período
											selecionado.
										</div>
									}
								</div>
							</div>
						} @else {
							<div class="dashboard">
								<h2>{{ activeSection().title }}</h2>
								<p>{{ activeSection().subtitle }}</p>
							</div>
						}
					</section>
					@if (active() === "overview") {
						<app-monthly-line-chart
							[records]="store.sections().transactions.records"
							[month]="store.overviewSelection().value"
						/>
					}
				</main>
			</div>
		</div>
		@if (movementAsideOpen()) {
			<div class="movement-aside-backdrop" (click)="$event.target === $event.currentTarget && closeMovementAside()"></div>
			<aside class="movement-aside" role="dialog" aria-modal="true" aria-labelledby="movement-aside-title">
				<div class="movement-aside-head"><div><h2 id="movement-aside-title">Registrar movimentação</h2></div><button type="button" class="category-form-close" aria-label="Fechar formulário" (click)="closeMovementAside()"><span class="material-symbols-outlined">close</span></button></div>
				<form class="movement-form" [formGroup]="movementForm" (ngSubmit)="saveMovement()">
					<div class="movement-type-options"><label [class.selected]="movementForm.controls.type.value === 'ENTRADA'"><input type="radio" formControlName="type" value="ENTRADA" /><span class="material-symbols-outlined">arrow_upward</span>Entrada</label><label [class.selected]="movementForm.controls.type.value === 'SAIDA'"><input type="radio" formControlName="type" value="SAIDA" /><span class="material-symbols-outlined">arrow_downward</span>Saída</label></div>
					<label>Valor<input formControlName="amount" type="number" min="0.01" step="0.01" inputmode="decimal" /></label>
					<label>Conta bancária<select formControlName="accountId"><option value="">Selecione uma conta</option>@for (account of movementAccounts(); track account.apiId) { <option [value]="account.apiId">{{ account.title }}</option> }</select></label>
					<div class="movement-category-field"><span class="movement-field-label">Categoria</span><div class="movement-selection-control">@if (selectedMovementCategory(); as category) { <div class="movement-selection-display"><span class="movement-selection-display-icon" [style.backgroundColor]="categoryColor(category)"><span class="material-symbols-outlined">{{ categoryIcon(category) }}</span></span><span class="movement-selection-display-content"><strong>{{ category.title }}</strong><span class="movement-category-type-tag" [class.income]="category.type === 'income'" [class.expense]="category.type === 'expense'"><span>{{ category.type === 'income' ? 'Entrada' : 'Saída' }}</span><span class="material-symbols-outlined">{{ category.type === 'income' ? 'arrow_upward' : 'arrow_downward' }}</span></span></span><button type="button" class="movement-selection-clear" aria-label="Limpar categoria selecionada" (click)="clearMovementCategory($event)"><span class="material-symbols-outlined">close</span></button></div> } @else { <button type="button" class="movement-category-trigger" (click)="toggleCategoryPicker()"><span class="material-symbols-outlined">sell</span><span>Selecione uma categoria</span><span class="material-symbols-outlined movement-category-chevron">expand_more</span></button> }</div>@if (categoryPickerOpen()) { <div class="movement-category-picker" role="listbox" aria-label="Categorias disponíveis">@for (category of movementCategories(); track category.apiId) { <button type="button" class="movement-category-card" [class.selected]="movementForm.controls.categoryId.value === category.apiId" role="option" [attr.aria-selected]="movementForm.controls.categoryId.value === category.apiId" (click)="selectMovementCategory(category.apiId)"><span class="movement-category-card-icon" [style.backgroundColor]="categoryColor(category)"><span class="material-symbols-outlined">{{ categoryIcon(category) }}</span></span><span class="movement-category-card-copy"><span class="movement-category-title-line"><strong>{{ category.title }}</strong><span class="movement-category-type-tag" [class.income]="category.type === 'income'" [class.expense]="category.type === 'expense'"><span>{{ category.type === 'income' ? 'Entrada' : 'Saída' }}</span><span class="material-symbols-outlined">{{ category.type === 'income' ? 'arrow_upward' : 'arrow_downward' }}</span></span></span></span><span class="material-symbols-outlined movement-category-check">check</span></button> } @empty { <div class="movement-category-empty">Nenhuma categoria disponível.</div> }</div> }</div>
					<div class="movement-payment-field"><span class="movement-field-label">Forma de pagamento</span><div class="movement-selection-control">@if (selectedMovementPayment(); as payment) { <div class="movement-selection-display"><span class="movement-selection-display-icon"><span class="material-symbols-outlined">{{ payment.icon }}</span></span><span class="movement-selection-display-content"><strong>{{ payment.label }}</strong></span><button type="button" class="movement-selection-clear" aria-label="Limpar forma de pagamento selecionada" (click)="clearMovementPayment($event)"><span class="material-symbols-outlined">close</span></button></div> } @else { <button type="button" class="movement-payment-trigger" (click)="togglePaymentPicker()"><span class="material-symbols-outlined">payments</span><span>Selecione uma forma</span><span class="material-symbols-outlined movement-category-chevron">expand_more</span></button> }</div>@if (paymentPickerOpen()) { <div class="movement-payment-picker" role="listbox" aria-label="Formas de pagamento disponíveis">@for (payment of movementPaymentMethods; track payment.value) { <button type="button" class="movement-payment-card" [class.selected]="movementForm.controls.method.value === payment.value" role="option" [attr.aria-selected]="movementForm.controls.method.value === payment.value" (click)="selectMovementPayment(payment.value)"><span class="movement-payment-card-icon"><span class="material-symbols-outlined">{{ payment.icon }}</span></span><span>{{ payment.label }}</span><span class="material-symbols-outlined movement-category-check">check</span></button> }</div> }</div>
					<label>Data<input formControlName="date" type="date" /></label>
					<label>Descrição<textarea formControlName="description" maxlength="120" rows="4"></textarea></label>
					<label class="movement-check"><input formControlName="recurring" type="checkbox" />Movimentação recorrente</label>
					@if (movementForm.controls.type.invalid && movementForm.controls.type.touched) { <small class="field-error">Selecione Entrada ou Saída.</small> } @if (movementForm.controls.amount.invalid && movementForm.controls.amount.touched) { <small class="field-error">Informe um valor maior que zero.</small> } @if (movementForm.controls.accountId.invalid && movementForm.controls.accountId.touched) { <small class="field-error">Selecione uma conta bancária.</small> } @if (movementForm.controls.categoryId.invalid && movementForm.controls.categoryId.touched) { <small class="field-error">Selecione uma categoria.</small> } @if (movementForm.controls.method.invalid && movementForm.controls.method.touched) { <small class="field-error">Selecione a forma de pagamento.</small> } @if (store.error(); as error) { <div class="form-error">{{ error }}</div> }
					<div class="category-form-actions movement-aside-actions"><button type="button" class="secondary-btn" (click)="closeMovementAside()"><span class="material-symbols-outlined">close</span>CANCELAR</button><button type="submit" class="primary-btn" [disabled]="movementForm.invalid || movementSaving()"><span class="material-symbols-outlined">save</span>{{ movementSaving() ? 'SALVANDO...' : 'SALVAR MOVIMENTAÇÃO' }}</button></div>
				</form>
			</aside>
		}
		@if (modalOpen()) {
			<div
				class="modal-backdrop modal-context-list"
				(click)="$event.target === $event.currentTarget && closeModal()"
			>
				<div class="modal" role="dialog" aria-modal="true">
					<div class="modal-head">
						<h2>
							{{
								editingId()
									? "Editar registro"
									: "Novo " + activeSection().singular
							}}
						</h2>
						<button class="close-modal" (click)="closeModal()">
							×
						</button>
					</div>
					<form [formGroup]="entryForm" (ngSubmit)="save()">
						<label
							>Descrição<input
								formControlName="title"
								maxlength="80"
								required
						/></label>
						<div class="form-row">
							<label
								>Valor (R$)<input
									formControlName="amount"
									type="number"
									min="0"
									step="0.01"
									required /></label
							><label
								>Data<input
									formControlName="date"
									type="date"
									required
							/></label>
						</div>
						<label
							>Categoria<input
								formControlName="category"
								required /></label
						><label
							>Observações<textarea
								formControlName="notes"
								rows="3"
							></textarea>
						</label>
						<div class="modal-actions">
							<button
								type="button"
								class="secondary-btn"
								(click)="closeModal()"
							>
								CANCELAR</button
							><button
								class="primary-btn"
								type="submit"
								[disabled]="entryForm.invalid"
							>
								SALVAR REGISTRO →
							</button>
						</div>
					</form>
				</div>
			</div>
		}
	`,
})
export class FinanceShellComponent {
	readonly store = inject(FinanceStore);
	readonly auth = inject(AuthService);
	readonly router = inject(Router);
	readonly route = inject(ActivatedRoute);
	readonly fb = inject(FormBuilder);
	private readonly legacyNavigation: NavItem[] = navigation
		.filter((item) => item.key !== "budgets")
		.map((item) =>
			item.key === "categories"
				? {
						...item,
						children: [
							{
								key: "budgets",
								label: "Orçamentos",
								icon: "pie_chart",
							},
						],
					}
				: item,
		);
	readonly navigation: NavItem[] = navigation.filter(
		(item) => item.key !== "budgets",
	);
	private readonly accountDependentSections = new Set<SectionKey>([
		"transactions",
		"cards",
		"cardCredit",
		"cardDebit",
		"cardVoucher",
		"invoices",
		"investments",
	]);
	readonly sidebarNavigation = computed(() =>
		this.filterNavigation(this.navigation, this.activeAccountId() !== null),
	);
	readonly active = this.store.active;
	readonly activeSection = this.store.activeSection;
	readonly selectedRecord = this.store.selectedRecord;
	readonly cardTypes = [
		{ value: "CREDITO", label: "Crédito", icon: "credit_score" },
		{ value: "DEBITO", label: "Débito", icon: "payments" },
		{ value: "VOUCHER", label: "Voucher", icon: "confirmation_number" },
	] as const;
	readonly selectedCardTypes = signal<Set<string>>(new Set(this.cardTypes.map((type) => type.value)));
	readonly cardTypeFilterOpen = signal(true);
	readonly filteredRecords = computed(() => {
		const records = this.store.filteredRecords();
		if (!this.cardSectionActive()) return records;
		const selected = this.selectedCardTypes();
		return records.filter((record) => selected.has(record.category));
	});
	readonly categoryBudgets = computed(() => {
		const category = this.selectedRecord();
		return category
			? [
					...this.store
						.sections()
						.budgets.records.filter(
							(budget) => budget.title === category.title,
						),
				].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
			: [];
	});
	readonly currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
	readonly hasCurrentBudget = computed(() => {
		const category = this.selectedRecord();
		return Boolean(
			category?.budget?.month === this.currentMonth ||
			this.categoryBudgets().some((budget) => budget.date === this.currentMonth),
		);
	});
	readonly movementAccounts = computed(() => this.store.sections().accounts.records.filter((record) => record.apiId));
	readonly activeAccountId = this.store.activeAccountId;
	readonly activeAccount = computed(() => this.movementAccounts().find((account) => account.apiId === this.activeAccountId()) ?? null);
	readonly activeAccountTitle = computed(() => this.activeAccount()?.title ?? "");
	private readonly activeAccountUrlEffect = effect(() => {
		const requestedId = this.route.snapshot.paramMap.get("accountId") ?? this.route.snapshot.queryParamMap.get("conta");
		const accounts = this.movementAccounts();
		if (!accounts.length) return;
		const account = accounts.find((item) => item.apiId === requestedId);
		if (account?.apiId && this.activeAccountId() !== account.apiId) {
			this.store.setActiveAccountId(account.apiId);
			if (requestedId !== account.apiId) this.updateAccountUrl(account.apiId);
		} else if (!account && requestedId) {
			if (this.activeAccountId() !== null) this.store.setActiveAccountId(null);
			void this.router.navigate(["/"]);
		}
	});
	private readonly accountSectionGuardEffect = effect(() => {
		const routeAccountId = this.route.snapshot.paramMap.get("accountId") ?? this.route.snapshot.queryParamMap.get("conta");
		if (this.activeAccountId() === null && !routeAccountId && this.isAccountDependent(this.active())) {
			this.store.navigate("overview");
			void this.router.navigate(["/"]);
		}
	});
	readonly movementCategories = computed(() => this.store.sections().categories.records.filter((record) => record.apiId));
	readonly modalOpen = computed(
		() => this.store.editingId() !== null || this.modalVisible(),
	);
	readonly authUser = this.auth.user;
	readonly userMenuOpen = signal(false);
	readonly editingId = this.store.editingId;
	private readonly modalVisible = signal(false);
	readonly categoryFormOpen = signal(false);
	readonly categorySaving = signal(false);
	readonly accountFormOpen = signal(false);
	readonly accountSaving = signal(false);
	readonly cardFormOpen = signal(false);
	readonly cardSaving = signal(false);
	readonly cardDays = Array.from({ length: 31 }, (_, index) => index + 1);
	readonly budgetFormOpen = signal(false);
	readonly budgetSaving = signal(false);
	readonly movementAsideOpen = signal(false);
	readonly movementSaving = signal(false);
	readonly categoryPickerOpen = signal(false);
	readonly paymentPickerOpen = signal(false);
	readonly movementPaymentMethods: { value: MovementMethod; label: string; icon: string }[] = [
		{ value: "DINHEIRO", label: "Dinheiro", icon: "payments" },
		{ value: "PIX", label: "Pix", icon: "qr_code_2" },
		{ value: "CARTAO_CREDITO", label: "Cartão de crédito", icon: "credit_card" },
		{ value: "CARTAO_DEBITO", label: "Cartão de débito", icon: "credit_card" },
		{ value: "VOUNCHER", label: "Voucher", icon: "confirmation_number" },
		{ value: "OUTRO", label: "Outro", icon: "more_horiz" },
	];
	readonly categoryColors = [
		"#ed3114",
		"#f59e0b",
		"#eab308",
		"#16b880",
		"#14b8a6",
		"#0ea5e9",
		"#6366f1",
		"#a855f7",
		"#ec4899",
	];
	readonly entryForm = this.fb.group({
		title: this.fb.nonNullable.control("", Validators.required),
		amount: this.fb.control<number | null>(null, [
			Validators.required,
			Validators.min(0),
		]),
		date: this.fb.control<string | null>(null, Validators.required),
		category: this.fb.nonNullable.control("", Validators.required),
		notes: this.fb.nonNullable.control(""),
	});
	readonly categoryForm = this.fb.group({
		name: this.fb.nonNullable.control("", [
			Validators.required,
			Validators.maxLength(80),
		]),
		type: this.fb.control<CategoryType | "">("", Validators.required),
		color: this.fb.nonNullable.control("", [
			Validators.required,
			Validators.pattern(/^#[0-9a-fA-F]{6}$/),
		]),
		icon: this.fb.nonNullable.control("", [
			Validators.required,
			Validators.maxLength(50),
		]),
	});
	readonly accountForm = this.fb.group({
		bankName: this.fb.nonNullable.control("", [Validators.required, Validators.maxLength(100)]),
		creditTotal: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
		currentBalance: this.fb.nonNullable.control(0, [Validators.required]),
	});
	readonly cardForm = this.fb.group({
		nickname: this.fb.nonNullable.control("", [Validators.required, Validators.maxLength(80)]),
		type: this.fb.nonNullable.control("", Validators.required),
		accountId: this.fb.nonNullable.control("", Validators.required),
		creditLimit: this.fb.nonNullable.control(""),
		closingDay: this.fb.control<number | null>(null),
		dueDay: this.fb.control<number | null>(null),
		voucherType: this.fb.nonNullable.control("VA_VR"),
		rechargeAmount: this.fb.nonNullable.control(""),
		rechargeDay: this.fb.control<number | null>(null),
	});
	readonly budgetForm = this.fb.group({
		limit: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
	});
	readonly movementForm = this.fb.group({
		type: this.fb.control<CategoryType | "">("", Validators.required),
		amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
		accountId: this.fb.nonNullable.control("", Validators.required),
		categoryId: this.fb.nonNullable.control("", Validators.required),
		method: this.fb.control<MovementMethod | "">("", Validators.required),
		date: this.fb.nonNullable.control(""),
		description: this.fb.nonNullable.control("", Validators.maxLength(120)),
		recurring: this.fb.nonNullable.control(false),
	});
	readonly transactionsCount = computed(
		() => this.store.sections().transactions.records.length,
	);
	readonly periodRecords = computed(() =>
		this.store
			.sections()
			.transactions.records.filter(
				(record) =>
					record.date?.startsWith(
						this.store.overviewSelection().value,
					) && record.amount !== undefined,
			),
	);
	readonly income = computed(() =>
		this.periodRecords()
			.filter((record) => record.type === "income")
			.reduce((sum, record) => sum + record.amount!, 0),
	);
	readonly expense = computed(() =>
		this.periodRecords()
			.filter((record) => record.type === "expense")
			.reduce((sum, record) => sum + record.amount!, 0),
	);
	readonly balance = computed(() => this.income() - this.expense());
	readonly recentRecords = computed(() =>
		[...this.periodRecords()]
			.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
			.slice(0, 4),
	);
	readonly categoryTotals = computed(() => {
		const map = new Map<string, number>();
		this.periodRecords()
			.filter((r) => r.type === "expense" && r.amount !== undefined)
			.forEach((r) =>
				map.set(r.category, (map.get(r.category) ?? 0) + r.amount!),
			);
		const values = [...map.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4);
		const biggest = Math.max(...values.map(([, amount]) => amount), 1);
		return values.map(([name, amount]) => ({
			name,
			amount,
			width: (amount / biggest) * 100,
		}));
	});

	constructor() {
		if (this.auth.isAuthenticated()) {
			this.auth.loadUser();
			this.store.loadFromApi();
		}
		this.route.paramMap.subscribe((params) => {
			const value = params.get("section");
			const accountId = params.get("accountId") ?? this.route.snapshot.queryParamMap.get("conta");
			if (accountId && this.movementAccounts().some((account) => account.apiId === accountId)) this.store.setActiveAccountId(accountId);
			if (value && this.isSection(value) && (!this.isAccountDependent(value) || this.activeAccountId() || accountId)) this.store.navigate(value);
		});
	}
	filterNavigation(items: NavItem[], accountSelected: boolean): NavItem[] {
		return items
			.filter((item) => accountSelected || !this.isAccountDependent(item.key))
			.map((item) => item.key === "cards" ? { ...item, children: undefined } : item)
			.map((item) => item.children ? { ...item, children: this.filterNavigation(item.children, accountSelected) } : item)
			.filter((item) => !item.children || item.children.length > 0);
	}
	isAccountDependent(section: SectionKey): boolean { return this.accountDependentSections.has(section); }
	cardSectionActive(): boolean { return ["cards", "cardCredit", "cardDebit", "cardVoucher"].includes(this.active()); }
	isSection(value: string): value is SectionKey {
		return Object.prototype.hasOwnProperty.call(
			this.store.sections(),
			value,
		);
	}
	isActive(item: NavItem): boolean {
		return (
			this.active() === item.key ||
			item.children?.some((child) => this.isActive(child)) === true
		);
	}
	navigate(item: NavItem): void {
		if (this.activeAccountId() === null && this.isAccountDependent(item.key)) return;
		if (this.categoryFormOpen() && !this.categorySaving()) this.closeCategoryForm();
		if (this.accountFormOpen() && !this.accountSaving()) this.closeAccountForm();
		if (this.cardFormOpen() && !this.cardSaving()) this.closeCardForm();
		this.store.navigate(item.key);
		const activeAccountId = this.activeAccountId();
		const useAccountRoute = activeAccountId !== null && this.isAccountDependent(item.key);
		void this.router.navigate(useAccountRoute ? ["/account", activeAccountId, item.key] : item.key === "overview" ? ["/"] : [item.key]);
	}
	toggleUserMenu(): void {
		this.userMenuOpen.update((open) => !open);
	}
	logout(): void {
		this.userMenuOpen.set(false);
		this.auth.logout();
	}
	userInitials(): string {
		const name = this.authUser()?.nomeCompleto?.trim() ?? "Usuário";
		return (
			name
				.split(/\s+/)
				.slice(0, 2)
				.map((part) => part[0]?.toUpperCase() ?? "")
				.join("") || "US"
		);
	}
	@HostListener("document:click") closeUserMenu(): void {
		this.userMenuOpen.set(false);
	}
	@HostListener("document:keydown.escape") closeUserMenuOnEscape(): void {
		this.userMenuOpen.set(false);
	}
	selectOverview(selection: OverviewSelection): void {
		if (selection.type === "month") this.store.selectOverview(selection);
	}
	selectRecord(id: string): void {
		if (this.categorySaving()) return;
		if (this.categoryFormOpen()) this.closeCategoryForm();
		if (this.accountFormOpen()) this.closeAccountForm();
		if (this.cardFormOpen()) this.closeCardForm();
		const previousId = this.store.selectedId();
		this.store.selectRecord(id);
		if (this.cardSectionActive()) this.store.setCardTab("overview");
		if (this.active() === "categories" && previousId !== id) {
			this.store.setCategoryTab("overview");
		}
		const record = this.selectedRecord();
		if (record?.apiId && this.cardSectionActive() && record.cardType === "CREDITO")
			this.store.loadInvoices(record.apiId, this.currentPeriod());
		if (record?.apiId && this.active() === "categories")
			this.store.loadBudgets(record.apiId);
	}
	clearSelection(): void {
		this.store.selectRecord(null);
	}
	onQueryInput(event: Event): void {
		this.setQuery((event.target as HTMLInputElement).value);
	}
	setQuery(query: string): void {
		this.store.setQuery(query);
	}
	toggleCardTypeFilter(): void { this.cardTypeFilterOpen.update((open) => !open); }
	toggleCardType(type: string): void {
		const selected = new Set(this.selectedCardTypes());
		if (selected.has(type)) selected.delete(type);
		else selected.add(type);
		this.selectedCardTypes.set(selected);
	}
	setAccountTab(tab: "overview" | "movements" | "entries"): void {
		this.store.setAccountTab(tab);
		const record = this.selectedRecord();
		if (record?.apiId && tab !== "overview") {
			const period = this.currentPeriod();
			if (tab === "movements")
				this.store.loadAccountMovements(record.apiId, period);
			else this.store.loadAccountEntries(record.apiId, period);
		}
	}
	setCardTab(tab: "overview" | "invoices"): void {
		this.store.setCardTab(tab);
		const record = this.selectedRecord();
		if (record?.apiId && tab === "invoices") this.store.loadInvoices(record.apiId, this.currentPeriod());
	}
	setCategoryTab(tab: CategoryTab): void {
		this.store.setCategoryTab(tab);
		const record = this.selectedRecord();
		if (record?.apiId && tab === "budgets")
			this.store.loadBudgets(record.apiId);
	}
	sortLabel(): string {
		return {
			recent: "MAIS RECENTES",
			oldest: "MAIS ANTIGOS",
			higher: "MAIOR VALOR",
			lower: "MENOR VALOR",
			az: "NOME A–Z",
		}[this.store.filters().sort];
	}
	openModal(record?: FinanceRecord): void {
		if (this.active() === "categories" && !record) {
			this.openCategoryForm();
			return;
		}
		this.store.startEditing(record?.id ?? null);
		this.modalVisible.set(true);
		this.entryForm.reset({
			title: record?.title ?? "",
			amount: record?.amount ?? null,
			date: record?.date || null,
			category: record?.category ?? "",
			notes: record?.notes ?? "",
		});
	}
	closeModal(): void {
		this.modalVisible.set(false);
		this.store.startEditing(null);
	}
	save(): void {
		if (this.entryForm.invalid) return;
		const value = this.entryForm.getRawValue();
		if (value.amount === null || value.date === null) return;
		this.store.saveRecord({
			...value,
			amount: value.amount,
			date: value.date,
			title: value.title.trim(),
			category: value.category.trim(),
			notes: value.notes.trim(),
		});
		this.closeModal();
	}
	openMovementAside(): void {
		if (this.categoryFormOpen() && !this.categorySaving()) this.closeCategoryForm();
		this.store.clearError();
		this.movementAsideOpen.set(true);
		this.categoryPickerOpen.set(false);
		this.paymentPickerOpen.set(false);
		this.movementForm.reset({ type: "", amount: null, accountId: this.activeAccountId() ?? this.movementAccounts()[0]?.apiId ?? "", categoryId: "", method: "", date: "", description: "", recurring: false });
	}
	selectActiveAccount(accountId: string): void {
		this.store.setActiveAccountId(accountId || null);
		this.updateAccountUrl(accountId || null);
		if (this.movementAsideOpen()) this.movementForm.controls.accountId.setValue(accountId);
		if (accountId && this.active() === "accounts") this.store.selectRecord(accountId);
	}
	updateAccountUrl(accountId: string | null): void {
		if (accountId && this.isAccountDependent(this.active())) {
			void this.router.navigate(["/account", accountId, this.active()], { replaceUrl: true });
		} else {
			void this.router.navigate(this.active() === "overview" ? ["/"] : [this.active()], { replaceUrl: true });
		}
	}
	closeMovementAside(): void {
		if (!this.movementSaving()) {
			this.movementAsideOpen.set(false);
			this.categoryPickerOpen.set(false);
			this.paymentPickerOpen.set(false);
			this.movementForm.reset({ type: "", amount: null, accountId: "", categoryId: "", method: "", date: "", description: "", recurring: false });
		}
	}
	toggleCategoryPicker(): void { this.categoryPickerOpen.update((open) => !open); }
	selectMovementCategory(categoryId: string | undefined): void { if (!categoryId) return; this.movementForm.controls.categoryId.setValue(categoryId); this.movementForm.controls.categoryId.markAsTouched(); this.categoryPickerOpen.set(false); }
	clearMovementCategory(event: Event): void { event.stopPropagation(); this.movementForm.controls.categoryId.setValue(""); this.movementForm.controls.categoryId.markAsTouched(); this.categoryPickerOpen.set(false); }
	selectedMovementCategory(): FinanceRecord | null { const id = this.movementForm.controls.categoryId.value; return this.movementCategories().find((category) => category.apiId === id) ?? null; }
	togglePaymentPicker(): void { this.paymentPickerOpen.update((open) => !open); }
	selectMovementPayment(method: MovementMethod): void { this.movementForm.controls.method.setValue(method); this.movementForm.controls.method.markAsTouched(); this.paymentPickerOpen.set(false); }
	clearMovementPayment(event: Event): void { event.stopPropagation(); this.movementForm.controls.method.setValue(""); this.movementForm.controls.method.markAsTouched(); this.paymentPickerOpen.set(false); }
	selectedMovementPayment(): { value: MovementMethod; label: string; icon: string } | null { const method = this.movementForm.controls.method.value; return this.movementPaymentMethods.find((payment) => payment.value === method) ?? null; }
	saveMovement(): void {
		if (this.movementForm.invalid || this.movementSaving()) { this.movementForm.markAllAsTouched(); return; }
		const value = this.movementForm.getRawValue();
		if (!value.type || !value.method || value.amount === null) return;
		const body: MovementRequest = { valorTotal: value.type === "SAIDA" ? -Math.abs(value.amount) : Math.abs(value.amount), metodoPagamento: value.method, categoriaId: value.categoryId, ...(value.date ? { dataLancamento: value.date } : {}), ...(value.description.trim() ? { descricao: value.description.trim() } : {}), ehRecorrente: value.recurring };
		this.movementSaving.set(true);
		this.store.createMovement(value.accountId, body).subscribe({ next: (created) => { this.movementSaving.set(false); if (created) this.closeMovementAside(); }, error: () => this.movementSaving.set(false) });
	}
	openCategoryForm(): void {
		this.store.selectRecord(null);
		this.store.clearError();
		this.categoryFormOpen.set(true);
		this.categoryForm.reset({ name: "", type: "", color: "", icon: "" });
	}
	openAccountForm(): void {
		this.store.selectRecord(null);
		this.store.clearError();
		this.accountFormOpen.set(true);
		this.accountForm.reset({ bankName: "", creditTotal: 0, currentBalance: 0 });
	}
	openCardForm(): void {
		this.store.selectRecord(null);
		this.store.clearError();
		this.cardFormOpen.set(true);
		const type = this.active() === "cardCredit" ? "CREDITO" : this.active() === "cardDebit" ? "DEBITO" : this.active() === "cardVoucher" ? "VOUCHER" : "";
		this.cardForm.reset({ nickname: "", type, accountId: this.activeAccountId() ?? "", creditLimit: "", closingDay: null, dueDay: null, voucherType: "VA_VR", rechargeAmount: "", rechargeDay: null });
	}
	selectCardType(type: "CREDITO" | "DEBITO" | "VOUCHER"): void { this.cardForm.controls.type.setValue(type); this.cardForm.controls.type.markAsTouched(); }
	selectCardAccount(accountId: string | undefined): void { if (accountId) { this.cardForm.controls.accountId.setValue(accountId); this.cardForm.controls.accountId.markAsTouched(); } }
	selectCardVoucherType(type: "VA_VR" | "CREDITO_VOUNCHER"): void { this.cardForm.controls.voucherType.setValue(type); }
	isDueDayDisabled(day: number): boolean { const closingDay = this.cardForm.controls.closingDay.value; return closingDay !== null && day <= closingDay; }
	updateDueDayOptions(): void {
		const closingDay = this.cardForm.controls.closingDay.value;
		document.querySelectorAll<HTMLButtonElement>(".card-specific-fields .card-day-fieldset:nth-of-type(2) .card-day-options button").forEach((button, index) => {
			button.disabled = closingDay !== null && index + 1 <= closingDay;
		});
	}
	selectCardDay(control: "closingDay" | "dueDay" | "rechargeDay", day: number): void {
		if (control === "dueDay" && this.isDueDayDisabled(day)) return;
		this.cardForm.controls[control].setValue(day);
		this.cardForm.controls[control].markAsTouched();
		if (control === "closingDay") this.updateDueDayOptions();
		if (control === "closingDay" && this.cardForm.controls.dueDay.value !== null && this.cardForm.controls.dueDay.value <= day) {
			this.cardForm.controls.dueDay.setValue(null);
			this.cardForm.controls.dueDay.markAsTouched();
		}
	}
	formatCardMoney(event: Event, control: "creditLimit" | "rechargeAmount"): void {
		const input = event.target as HTMLInputElement;
		const digits = input.value.replace(/\D/g, "");
		const formatted = digits ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(digits) / 100) : "";
		this.cardForm.controls[control].setValue(formatted);
		input.value = formatted;
	}
	parseCardMoney(value: string): number | null { const digits = value.replace(/\D/g, ""); return digits ? Number(digits) / 100 : null; }
	closeCardForm(): void {
		if (!this.cardSaving()) {
			this.cardFormOpen.set(false);
			this.cardForm.reset({ nickname: "", type: "", accountId: "", creditLimit: "", closingDay: null, dueDay: null, voucherType: "VA_VR", rechargeAmount: "", rechargeDay: null });
		}
	}
	saveCard(): void {
		if (this.cardForm.invalid || this.cardSaving()) {
			this.cardForm.markAllAsTouched();
			return;
		}
		const value = this.cardForm.getRawValue();
		const type = value.type as CardRequest["tipoCartao"];
		const validDay = (day: number | null): day is number => day !== null && Number.isInteger(day) && day >= 1 && day <= 31;
		const creditLimit = this.parseCardMoney(value.creditLimit);
		const rechargeAmount = this.parseCardMoney(value.rechargeAmount);
		if (type === "CREDITO" && (creditLimit === null || creditLimit <= 0 || !validDay(value.closingDay) || !validDay(value.dueDay) || value.dueDay <= value.closingDay)) {
			this.cardForm.controls.creditLimit.markAsTouched();
			this.cardForm.controls.closingDay.markAsTouched();
			this.cardForm.controls.dueDay.markAsTouched();
			return;
		}
		if (type === "VOUCHER" && (rechargeAmount === null || rechargeAmount <= 0 || !validDay(value.rechargeDay))) {
			this.cardForm.controls.rechargeAmount.markAsTouched();
			this.cardForm.controls.rechargeDay.markAsTouched();
			return;
		}
		const request: CardRequest = { tipoCartao: type, contaBancariaId: value.accountId, apelido: value.nickname.trim() };
		if (type === "CREDITO") request.cartaoCredito = { limiteCredito: creditLimit!, diaFechamento: value.closingDay!, diaVencimento: value.dueDay! };
		if (type === "VOUCHER") request.cartaoVoucher = { tipoVoucher: value.voucherType as "VA_VR" | "CREDITO_VOUNCHER", valorRecarga: rechargeAmount!, diaRecarga: value.rechargeDay! };
		this.cardSaving.set(true);
		this.store.createCard(request).subscribe({ next: (created) => { this.cardSaving.set(false); if (created) this.closeCardForm(); }, error: () => this.cardSaving.set(false) });
	}
	openBudgetForm(): void {
		if (!this.selectedRecord()?.apiId) return;
		this.store.clearError();
		this.setCategoryTab("budgets");
		this.budgetFormOpen.set(true);
		this.budgetForm.reset({ limit: null });
	}
	closeBudgetForm(): void {
		if (!this.budgetSaving()) {
			this.budgetFormOpen.set(false);
			this.budgetForm.reset({ limit: null });
		}
	}
	saveBudget(): void {
		const categoryId = this.selectedRecord()?.apiId;
		if (!categoryId || this.budgetForm.invalid || this.budgetSaving()) {
			this.budgetForm.markAllAsTouched();
			return;
		}
		const value = this.budgetForm.getRawValue();
		if (value.limit === null) return;
		this.budgetSaving.set(true);
		const request: BudgetRequest = { valorLimite: value.limit };
		this.store.createBudget(categoryId, request).subscribe({
			next: (created) => {
				this.budgetSaving.set(false);
				if (created) this.closeBudgetForm();
			},
			error: () => this.budgetSaving.set(false),
		});
	}
	closeAccountForm(): void {
		if (!this.accountSaving()) {
			this.accountFormOpen.set(false);
			this.accountForm.reset({ bankName: "", creditTotal: 0, currentBalance: 0 });
		}
	}
	saveAccount(): void {
		if (this.accountForm.invalid || this.accountSaving()) {
			this.accountForm.markAllAsTouched();
			return;
		}
		const value = this.accountForm.getRawValue();
		this.accountSaving.set(true);
		this.store.createAccount({
			nomeDoBanco: value.bankName.trim(),
			creditoTotal: value.creditTotal,
			saldoCorrente: value.currentBalance,
		}).subscribe({
			next: (created) => {
				this.accountSaving.set(false);
				if (created) this.closeAccountForm();
			},
			error: () => this.accountSaving.set(false),
		});
	}
	closeCategoryForm(): void {
		if (!this.categorySaving()) {
			this.categoryFormOpen.set(false);
			this.categoryForm.reset({
				name: "",
				type: "",
				color: "",
				icon: "",
			});
		}
	}
	selectCategoryColor(color: string): void {
		this.categoryForm.controls.color.setValue(color);
		this.categoryForm.controls.color.markAsTouched();
	}
	saveCategory(): void {
		if (this.categoryForm.invalid || this.categorySaving()) {
			this.categoryForm.markAllAsTouched();
			return;
		}
		const value = this.categoryForm.getRawValue();
		if (!value.type) return;
		this.categorySaving.set(true);
		this.store
			.createCategory({
				nome: value.name.trim(),
				tipo: value.type,
				cor: value.color.trim(),
				icone: value.icon.trim(),
			})
			.subscribe({
				next: (created) => {
					this.categorySaving.set(false);
					if (created) this.closeCategoryForm();
				},
				error: () => this.categorySaving.set(false),
			});
	}
	deleteRecord(): void {
		if (window.confirm("Deseja realmente excluir este registro?"))
			this.store.deleteSelected();
	}
	money(value: number | undefined): string {
		return value === undefined
			? "Valor indisponível"
			: new Intl.NumberFormat("pt-BR", {
					style: "currency",
					currency: "BRL",
				}).format(value);
	}
	budgetProgress(
		current: number | undefined,
		limit: number | undefined,
	): number | null {
		if (current === undefined || limit === undefined || limit <= 0)
			return null;
		return Math.min(Math.max((current / limit) * 100, 0), 100);
	}
	budgetRemaining(
		current: number | undefined,
		limit: number | undefined,
	): number | undefined {
		return current !== undefined && limit !== undefined
			? limit - current
			: undefined;
	}
	monthReference(value: string | undefined): string {
		if (!value) return "Mês indisponível";
		const date = new Date(`${value}-01T12:00:00`);
		return Number.isNaN(date.getTime())
			? "Mês indisponível"
			: new Intl.DateTimeFormat("pt-BR", {
					month: "long",
					year: "numeric",
				}).format(date);
	}
	categoryIcon(record: FinanceRecord): string {
		const supported = new Set([
			"abc",
			"account_balance_wallet",
			"attach_money",
			"build",
			"category",
			"credit_card",
			"currency_exchange",
			"directions_car",
			"fastfood",
			"fitness_center",
			"flight",
			"health_and_safety",
			"home",
			"local_dining",
			"local_gas_station",
			"movie",
			"payments",
			"pets",
			"phone",
			"redeem",
			"restaurant",
			"savings",
			"school",
			"sell",
			"shopping_bag",
			"shopping_cart",
			"sports_esports",
			"subscriptions",
			"trending_up",
			"wifi",
			"work",
		]);
		return record.icon && supported.has(record.icon) ? record.icon : "sell";
	}
	categoryIconValue(value: string): string {
		return this.categoryIcon({
			icon: value,
			id: "",
			title: "",
			category: "",
			type: "expense",
		});
	}
	categoryColor(record: FinanceRecord): string {
		return record.color && /^#[0-9a-f]{6}$/i.test(record.color)
			? record.color
			: "#ed3114";
	}
	shortDate(value: string | undefined): string {
		if (this.cardSectionActive()) return "";
		if (!value) return "Data indisponível";
		return new Date(`${value}T12:00:00`)
			.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
			.replace(".", "");
	}
	fullDate(value: string | undefined): string {
		if (!value) return "Data indisponível";
		return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	}
	overviewLabel(): string {
		const selection = this.store.overviewSelection();
		return `${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(`${selection.value}-01T12:00:00`)).toUpperCase()} / ${selection.value.slice(0, 4)}`;
	}
	headerPeriod(): string {
		const value = this.store.overviewSelection().value;
		return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`)).toUpperCase();
	}
	private currentPeriod(): { dataInicial: string; dataFinal: string } {
		const month = this.store.overviewSelection().value;
		const [year, monthNumber] = month.split("-").map(Number);
		const lastDay = new Date(year, monthNumber, 0).getDate();
		return {
			dataInicial: `${month}-01`,
			dataFinal: `${month}-${String(lastDay).padStart(2, "0")}`,
		};
	}
	listRecordIcon(record: { type: string; category?: string }): string {
		if (this.cardSectionActive()) return record.category === "CREDITO" ? "credit_score" : record.category === "VOUCHER" ? "confirmation_number" : "payments";
		return this.active() === "accounts" ? "account_balance" : this.movementIcon(record);
	}

	movementIcon(record: { type: string }): string {
		return record.type === "income"
			? "↑"
			: record.type === "expense"
				? "↓"
				: "↕";
	}
	private toIso(value: Date): string {
		return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
	}
}
