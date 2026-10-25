import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CalendarViewComponent } from "../../shared/components/calendar-view.component";
import { MonthlyLineChartComponent } from "../../shared/components/monthly-line-chart.component";
import { FinanceRecordDetailComponent } from "./finance-record-detail.component";
import { FinanceStore } from "../../core/store/finance.store";
import { FinanceApiService } from "../../core/api/finance-api.service";
import { AuthService } from "../../core/auth/auth.service";
import {
  BankAccountResponse,
  BudgetRequest,
  CardRequest,
  CategoryType,
  DashboardInvoice,
  DashboardAccountSnapshot,
  InvestmentRequest,
  MovementMethod,
  MovementRequest,
} from "../../core/api/api.models";
import { navigation, sectionFromRouteSegment, sectionRouteSegments } from "../../core/models/finance.data";
import {
  CategoryTab,
  FinanceRecord,
  Filters,
  NavItem,
  OverviewSelection,
  SectionKey,
} from "../../core/models/finance.models";
import { FinanceHeaderComponent } from "../../layout/header/finance-header.component";
import { FinanceSidebarComponent } from "../../layout/sidebar/finance-sidebar.component";
import { CurrencyInputDirective } from "../../shared/directives/currency-input.directive";
import { DatePickerComponent } from "../../shared/components/date-picker.component";
import { TelegramSettingsComponent } from "./telegram-settings.component";
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
    CurrencyInputDirective,
    DatePickerComponent,
    TelegramSettingsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./finance-shell.component.scss",
  template: `
    <div class="app-shell">
      @if (
        store.loading() ||
        categorySaving() ||
        accountSaving() ||
        cardSaving() ||
        investmentSaving() ||
        budgetSaving() ||
        goalSaving() ||
        movementSaving()
      ) {
        <div
          class="resource-progress-bar"
          role="progressbar"
          aria-label="Processando recurso"
        ></div>
      }
      <app-finance-header
        [user]="authUser()"
        [period]="headerPeriod()"
        [initials]="userInitials()"
        [userMenuOpen]="userMenuOpen()"
        [accounts]="movementAccounts()"
        [activeAccountId]="activeAccountId() || ''"
        [createDisabled]="activeAccountId() === null"
        (create)="openMovementAside()"
        (accountPickerOpened)="loadAccountsForPicker()"
        (accountChange)="selectActiveAccount($event)"
        (toggleMenu)="toggleUserMenu()"
        (logout)="logout()"
      />
      <div class="app-layout">
        <app-finance-sidebar
          [navigation]="sidebarNavigation()"
          [activeKey]="active()"
          [transactionsCount]="transactionsCount()"
          [user]="authUser()"
          [initials]="userInitials()"
          [activeAccountTitle]="activeAccountTitle()"
          (navigate)="navigate($event)"
        />
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
                  <span class="nav-icon material-symbols-outlined">{{
                    item.icon
                  }}</span
                  ><span>{{ item.label }}</span>
                  @if (item.key === "transactions") {
                    <span class="nav-count">{{ transactionsCount() }}</span>
                  }
                  @if (item.children) {
                    <span class="material-symbols-outlined nav-chevron"
                      >expand_more</span
                    >
                  }
                </button>
                @if (item.children) {
                  <div class="nav-children">
                    @for (child of item.children; track child.key) {
                      <button
                        class="nav-subitem"
                        [class.active]="isActive(child)"
                        (click)="navigate(child)"
                      >
                        <span class="nav-icon material-symbols-outlined">{{
                          child.icon
                        }}</span
                        ><span>{{ child.label }}</span>
                        @if (child.children) {
                          <span class="material-symbols-outlined nav-chevron"
                            >expand_more</span
                          >
                        }
                      </button>
                      @if (child.children) {
                        <div class="nav-children">
                          @for (leaf of child.children; track leaf.key) {
                            <button
                              class="nav-subitem"
                              [class.active]="isActive(leaf)"
                              (click)="navigate(leaf)"
                            >
                              <span
                                class="nav-icon material-symbols-outlined"
                                >{{ leaf.icon }}</span
                              ><span>{{ leaf.label }}</span>
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
              <div><strong>Minha conta</strong><span>Plano pessoal</span></div>
              <span class="user-more material-symbols-outlined"
                >more_horiz</span
              >
            </div>
            <div class="sidebar-version">FinLaunch <span>v1.0</span></div>
          </div>
        </aside>
        <main
          class="content"
          [class.overview-layout]="active() === 'overview'"
          [class.telegram-layout]="active() === 'telegram'"
          [class.form-layout]="
            categoryFormOpen() ||
            accountFormOpen() ||
            cardFormOpen() ||
            budgetFormOpen() ||
            investmentFormOpen() ||
            goalFormOpen()
          "
        >
          @if (active() === "telegram") {
            <app-telegram-settings />
          }
          <section
            class="list-panel"
            [class.calendar-mode]="active() === 'overview'"
            [class.categories-mode]="active() === 'categories'"
            [class.accounts-mode]="active() === 'accounts'"
            [class.cards-mode]="cardSectionActive()"
            [class.statements-mode]="active() === 'statements'"
            [class.transactions-mode]="active() === 'statements' && statementMode() === 'transactions'"
            [class.investments-mode]="active() === 'investments'"
            [class.resource-list-revealed]="
              resourceRevealActive() && loadingTarget() === 'list'
            "
            [class.resource-list-loading]="
              resourceLoadingVisible() && loadingTarget() === 'list'
            "
          >
            @if (active() === "overview") {
              @if (resourceLoadingVisible() && loadingTarget() === "list") {
                <div
                  class="resource-loading list-resource-loading"
                  [class.resource-loading-active]="store.loading()"
                  role="status"
                  aria-live="polite"
                >
                  <span class="material-symbols-outlined">rocket_launch</span>
                  <strong>Carregando dashboard...</strong>
                </div>
              }
              <app-calendar-view
                [selection]="store.overviewSelection()"
                [availableMonths]="historicalPeriods()"
                (selected)="selectOverview($event)"
              />
            } @else {
              <div class="list-heading">
                <div>
                  <h1>{{ activeSection().title }}</h1>
                </div>
                @if (
                  active() === "categories" ||
                  active() === "accounts" ||
                  cardSectionActive() ||
                  active() === "investments" || active() === "goals"
                ) {
                  <button
                    class="reload-instance-icon"
                    type="button"
                    title="Recarregar registros"
                    aria-label="Recarregar registros"
                    (click)="reloadRecords()"
                  >
                    <span class="material-symbols-outlined">refresh</span>
                  </button>
                  <button
                    class="new-instance-icon"
                    type="button"
                    [title]="
                      active() === 'categories'
                        ? 'Nova categoria'
                        : active() === 'accounts'
                          ? 'Nova conta bancária'
                          : active() === 'investments'
                            ? 'Novo investimento'
                            : active() === 'goals'
                              ? 'Nova meta financeira'
                              : 'Novo cartao'
                    "
                    [attr.aria-label]="
                      active() === 'categories'
                        ? 'Nova categoria'
                        : active() === 'accounts'
                          ? 'Nova conta bancária'
                          : active() === 'investments'
                            ? 'Novo investimento'
                            : active() === 'goals'
                              ? 'Nova meta financeira'
                              : 'Novo cartao'
                    "
                    (click)="
                      active() === 'categories'
                        ? openCategoryForm()
                        : active() === 'accounts'
                          ? openAccountForm()
                          : active() === 'investments'
                            ? openInvestmentForm()
                            : active() === 'goals'
                              ? openGoalForm()
                              : openCardForm()
                    "
                  >
                    <span class="material-symbols-outlined">add</span>
                  </button>
                } @else if (active() !== "statements" && active() !== "transactions") {
                  <span class="item-counter"
                    >{{ filteredRecords().length }}
                    {{
                      filteredRecords().length === 1 ? "ITEM" : "ITENS"
                    }}</span
                  >
                }
              </div>
              @if (active() === "statements") {
                <div class="statement-search-options">
                  <button
                    type="button"
                    class="statement-search-card"
                    (click)="openStatementPanel('statements')"
                  >
                    <span class="statement-search-icon material-symbols-outlined"
                      >description</span
                    >
                    <span><strong>Buscar Registro de movimentações por período</strong></span>
                    <span class="material-symbols-outlined">chevron_right</span>
                  </button>
                  <button type="button" class="statement-search-card" (click)="openStatementPanel('transactions')">
                    <span class="statement-search-icon material-symbols-outlined">swap_vert</span>
                    <span><strong>Buscar Lançamentos por período</strong></span>
                    <span class="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              }
              <div class="list-tools">
                <div class="search">
                  <span class="material-symbols-outlined">search</span
                  ><input
                    type="search"
                    placeholder="Buscar registros..."
                    [value]="store.query()"
                    (input)="onQueryInput($event)"
                  />
                </div>
                @if (active() !== "statements" && active() !== "transactions") {
                  <button
                    class="filter-btn"
                    title="Filtros"
                    [class.active]="listFiltersOpen()"
                    [class.has-filters]="hasListFilters()"
                    [attr.aria-expanded]="listFiltersOpen()"
                    aria-label="Filtros da lista"
                    (click)="toggleListFilters()"
                  >
                    <span class="material-symbols-outlined">tune</span>
                  </button>
                }
              </div>
              @if (listFiltersOpen()) {
                <div class="list-filter-panel" role="group" aria-label="Filtros da lista">
                  <label class="list-filter-field">ORDENAR POR
                    <select [value]="store.filters().sort" (change)="updateListFilter('sort', $event)">
                      @for (option of listSortOptions(); track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                    </select>
                  </label>
                  @if (active() === "categories") {
                    <label class="list-filter-field">TIPO
                      <select [value]="store.filters().type" (change)="updateListFilter('type', $event)">
                        <option value="all">Todos</option>
                        <option value="income">Entrada</option>
                        <option value="expense">Saída</option>
                      </select>
                    </label>
                  }
                  @if (cardSectionActive()) {
                    <label class="list-filter-field">CONTA
                      <select [value]="store.filters().accountId" (change)="updateListFilter('accountId', $event)">
                        <option value="all">Todas as contas</option>
                        @for (account of movementAccounts(); track account.apiId) { <option [value]="account.apiId">{{ account.title }}</option> }
                      </select>
                    </label>
                  }
                  @if (active() === "goals") {
                    <label class="list-filter-field">ANDAMENTO
                      <select [value]="store.filters().goalStatus" (change)="updateListFilter('goalStatus', $event)">
                        <option value="all">Todas as metas</option>
                        <option value="inProgress">Em andamento</option>
                        <option value="complete">Concluídas</option>
                      </select>
                    </label>
                  }
                  @if (listCategoryOptions().length > 0) {
                    <label class="list-filter-field">{{ active() === "investments" ? "INVESTIMENTO" : active() === "goals" ? "META" : "CATEGORIA" }}
                      <select [value]="store.filters().category" (change)="updateListFilter('category', $event)">
                        <option value="all">Todos</option>
                        @for (option of listCategoryOptions(); track option) { <option [value]="option">{{ option }}</option> }
                      </select>
                    </label>
                  }
                  @if (active() === "investments" || active() === "goals" || active() === "budgets") {
                    <label class="list-filter-field">DATA INICIAL<input type="date" [value]="store.filters().from" (change)="updateListFilter('from', $event)" /></label>
                    <label class="list-filter-field">DATA FINAL<input type="date" [value]="store.filters().to" (change)="updateListFilter('to', $event)" /></label>
                  }
                  <button type="button" class="clear-list-filters" title="Limpar filtros" aria-label="Limpar filtros" [disabled]="!hasListFilters()" (click)="clearListFilters()"><span class="material-symbols-outlined">filter_alt_off</span></button>
                </div>
              }
              @if (cardSectionActive() && listFiltersOpen()) {
                <div
                  class="card-type-filter"
                  role="group"
                  aria-label="Filtrar por tipo de cartão"
                >
                  <span class="card-type-filter-heading">TIPO DE CARTÃO</span>
                  @for (type of cardTypes; track type.value) {
                    <button
                      type="button"
                      [class.selected]="selectedCardTypes().has(type.value)"
                      (click)="toggleCardType(type.value)"
                    >
                      <span class="material-symbols-outlined">{{
                        type.icon
                      }}</span
                      ><span>{{ type.label }}</span
                      ><span
                        class="material-symbols-outlined card-type-filter-check"
                        >{{
                          selectedCardTypes().has(type.value) ? "check" : ""
                        }}</span
                      >
                    </button>
                  }
                </div>
              }
              <div class="list-divider" aria-live="polite">
                <span></span
                ><strong
                  >{{ filteredRecords().length }}
                  {{
                    filteredRecords().length === 1 ? "registro" : "registros"
                  }}</strong
                ><span></span>
              </div>
              <div class="item-list">
                @if (resourceLoadingVisible() && loadingTarget() === "list") {
                  <div
                    class="resource-loading list-resource-loading"
                    [class.resource-loading-active]="store.loading()"
                    role="status"
                    aria-live="polite"
                  >
                    <span class="material-symbols-outlined">rocket_launch</span>
                  </div>
                }
                @for (record of filteredRecords(); track record.id) {
                  <button
                    class="record"
                    [class.record-created-pop]="createdRecordId() === record.id"
                    [class.selected]="store.selectedId() === record.id"
                    (click)="selectRecord(record.id)"
                  >
                    <span
                      class="record-icon"
                      [class.material-symbols-outlined]="
                        active() === 'accounts' ||
                        cardSectionActive() ||
                        active() === 'investments'
                      "
                      [class.income]="record.type === 'income'"
                      [style.backgroundColor]="
                        active() === 'categories' ? categoryColor(record) : null
                      "
                      >{{
                        active() === "categories"
                          ? categoryIcon(record)
                          : active() === "investments"
                            ? "monitoring"
                            : listRecordIcon(record)
                      }}</span
                    ><span class="record-main"
                      ><span class="record-title-line"
                        ><strong>{{ record.title }}</strong>
                        @if (active() === "categories") {
                          <span
                            class="category-list-type-tag"
                            [class.income]="record.type === 'income'"
                            [class.expense]="record.type === 'expense'"
                            [attr.aria-label]="
                              record.type === 'income' ? 'Entrada' : 'Saída'
                            "
                            [title]="
                              record.type === 'income' ? 'Entrada' : 'Saída'
                            "
                            ><span class="material-symbols-outlined">{{
                              record.type === "income"
                                ? "arrow_upward"
                                : "arrow_downward"
                            }}</span></span
                          >
                        }
                      </span>
                      @if (active() !== "categories") {
                        <span
                          >{{ record.category }} <b>·</b>
                          {{
                            active() === "accounts"
                              ? (record.movements?.length ?? 0) +
                                " movimentações"
                              : shortDate(record.date)
                          }}</span
                        >
                      }</span>
                    <span class="record-end"
                      ><strong [class.positive]="record.type === 'income'">
                        @if (active() !== "investments") {
                          {{ movementIcon(record) }}
                        }
                        {{
                          money(
                            active() === "investments" || active() === "goals"
                              ? record.currentAmount
                              : record.amount
                          )
                        }}</strong
                      ><small>{{ record.status ?? "Registrado" }}</small></span
                    >
                  </button>
                } @empty {
                  <div class="no-records">Nenhum registro encontrado.</div>
                }
              </div>
              <div class="list-footer">
                <span>{{ filteredRecords().length }} registros</span>
              </div>
            }
          </section>
          <section
            class="detail-panel"
            [class.account-list-only]="
              active() === 'accounts' && store.accountTab() !== 'overview'
            "
            [class.category-budget-active]="
              active() === 'categories' && store.categoryTab() === 'budgets'
            "
            [class.domain-detail-active]="
              selectedRecord() && active() !== 'categories'
            "
            [class.resource-detail-revealed]="
              resourceRevealActive() && loadingTarget() === 'detail'
            "
          >
            <div
              class="category-tabs domain-tabs"
              [class.visible]="false"
              role="tablist"
            >
              <button
                class="account-tab"
                [class.active]="store.categoryTab() === 'overview'"
                aria-label="Detalhes da categoria"
                title="Detalhes"
                (click)="setCategoryTab('overview')"
              >
                Visão geral</button
              ><button
                class="account-tab"
                [class.active]="store.categoryTab() === 'budgets'"
                aria-label="Orçamentos da categoria"
                title="Orçamentos"
                (click)="setCategoryTab('budgets')"
              >
                Orçamentos
              </button>
            </div>
            @if (
              active() === "categories" &&
              store.categoryTab() === "budgets" &&
              selectedRecord()
            ) {
              <div
                class="category-budget-panel"
                [class.resource-detail-loading]="
                  resourceLoadingVisible() && loadingTarget() === 'detail'
                "
              >
                @if (resourceLoadingVisible() && loadingTarget() === "detail") {
                  <div
                    class="resource-loading detail-resource-loading"
                    [class.resource-loading-active]="store.loading()"
                    role="status"
                    aria-live="polite"
                  >
                    <span class="material-symbols-outlined">rocket_launch</span>
                  </div>
                }
                @for (budget of categoryBudgets(); track budget.id) {
                  <div class="category-budget-row">
                    <div>
                      <strong>{{ monthReference(budget.date) }}</strong>
                    </div>
                    <div
                      class="budget-progress"
                      role="progressbar"
                      [attr.aria-valuenow]="budget.currentAmount ?? null"
                      [attr.aria-valuemax]="budget.amount ?? null"
                      aria-label="Consumo do orçamento"
                    >
                      <span
                        [style.width.%]="
                          budgetProgress(budget.currentAmount, budget.amount)
                        "
                      ></span>
                    </div>
                    <div class="category-budget-values">
                    <button type="button" class="outline-icon" aria-label="Editar orçamento" title="Editar orçamento" (click)="openBudgetForm(budget)"><span class="material-symbols-outlined">edit</span></button>
                      <span
                        >Consumido
                        <strong>{{ money(budget.currentAmount) }}</strong></span
                      >
                      <span
                        >Limite
                        <strong>{{ money(budget.amount) }}</strong></span
                      >
                    </div>
                  </div>
                } @empty {
                  <div class="no-records">
                    Nenhum orçamento cadastrado para esta categoria.
                  </div>
                }
              </div>
            }
            @if (active() === "categories" && categoryFormOpen()) {
              <div class="category-form-panel">
                <div class="category-form-heading">
                  <div><h2>{{ categoryEditingId() ? "Editar categoria" : "Nova categoria" }}</h2></div>
                  <button
                    type="button"
                    class="category-form-close"
                    aria-label="Fechar formulário"
                    (click)="closeCategoryForm()"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form
                  class="category-form"
                  [formGroup]="categoryForm"
                  (ngSubmit)="saveCategory()"
                >
                  <div class="category-form-grid">
                    <label
                      >Nome da categoria *<input
                        formControlName="name"
                        maxlength="80"
                        autocomplete="off"
                    /></label>
                    <fieldset class="category-type-fieldset">
                      <legend>Tipo *</legend>
                      <div class="category-type-options">
                        <label
                          class="category-type-option"
                          [class.selected]="
                            categoryForm.controls.type.value === 'ENTRADA'
                          "
                        >
                          <input
                            type="radio"
                            formControlName="type"
                            value="ENTRADA"
                          />
                          <span class="material-symbols-outlined"
                            >arrow_upward</span
                          ><span>Entrada</span>
                        </label>
                        <label
                          class="category-type-option"
                          [class.selected]="
                            categoryForm.controls.type.value === 'SAIDA'
                          "
                        >
                          <input
                            type="radio"
                            formControlName="type"
                            value="SAIDA"
                          />
                          <span class="material-symbols-outlined"
                            >arrow_downward</span
                          ><span>Saída</span>
                        </label>
                      </div>
                    </fieldset>
                    <fieldset class="category-color-fieldset">
                      <legend>Cor de identificação *</legend>
                      <div
                        class="category-color-palette"
                        role="radiogroup"
                        aria-label="Paleta de cores da categoria"
                      >
                        @for (color of categoryColors; track color) {
                          <button
                            type="button"
                            class="category-color-option"
                            [class.selected]="
                              categoryForm.controls.color.value === color
                            "
                            [style.backgroundColor]="color"
                            [attr.aria-label]="'Selecionar cor ' + color"
                            [attr.aria-pressed]="
                              categoryForm.controls.color.value === color
                            "
                            (click)="selectCategoryColor(color)"
                          ></button>
                        }
                      </div>
                    </fieldset>
                    <label
                      >Ícone *<input
                        class="category-icon-input"
                        formControlName="icon"
                        (input)="formatCategoryIconInput($event)"
                        maxlength="50"
                        placeholder="Nome do ícone Material Symbols"
                        autocomplete="off"
                    /></label>
                  </div>
                  <div class="category-icon-preview">
                    <span class="material-symbols-outlined">{{
                      categoryIconValue(categoryForm.controls.icon.value)
                    }}</span
                    ><span>Pré-visualização do ícone</span>
                  </div>
                  @if (
                    categoryForm.controls.name.touched &&
                    categoryForm.controls.name.invalid
                  ) {
                    <small class="field-error"
                      >Informe um nome com até 80 caracteres.</small
                    >
                  }
                  @if (
                    categoryForm.controls.type.touched &&
                    categoryForm.controls.type.invalid
                  ) {
                    <small class="field-error"
                      >Selecione o tipo da categoria.</small
                    >
                  }
                  @if (
                    categoryForm.controls.color.touched &&
                    categoryForm.controls.color.invalid
                  ) {
                    <small class="field-error"
                      >Informe uma cor hexadecimal no formato #RRGGBB.</small
                    >
                  }
                  @if (
                    categoryForm.controls.icon.touched &&
                    categoryForm.controls.icon.invalid
                  ) {
                    <small class="field-error"
                      >Informe o identificador do ícone.</small
                    >
                  }
                  @if (store.error(); as error) {
                    <div class="form-error">{{ error }}</div>
                  }
                  <div class="category-form-actions">
                    <button
                      type="button"
                      class="secondary-btn"
                      (click)="closeCategoryForm()"
                    >
                      <span class="material-symbols-outlined">close</span
                      >CANCELAR</button
                    ><button
                      type="submit"
                      class="primary-btn"
                      [disabled]="categoryForm.invalid || categorySaving()"
                    >
                      <span class="material-symbols-outlined">save</span
                      >{{
                        categorySaving()
                          ? "SALVANDO..."
                          : categoryEditingId()
                            ? "SALVAR ALTERAÇÕES"
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
                  <div><h2>{{ accountEditingId() ? "Editar conta" : "Nova conta bancária" }}</h2></div>
                  <button
                    type="button"
                    class="category-form-close"
                    aria-label="Fechar formulário"
                    (click)="closeAccountForm()"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form
                  class="category-form"
                  [formGroup]="accountForm"
                  (ngSubmit)="saveAccount()"
                >
                  <div class="category-form-grid">
                    <label
                      >Nome do banco *<input
                        formControlName="bankName"
                        maxlength="100"
                        autocomplete="organization"
                    /></label>
                    @if (!accountEditingId()) {
                    <label
                      >Crédito total *<input
                        appCurrencyInput
                        type="text"
                        formControlName="creditTotal"
                        inputmode="decimal"
                        placeholder="R$ 0,00"
                    /></label>
                    <label
                      >Saldo corrente *<input
                        appCurrencyInput
                        type="text"
                        formControlName="currentBalance"
                        inputmode="decimal"
                        placeholder="R$ 0,00"
                    /></label>
                    }
                  </div>
                  @if (
                    accountForm.controls.bankName.touched &&
                    accountForm.controls.bankName.invalid
                  ) {
                    <small class="field-error">Informe o nome do banco.</small>
                  }
                  @if (
                    accountForm.controls.creditTotal.touched &&
                    accountForm.controls.creditTotal.invalid
                  ) {
                    <small class="field-error"
                      >Informe um crédito total válido.</small
                    >
                  }
                  @if (
                    accountForm.controls.currentBalance.touched &&
                    accountForm.controls.currentBalance.invalid
                  ) {
                    <small class="field-error">Informe um saldo válido.</small>
                  }
                  @if (store.error(); as error) {
                    <div class="form-error">{{ error }}</div>
                  }
                  <div class="category-form-actions">
                    <button
                      type="button"
                      class="secondary-btn"
                      (click)="closeAccountForm()"
                    >
                      <span class="material-symbols-outlined">close</span
                      >CANCELAR
                    </button>
                    <button
                      type="submit"
                      class="primary-btn"
                      [disabled]="accountForm.controls.bankName.invalid || accountSaving()"
                    >
                      <span class="material-symbols-outlined">save</span
                      >{{ accountSaving() ? "SALVANDO..." : accountEditingId() ? "SALVAR ALTERAÇÕES" : "SALVAR CONTA" }}
                    </button>
                  </div>
                </form>
              </div>
            }
            @if (cardSectionActive() && cardFormOpen()) {
              <div class="category-form-panel">
                <div class="category-form-heading">
                  <div><h2>{{ cardEditingId() ? "Editar cartão" : "Novo cartão" }}</h2></div>
                  <button
                    type="button"
                    class="category-form-close"
                    aria-label="Fechar formulário"
                    (click)="closeCardForm()"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form
                  class="category-form card-form"
                  [formGroup]="cardForm"
                  (ngSubmit)="saveCard()"
                >
                  @if (!cardEditingId()) { <fieldset class="card-type-fieldset">
                    <legend>Tipo</legend>
                    <div class="card-type-options">
                      <button
                        type="button"
                        [class.selected]="
                          cardForm.controls.type.value === 'CREDITO'
                        "
                        (click)="selectCardType('CREDITO')"
                      >
                        <span class="material-symbols-outlined"
                          >credit_score</span
                        >Crédito</button
                      ><button
                        type="button"
                        [class.selected]="
                          cardForm.controls.type.value === 'DEBITO'
                        "
                        (click)="selectCardType('DEBITO')"
                      >
                        <span class="material-symbols-outlined">payments</span
                        >Débito</button
                      ><button
                        type="button"
                        [class.selected]="
                          cardForm.controls.type.value === 'VOUCHER'
                        "
                        (click)="selectCardType('VOUCHER')"
                      >
                        <span class="material-symbols-outlined"
                          >confirmation_number</span
                        >Voucher
                      </button>
                    </div>
                  </fieldset> }
                  <div class="card-account-readonly">
                    <span class="card-account-readonly-label"
                      >Conta bancária</span
                    >
                    <div>
                      <span class="card-account-icon material-symbols-outlined"
                        >account_balance</span
                      ><strong>{{ cardFormAccountTitle() }}</strong
                      ><span class="material-symbols-outlined">lock</span>
                    </div>
                  </div>
                  @if (!cardEditingId()) { <fieldset class="card-account-fieldset">
                    <legend>Conta bancária</legend>
                    <div class="card-account-options">
                      @for (
                        account of movementAccounts();
                        track account.apiId
                      ) {
                        <button
                          type="button"
                          [class.selected]="
                            cardForm.controls.accountId.value === account.apiId
                          "
                          (click)="selectCardAccount(account.apiId)"
                        >
                          <span
                            class="card-account-icon material-symbols-outlined"
                            >account_balance</span
                          ><span
                            ><strong>{{ account.title }}</strong
                            ><small>Conta bancária</small></span
                          ><span
                            class="material-symbols-outlined card-option-check"
                            >{{
                              cardForm.controls.accountId.value ===
                              account.apiId
                                ? "check"
                                : ""
                            }}</span
                          >
                        </button>
                      } @empty {
                        <span class="card-account-empty"
                          >Nenhuma conta bancária disponível.</span
                        >
                      }
                    </div>
                  </fieldset> }
                  <div class="category-form-grid card-main-fields">
                    <label
                      >Apelido *<input
                        formControlName="nickname"
                        maxlength="80"
                        autocomplete="off"
                        placeholder="Ex.: Cartão principal"
                    /></label>
                    <label
                      >Tipo *<select formControlName="type" [disabled]="!!cardEditingId()">
                        <option value="">Selecione o tipo</option>
                        <option value="CREDITO">Crédito</option>
                        <option value="DEBITO">Débito</option>
                        <option value="VOUCHER">Voucher</option>
                      </select></label
                    >
                    <label
                      >Conta bancária *<select formControlName="accountId" [disabled]="!!cardEditingId()">
                        <option value="">Selecione uma conta</option>
                        @for (
                          account of movementAccounts();
                          track account.apiId
                        ) {
                          <option [value]="account.apiId">
                            {{ account.title }}
                          </option>
                        }
                      </select></label
                    >
                  </div>
                  @if (cardForm.controls.type.value === "CREDITO") {
                    <div class="card-specific-divider"></div>
                    <div class="card-specific-fields">
                      <label class="card-money-field"
                        >Limite de crédito<input
                          type="text"
                          inputmode="decimal"
                          autocomplete="off"
                          [value]="cardForm.controls.creditLimit.value"
                          placeholder="R$ 0,00"
                          (input)="formatCardMoney($event, 'creditLimit')"
                      /></label>
                      <fieldset class="card-day-fieldset">
                        <legend>Dia de fechamento</legend>
                        <div class="card-day-options">
                          @for (day of cardDays; track day) {
                            <button
                              type="button"
                              [class.selected]="
                                cardForm.controls.closingDay.value === day
                              "
                              (click)="selectCardDay('closingDay', day)"
                            >
                              {{ day }}
                            </button>
                          }
                        </div>
                      </fieldset>
                      <fieldset class="card-day-fieldset">
                        <legend>Dia de vencimento</legend>
                        <div class="card-day-options">
                          @for (day of cardDays; track day) {
                            <button
                              type="button"
                              [class.selected]="
                                cardForm.controls.dueDay.value === day
                              "
                              (click)="selectCardDay('dueDay', day)"
                            >
                              {{ day }}
                            </button>
                          }
                        </div>
                      </fieldset>
                    </div>
                    <div class="category-form-grid">
                      <label
                        >Limite de crédito<input
                          type="number"
                          formControlName="creditLimit"
                          min="0.01"
                          step="0.01"
                          inputmode="decimal" /></label
                      ><label
                        >Dia de fechamento<input
                          type="number"
                          formControlName="closingDay"
                          min="1"
                          max="31"
                          step="1" /></label
                      ><label
                        >Dia de vencimento<input
                          type="number"
                          formControlName="dueDay"
                          min="1"
                          max="31"
                          step="1"
                      /></label>
                    </div>
                  }
                  @if (cardForm.controls.type.value === "VOUCHER") {
                    <div class="card-specific-fields">
                      <label class="card-money-field"
                        >Valor da recarga<input
                          type="text"
                          inputmode="decimal"
                          autocomplete="off"
                          [value]="cardForm.controls.rechargeAmount.value"
                          placeholder="R$ 0,00"
                          (input)="formatCardMoney($event, 'rechargeAmount')"
                      /></label>
                      <fieldset class="card-day-fieldset">
                        <legend>Dia da recarga</legend>
                        <div class="card-day-options">
                          @for (day of cardDays; track day) {
                            <button
                              type="button"
                              [class.selected]="
                                cardForm.controls.rechargeDay.value === day
                              "
                              (click)="selectCardDay('rechargeDay', day)"
                            >
                              {{ day }}
                            </button>
                          }
                        </div>
                      </fieldset>
                    </div>
                    <div class="card-specific-divider"></div>
                    <fieldset class="card-voucher-fieldset">
                      <legend>Tipo de voucher</legend>
                      <div class="card-voucher-options">
                        <button
                          type="button"
                          [class.selected]="
                            cardForm.controls.voucherType.value === 'VA_VR'
                          "
                          (click)="selectCardVoucherType('VA_VR')"
                        >
                          VA / VR</button
                        ><button
                          type="button"
                          [class.selected]="
                            cardForm.controls.voucherType.value ===
                            'CREDITO_VOUNCHER'
                          "
                          (click)="selectCardVoucherType('CREDITO_VOUNCHER')"
                        >
                          Crédito voucher
                        </button>
                      </div>
                    </fieldset>
                    <div class="category-form-grid">
                      <label
                        >Tipo de voucher<select formControlName="voucherType">
                          <option value="VA_VR">VA / VR</option>
                          <option value="CREDITO_VOUNCHER">
                            Crédito voucher
                          </option>
                        </select></label
                      ><label
                        >Valor da recarga<input
                          type="number"
                          formControlName="rechargeAmount"
                          min="0.01"
                          step="0.01"
                          inputmode="decimal" /></label
                      ><label
                        >Dia da recarga<input
                          type="number"
                          formControlName="rechargeDay"
                          min="1"
                          max="31"
                          step="1"
                      /></label>
                    </div>
                  }
                  @if (
                    cardForm.controls.nickname.touched &&
                    cardForm.controls.nickname.invalid
                  ) {
                    <small class="field-error"
                      >Informe o apelido do cartão.</small
                    >
                  }
                  @if (
                    cardForm.controls.accountId.touched &&
                    cardForm.controls.accountId.invalid
                  ) {
                    <small class="field-error"
                      >Selecione uma conta bancária.</small
                    >
                  }
                  @if (
                    cardForm.controls.type.touched &&
                    cardForm.controls.type.invalid
                  ) {
                    <small class="field-error"
                      >Selecione o tipo do cartão.</small
                    >
                  }
                  @if (store.error(); as error) {
                    <div class="form-error">{{ error }}</div>
                  }
                  <div class="category-form-actions">
                    <button
                      type="button"
                      class="secondary-btn"
                      (click)="closeCardForm()"
                    >
                      <span class="material-symbols-outlined">close</span
                      >CANCELAR</button
                    ><button
                      type="submit"
                      class="primary-btn"
                      [disabled]="cardForm.invalid || cardSaving()"
                    >
                      <span class="material-symbols-outlined">save</span
                      >{{ cardSaving() ? "SALVANDO..." : cardEditingId() ? "SALVAR ALTERACOES" : "SALVAR CARTAO" }}
                    </button>
                  </div>
                </form>
              </div>
            }
            @if (active() === "goals" && goalFormOpen()) {
              <div class="category-form-panel investment-form-panel">
                <div class="category-form-heading">
                  <div><h2>Nova meta financeira</h2></div>
                  <button type="button" class="category-form-close" aria-label="Fechar formulario" (click)="closeGoalForm()">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form class="category-form investment-form" [formGroup]="entryForm" (ngSubmit)="saveGoal()">
                  <div class="category-form-grid">
                    <label>Objetivo *<input formControlName="title" maxlength="255" required /></label>
                    <label>Valor alvo (R$) *<input appCurrencyInput formControlName="amount" type="text" inputmode="decimal" required /></label>
                    <label>Data prevista *<app-date-picker formControlName="date" ariaLabel="Data prevista para concluir a meta"></app-date-picker></label>
                  </div>
                  @if (entryForm.controls.title.touched && entryForm.controls.title.invalid) { <small class="field-error">Informe o objetivo da meta.</small> }
                  @if (entryForm.controls.amount.touched && entryForm.controls.amount.invalid) { <small class="field-error">Informe um valor alvo maior que zero.</small> }
                  @if (entryForm.controls.date.touched && entryForm.controls.date.invalid) { <small class="field-error">Informe a data prevista.</small> }
                  @if (store.error(); as error) { <div class="form-error" role="alert">{{ error }}</div> }
                  <div class="category-form-actions">
                    <button type="button" class="secondary-btn" (click)="closeGoalForm()"><span class="material-symbols-outlined">close</span>CANCELAR</button>
                    <button type="submit" class="primary-btn" [disabled]="entryForm.invalid || goalSaving()"><span class="material-symbols-outlined">save</span>{{ goalSaving() ? "SALVANDO..." : "SALVAR META" }}</button>
                  </div>
                </form>
              </div>
            }
            @if (active() === "investments" && investmentFormOpen()) {
              <div class="category-form-panel investment-form-panel">
                <div class="category-form-heading">
                  <div><h2>{{ investmentEditingId() ? "Editar investimento" : "Novo investimento" }}</h2></div>
                  <button
                    type="button"
                    class="category-form-close"
                    aria-label="Fechar formulário"
                    (click)="closeInvestmentForm()"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form
                  class="category-form investment-form"
                  [formGroup]="investmentForm"
                  (ngSubmit)="saveInvestment()"
                >
                  <div class="category-form-grid">
                    <label
                      >Nome do investimento *<input
                        formControlName="category"
                        maxlength="100"
                        autocomplete="off"
                        placeholder="Ex.: Tesouro Selic"
                        required /></label
                    ><label
                      >Juros ao mês (%) *<input
                        type="number"
                        formControlName="interestRate"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        placeholder="Ex.: 1,20"
                        required /></label
                    >@if (!investmentEditingId()) { <label
                      >Valor inicial<input
                        appCurrencyInput
                        type="text"
                        formControlName="initialAmount"
                        [readonly]="!!investmentEditingId()"
                        inputmode="decimal"
                        placeholder="R$ 0,00" /></label> }                    ><label
                      >Valor atual<input
                        appCurrencyInput
                        type="text"
                        formControlName="currentAmount"
                        inputmode="decimal"
                        placeholder="R$ 0,00"
                    /></label
                    ><label
                      >Data de início<app-date-picker
                        formControlName="startDate" [disabled]="!!investmentEditingId()" ariaLabel="Data de início"></app-date-picker></label>
                  </div>
                  @if (
                    investmentForm.controls.category.touched &&
                    investmentForm.controls.category.invalid
                  ) {
                    <small class="field-error"
                      >Informe o nome do investimento.</small
                    >
                  }
                  @if (
                    investmentForm.controls.interestRate.touched &&
                    investmentForm.controls.interestRate.invalid
                  ) {
                    <small class="field-error">Informe uma taxa válida.</small>
                  }
                  @if (store.error(); as error) {
                    <div class="form-error">{{ error }}</div>
                  }
                  <div class="category-form-actions">
                    <button
                      type="button"
                      class="secondary-btn"
                      (click)="closeInvestmentForm()"
                    >
                      <span class="material-symbols-outlined">close</span
                      >CANCELAR</button
                    ><button
                      type="submit"
                      class="primary-btn"
                      [disabled]="investmentForm.invalid || investmentSaving()"
                    >
                      <span class="material-symbols-outlined">save</span
                      >{{
                        investmentSaving()
                          ? "SALVANDO..."
                          : investmentEditingId() ? "SALVAR ALTERACOES" : "SALVAR INVESTIMENTO"
                      }}
                    </button>
                  </div>
                </form>
              </div>
            }
            @if (active() === "statements" && statementPanelOpen()) {
              <div class="statement-panel">
                <div class="statement-panel-heading">
                  <div>
                    <h2>
                      {{ statementMode() === "transactions" ? "Lançamentos do banco" : "Registro de movimentações do banco" }}
                      <span class="accent">{{ activeAccountTitle() }}</span>
                    </h2>
                  </div>
                  <button
                    type="button"
                    class="category-form-close"
                    aria-label="Fechar consulta"
                    (click)="closeStatementPanel()"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
                @if (store.loading() && !statementDetailLoading() && !statementDetail()) {
                  <div class="resource-loading statement-detail-resource-loading" [class.resource-loading-active]="store.loading()">
                    <span class="material-symbols-outlined">rocket_launch</span>
                    <strong>Carregando...</strong>
                  </div>
                } @else if (statementDetailLoading()) {
                  <div class="resource-loading statement-detail-resource-loading" [class.resource-loading-active]="store.loading()">
                    <span class="material-symbols-outlined">rocket_launch</span>
                    <strong>Carregando...</strong>
                  </div>
                } @else if (statementDetail(); as detail) {
                  <div class="statement-detail-page statement-detail-revealed">
                    <div class="statement-detail-heading">
                      <div class="statement-row-icon" [class.income]="detail.type === 'income'"><span class="material-symbols-outlined">{{ detail.type === 'income' ? 'arrow_upward' : 'arrow_downward' }}</span></div>
                      <div><h3>{{ detail.title }}</h3></div>
                      @if (detail.apiId) { <button type="button" class="statement-detail-edit" aria-label="Editar descricao" title="Editar descricao" (click)="openModal(detail)"><span class="material-symbols-outlined">edit</span></button> }
                      @if (detail.apiId) { <button type="button" class="secondary-btn" (click)="toggleMovementRecurrence(detail)">{{ detail.recurring ? "CANCELAR RECORRÊNCIA" : "ATIVAR RECORRÊNCIA" }}</button> }
                      <button type="button" class="statement-detail-close" aria-label="Fechar detalhes do registro" title="Fechar" (click)="closeMovementDetail()"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="statement-detail-metrics">
                      <div><span>VALOR</span><strong [class.positive]="detail.type === 'income'">{{ money(detail.amount) }}</strong></div>
                      <div><span>DATA</span><strong>{{ fullDate(detail.date) }}</strong></div>
                      <div><span>MÉTODO</span><strong>{{ statementPaymentLabel(detail.method) }}</strong></div>
                      <div><span>CATEGORIA</span><strong>{{ detail.category || 'Não informada' }}</strong></div>
                      <div><span>RECORRÊNCIA</span><strong>{{ detail.recurring ? 'Recorrente' : 'Avulsa' }}</strong></div>
                      @if (detail.installments) { <div><span>PARCELAS</span><strong>{{ detail.installments }}</strong></div> }
                      @if (detail.nextRecurrence) { <div><span>PRÓXIMA RECORRÊNCIA</span><strong>{{ fullDate(detail.nextRecurrence) }}</strong></div> }
                    </div>
                    @if (detail.notes) { <div class="statement-detail-description"><span>DESCRIÇÃO</span><p>{{ detail.notes }}</p></div> }
                  </div>
                } @else {
                <form
                  class="statement-period-form"
                  [formGroup]="statementPeriodForm"
                  (ngSubmit)="searchStatement()"
                >
                  <label
                    >Data inicial *<input class="calendar-date-input" type="date" formControlName="from" /></label
                  ><label
                    >Data final *<input class="calendar-date-input" type="date" formControlName="to" /></label
                  ><button
                    type="submit"
                    class="primary-btn"
                    [disabled]="statementPeriodForm.invalid || store.loading()"
                  >
                    <span class="material-symbols-outlined">search</span
                    >{{ statementMode() === "transactions" ? "CONSULTAR LANÇAMENTOS" : "CONSULTAR REG. MOVIMENTAÇÕES" }}
                  </button>
                </form>
                <div class="statement-period-presets" aria-label="Períodos rápidos">
                  <span>Períodos rápidos</span>
                  <button type="button" (click)="applyStatementPeriodPreset('current')">Este mês</button>
                  <button type="button" (click)="applyStatementPeriodPreset('previous3')">Últimos 3 meses</button>
                  <button type="button" (click)="applyStatementPeriodPreset('previous6')">Últimos 6 meses</button>
                  <button type="button" (click)="applyStatementPeriodPreset('next3')">Próximos 3 meses</button>
                  <button type="button" (click)="applyStatementPeriodPreset('next6')">Próximos 6 meses</button>
                  <button type="button" (click)="applyStatementPeriodPreset('next12')">Próximos 12 meses</button>
                </div>
                @if (
                  statementPeriodForm.value.from &&
                  statementPeriodForm.value.to &&
                  statementPeriodForm.value.from > statementPeriodForm.value.to
                ) {
                  <small class="field-error statement-period-error"
                    >A data inicial deve ser anterior ou igual à data
                    final.</small
                  >
                }
                <div class="statement-results-divider">
                  <span></span
                  ><strong
                    >{{ periodSearchRecords().length }}
                    {{
                      periodSearchRecords().length === 1 ? "registro" : "registros"
                    }}</strong
                  ><span></span>
                </div>
                <div class="statement-list">
                  @for (item of periodSearchRecords(); track item.id) {
                    <div class="statement-row" role="button" tabindex="0" (click)="openMovementDetail(item)" (keydown.enter)="openMovementDetail(item)">
                      <div
                        class="statement-row-icon"
                        [class.income]="item.type === 'income'"
                      >
                        <span class="material-symbols-outlined">{{
                          item.type === "income"
                            ? "arrow_upward"
                            : "arrow_downward"
                        }}</span>
                      </div>
                      <div class="statement-row-main">
                        <strong>{{ item.title }}</strong
                        ><small
                          >{{ item.category }} ·
                          {{ fullDate(item.date) }}</small
                        >
                      </div>
                      <strong
                        class="statement-row-amount"
                        [class.positive]="item.type === 'income'"
                        >{{ money(item.amount) }}</strong
                      >
                    </div>
                  } @empty {
                    <div class="statement-empty">
                      Informe um período e consulte as movimentações para visualizar os
                      movimentações.
                    </div>
                  }
                </div>
                <div class="statement-contract-list">
                  @for (item of periodSearchRecords(); track item.id) {
                    <div class="statement-contract-card" role="button" tabindex="0" (click)="openMovementDetail(item)" (keydown.enter)="openMovementDetail(item)">
                      <div
                        class="statement-row-icon"
                        [class.income]="item.type === 'income'"
                      >
                        <span class="material-symbols-outlined">{{
                          item.type === "income"
                            ? "arrow_upward"
                            : "arrow_downward"
                        }}</span>
                      </div>
                      <div class="statement-row-main">
                        <strong>{{ item.title }}</strong
                        ><small
                          >{{ fullDate(item.date) }}</small
                        >
                      </div>
                      <strong
                        class="statement-row-amount"
                        [class.positive]="item.type === 'income'"
                        >{{ money(item.amount) }}</strong
                      >
                    </div>
                  }
                </div>
                @if (periodSearchRecords().length === 0) {
                  <div class="statement-empty">
                    Informe um periodo e consulte as movimentacoes para visualizar os
                    movimentacoes.
                  </div>
                }
                }
              </div>
            } @else if (selectedRecord(); as record) {
              @if (active() !== "categories") {
                @if (invoiceDetail(); as invoice) {
                  <div class="invoice-detail-page">
                    <div class="invoice-detail-header">
                      <div class="invoice-detail-icon"><span class="material-symbols-outlined">receipt_long</span></div>
                      <div><h2>{{ invoice.title }}</h2></div>
                      <button type="button" class="invoice-detail-close" (click)="closeInvoiceDetail()" aria-label="Fechar detalhes da fatura" title="Fechar">
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                    <div class="invoice-detail-heading"><span class="material-symbols-outlined">description</span><strong>Detalhes da fatura</strong></div>
                    <div class="invoice-detail-metrics">
                      <div><span>VALOR TOTAL</span><strong>{{ money(invoice.amount) }}</strong></div>
                      <div><span>STATUS</span><strong>{{ invoice.status ?? "Status indisponivel" }}</strong></div>
                      <div><span>REFERENCIA</span><strong>{{ monthReference(invoice.date) }}</strong></div>
                      @if (invoice.paidDate) {
                        <div><span>DATA DE PAGAMENTO</span><strong>{{ shortDate(invoice.paidDate) }}</strong></div>
                      }
                      @if (invoice.paidAmount !== undefined) {
                        <div><span>VALOR PAGO</span><strong>{{ money(invoice.paidAmount) }}</strong></div>
                      }
                    </div>
                    @if (invoice.status !== "PAGA" && invoice.apiId) {
                      <div class="invoice-payment-action">
                        <div>
                          <strong>Pagamento da fatura</strong>
                          <small>O valor de {{ money(invoice.amount) }} será debitado da conta vinculada.</small>
                        </div>
                        <button type="button" class="invoice-payment-button" (click)="payInvoice(invoice.apiId)" [disabled]="store.loading()" [attr.aria-busy]="store.loading()">
                          <span class="material-symbols-outlined">payments</span>
                          {{ store.loading() ? "PROCESSANDO..." : "PAGAR FATURA" }}
                        </button>
                      </div>
                    }
                    <div class="invoice-detail-heading"><span class="material-symbols-outlined">list_alt</span><strong>Lançamentos da fatura</strong></div>
                    <div class="invoice-detail-movements">
                      @for (movement of invoice.movements ?? []; track movement.title + movement.date) {
                        <div class="invoice-detail-movement">
                          <small class="invoice-detail-movement-date">{{ dateReference(movement.date) }}</small>
                          <div>
                            <strong>{{ movement.title }}</strong>
                          </div>
                          <b [class.positive]="movement.type === 'income'">{{ money(movement.amount) }}</b>
                        </div>
                      } @empty {
                        <div class="invoice-detail-empty">Nenhum lançamento nesta fatura.</div>
                      }
                    </div>
                  </div>
                } @else {
                  <app-finance-record-detail
                    [section]="active()"
                    [record]="record"
                    (editRecord)="openModal($event)"
                    [loading]="
                      resourceLoadingVisible() && loadingTarget() === 'detail'
                    "
                    [loadingActive]="store.loading()"
                    [reveal]="
                      resourceRevealActive() && loadingTarget() === 'detail'
                    "
                    [accountTab]="store.accountTab()"
                    (accountTabChange)="setAccountTab($event)"
                    [entryPeriod]="entryPeriodForm.getRawValue()"
                    (entryPeriodChange)="updateEntryPeriod($event)"
                    (entrySearch)="searchAccountEntries()"
                    [cardTab]="store.cardTab()"
                    [invoices]="store.sections().invoices.records"
                    [invoiceMonth]="invoiceMonth()"
                    [invoicePeriod]="invoicePeriodForFilter()"
                    (cardTabChange)="setCardTab($event)"
                    (invoiceMonthChange)="setInvoiceMonth($event)"
                    (invoicePreset)="applyInvoicePeriodPreset($event)"
                    (invoicePeriodChange)="setInvoicePeriod($event)"
                    (invoiceSearch)="searchInvoices()"
                    (invoiceSelect)="openInvoiceDetail($event)"
                  />
                }
              }
              @if (active() === "categories") {
                <div class="category-detail-view">
                  <div
                    class="category-detail-header"
                    [style.--category-color]="categoryColor(record)"
                  >
                    <div class="category-detail-icon">
                      <span class="material-symbols-outlined">{{
                        categoryIcon(record)
                      }}</span>
                    </div>
                    <div class="category-detail-heading">
                      <div class="category-name-block">
                        <h2>{{ record.title }}</h2>
                        @if (record.budget; as budget) {
                          <small class="category-reference">{{
                            monthReference(budget.month)
                          }}</small>
                        }
                      </div>
                      <span
                        class="category-type-tag"
                        [class.income]="record.type === 'income'"
                        [class.expense]="record.type === 'expense'"
                        ><span class="material-symbols-outlined">{{
                          record.type === "income"
                            ? "arrow_upward"
                            : "arrow_downward"
                        }}</span
                        >{{
                          record.type === "income" ? "ENTRADA" : "SAÍDA"
                        }}</span
                      >
                    </div>
                    <div class="category-detail-actions">
                      <button
                        type="button"
                        class="category-detail-close"
                        aria-label="Editar categoria"
                        title="Editar categoria"
                        (click)="editCategory(record)"
                      >
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        type="button"
                        class="category-detail-close"
                        aria-label="Fechar detalhes da categoria"
                        title="Fechar"
                        (click)="clearSelection()"
                      >
                        <span class="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>
                  <div class="category-tabs domain-tabs visible" role="tablist">
                    <button
                      class="account-tab"
                      [class.active]="store.categoryTab() === 'overview'"
                      aria-label="Detalhes da categoria"
                      title="Detalhes"
                      (click)="setCategoryTab('overview')"
                    >
                      Visão geral
                    </button>
                    <button
                      class="account-tab"
                      [class.active]="store.categoryTab() === 'budgets'"
                      aria-label="Orçamentos da categoria"
                      title="Orçamentos"
                      (click)="setCategoryTab('budgets')"
                    >
                      Orçamentos
                    </button>
                  </div>
                  @if (store.categoryTab() === "budgets") {
                    <div
                      class="category-budget-panel category-budget-panel-inline"
                    >
                      <div class="category-budget-toolbar">
                        <strong>Orçamentos</strong>
                        @if (!hasCurrentBudget() && !budgetFormOpen()) {
                          <button
                            type="button"
                            class="primary-btn"
                            (click)="openBudgetForm()"
                          >
                            <span class="material-symbols-outlined">add</span
                            >CRIAR ORÇAMENTO
                          </button>
                        }
                      </div>
                      @if (budgetFormOpen()) {
                        <div class="category-form-panel budget-form-panel">
                          <div class="category-form-heading">
                            <div><h2>{{ budgetEditingId() ? "Editar orçamento" : "Novo orçamento" }}</h2></div>
                            <button
                              type="button"
                              class="category-form-close"
                              aria-label="Fechar formulário"
                              (click)="closeBudgetForm()"
                            >
                              <span class="material-symbols-outlined"
                                >close</span
                              >
                            </button>
                          </div>
                          <form
                            class="category-budget-form category-form"
                            [formGroup]="budgetForm"
                            (ngSubmit)="saveBudget()"
                          >
                            <label
                              >VALOR LIMITE *<input
                                appCurrencyInput
                                type="text"
                                inputmode="decimal"
                                formControlName="limit"
                                placeholder="R$ 0,00"
                            /></label>
                            @if (
                              budgetForm.controls.limit.invalid &&
                              budgetForm.controls.limit.touched
                            ) {
                              <span class="field-error"
                                >Informe um valor limite válido.</span
                              >
                            }
                            <div class="category-form-actions">
                              <button
                                type="button"
                                class="secondary-btn"
                                (click)="closeBudgetForm()"
                              >
                                <span class="material-symbols-outlined"
                                  >close</span
                                >CANCELAR</button
                              ><button
                                type="submit"
                                class="primary-btn"
                                [disabled]="
                                  budgetForm.invalid || budgetSaving()
                                "
                              >
                                <span class="material-symbols-outlined"
                                  >save</span
                                >{{
                                  budgetSaving()
                                    ? "SALVANDO..."
                                    : budgetEditingId() ? "SALVAR ALTERACOES" : "SALVAR ORCAMENTO"
                                }}
                              </button>
                            </div>
                          </form>
                        </div>
                      }
                      @for (budget of categoryBudgets(); track budget.id) {
                        <div class="category-budget-row">
                          <div>
                            <strong>{{ monthReference(budget.date) }}</strong>
                          </div>
                          <div
                            class="budget-progress"
                            role="progressbar"
                            [attr.aria-valuenow]="budget.currentAmount ?? null"
                            [attr.aria-valuemax]="budget.amount ?? null"
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
                    <button type="button" class="outline-icon" aria-label="Editar orçamento" title="Editar orçamento" (click)="openBudgetForm(budget)"><span class="material-symbols-outlined">edit</span></button>
                            <span
                              >Consumido
                              <strong>{{
                                money(budget.currentAmount)
                              }}</strong></span
                            ><span
                              >Limite
                              <strong>{{ money(budget.amount) }}</strong></span
                            >
                          </div>
                        </div>
                      } @empty {
                        <div class="no-records">
                          Nenhum orçamento cadastrado para esta categoria.
                        </div>
                      }
                    </div>
                  }
                  <div class="category-budget-section">
                    <div class="category-section-title">
                      @if (!hasCurrentBudget() && !budgetFormOpen()) {
                        <button
                          type="button"
                          class="category-budget-create"
                          (click)="openBudgetForm()"
                        >
                          <span class="material-symbols-outlined">add</span
                          >CRIAR ORÇAMENTO
                        </button>
                      }
                      <span class="material-symbols-outlined">payments</span
                      ><strong>Orçamento</strong>
                    </div>
                    @if (record.budget; as budget) {
                      <div class="category-budget-meter">
                        <div class="category-budget-meter-labels">
                          <span
                            ><strong>{{
                              money(budget.currentAmount)
                            }}</strong></span
                          ><span
                            ><strong>{{ money(budget.amount) }}</strong></span
                          >
                        </div>
                        <div
                          class="category-budget-progress"
                          role="progressbar"
                          [attr.aria-valuenow]="budget.currentAmount ?? null"
                          [attr.aria-valuemax]="budget.amount ?? null"
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
                        <div class="category-budget-meter-footer">
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
                      <div class="category-empty-state">
                        @if (!hasCurrentBudget() && !budgetFormOpen()) {
                          <button
                            type="button"
                            class="category-empty-create"
                            (click)="openBudgetForm()"
                          >
                            <span class="material-symbols-outlined">add</span
                            >CRIAR ORÇAMENTO
                          </button>
                        }
                        Esta categoria não possui orçamento cadastrado.
                      </div>
                    }
                  </div>
                </div>
              }
              @if (active() !== "categories") {
                <div class="detail-top">
                  <span class="detail-view-title">DETALHES</span>
                  <div class="detail-actions">
                    <button
                      class="outline-icon"
                      aria-label="Fechar registro"
                      (click)="clearSelection()"
                    >
                      ×</button
                    >@if (active() !== "budgets" && active() !== "transactions" && active() !== "invoices") { <button
                      type="button"
                      class="outline-icon"
                      aria-label="Editar registro"
                      title="Editar registro"
                      (click)="openModal(record)"
                    ><span class="material-symbols-outlined">edit</span></button> }                    ><button
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
                      [class.active]="store.accountTab() === 'overview'"
                      (click)="setAccountTab('overview')"
                    >
                      Principal</button
                    ><button
                      class="account-tab"
                      [class.active]="store.accountTab() === 'movements'"
                      (click)="setAccountTab('movements')"
                    >
                      Registros de movimentação</button
                    ><button
                      class="account-tab"
                      [class.active]="store.accountTab() === 'entries'"
                      (click)="setAccountTab('entries')"
                    >
                      Lançamentos
                    </button>
                  </div>
                }
                @if (
                  active() === "accounts" && store.accountTab() !== "overview"
                ) {
                  <div class="detail-body account-movements-active">
                    <div class="content-section-title account-movements-title">
                      <span>{{
                        store.accountTab() === "entries"
                          ? "REGISTROS DE LANÇAMENTOS"
                          : "REGISTROS DE MOVIMENTAÇÃO"
                      }}</span
                      ><span class="title-line"></span>
                    </div>
                    <div class="account-movements-list">
                      @for (
                        movement of record.movements ?? [];
                        track movement.title + movement.date
                      ) {
                        <div class="account-movement">
                          <span
                            class="record-icon"
                            [class.income]="movement.type === 'income'"
                            >{{ movementIcon(movement) }}</span
                          >
                          <div>
                            <strong>{{ movement.title }}</strong
                            ><small
                              >{{ movement.category }} ·
                              {{ shortDate(movement.date) }}</small
                            >
                          </div>
                          <b [class.positive]="movement.type === 'income'"
                            >{{ movementIcon(movement) }}
                            {{ money(movement.amount) }}</b
                          >
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="detail-hero">
                    <span class="detail-type"
                      >{{ activeSection().singular | uppercase }}
                      <span
                        >/ #{{ record.id.toString().padStart(4, "0") }}</span
                      >
                    </span>
                    <h2>{{ record.title }}</h2>
                    <div class="detail-total">
                      <span>VALOR REGISTRADO</span>
                      <div
                        class="detail-amount"
                        [class.positive]="record.type === 'income'"
                      >
                        {{ movementIcon(record) }} {{ money(record.amount) }}
                      </div>
                    </div>
                    <span class="status-pill"
                      ><span></span> {{ record.status ?? "REGISTRADO" } }</span
                    >
                  </div>
                  <div class="detail-body">
                    <div class="content-section-title">
                      <span>DETALHES DO REGISTRO</span
                      ><span class="title-line"></span>
                    </div>
                    @if (
                      active() === "categories" && record.budget;
                      as budget
                    ) {
                      <div class="category-budget-detail">
                        <div class="category-budget-detail-head">
                          <span>ORÇAMENTO PRINCIPAL</span
                          ><strong
                            >{{ money( budget.currentAmount ) } }
                            <small>de {{ money(budget.amount) }}</small></strong
                          >
                        </div>
                        <div
                          class="budget-progress"
                          role="progressbar"
                          [attr.aria-valuenow]="budget.currentAmount ?? null"
                          [attr.aria-valuemax]="budget.amount ?? null"
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
                        <small class="category-budget-month"
                          >{{ fullDate(budget.month) } }</small
                        >
                      </div>
                    }
                    <div class="details-grid">
                      <div class="detail-field">
                        <span>CATEGORIA</span
                        ><strong>{{ record.category }}</strong>
                      </div>
                      <div class="detail-field">
                        <span>DATA DO REGISTRO</span
                        ><strong>{{ fullDate(record.date) }}</strong>
                      </div>
                      <div class="detail-field">
                        <span>{{
                          record.method ? "MÉTODO / TIPO" : "IDENTIFICADOR"
                        }}</span
                        ><strong>{{
                          record.method ??
                            "#" + record.id.toString().padStart(4, "0")
                        }}</strong>
                      </div>
                      <div class="detail-field">
                        <span>{{
                          record.account ? "CONTA VINCULADA" : "SITUAÇÃO"
                        }}</span
                        ><strong>{{
                          record.account ?? record.status ?? "Ativo"
                        }}</strong>
                      </div>
                    </div>
                    <div class="content-section-title notes-title">
                      <span>OBSERVAÇÕES</span><span class="title-line"></span>
                    </div>
                    <div class="note-box">
                      {{ record.notes ?? "Nenhuma observação adicionada." }}
                    </div>
                  </div>
                }
              }
            } @else if (active() === "overview") {
              <div class="dashboard" [class.dashboard-resource-detail-loading]="resourceLoadingVisible() && loadingTarget() === 'detail'" [attr.data-overview-tab]="overviewTab()">
                @if (resourceLoadingVisible() && loadingTarget() === "detail") {
                  <div
                    class="resource-loading dashboard-detail-resource-loading"
                    [class.resource-loading-active]="store.loading()"
                    role="status"
                    aria-live="polite"
                  >
                    <span class="material-symbols-outlined">rocket_launch</span>
                    <strong>Carregando dashboard...</strong>
                  </div>
                }
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
                    <span class="dash-kicker">RESUMO FINANCEIRO</span>
                    <h2>Dashboard<span class="accent">.</span></h2>
                  </div>
                  <span class="dashboard-month">{{ dashboardMonthLabel() }}</span>
                </div>
                <div class="domain-tabs overview-tabs" role="tablist" aria-label="Seções do dashboard">
                  <button type="button" [class.active]="overviewTab() === 'summary'" [attr.aria-selected]="overviewTab() === 'summary'" role="tab" (click)="setOverviewTab('summary')">Resumo</button>
                  <button type="button" [class.active]="overviewTab() === 'invoices'" [attr.aria-selected]="overviewTab() === 'invoices'" role="tab" (click)="setOverviewTab('invoices')">Faturas</button>
                  <button type="button" [class.active]="overviewTab() === 'budgets'" [attr.aria-selected]="overviewTab() === 'budgets'" role="tab" (click)="setOverviewTab('budgets')">Orçamentos</button>
                  <button type="button" [class.active]="overviewTab() === 'movements'" [attr.aria-selected]="overviewTab() === 'movements'" role="tab" (click)="setOverviewTab('movements')">Movimentações</button>
                  <button type="button" [class.active]="overviewTab() === 'accounts'" [attr.aria-selected]="overviewTab() === 'accounts'" role="tab" (click)="setOverviewTab('accounts')">Contas</button>
                  <button type="button" [class.active]="overviewTab() === 'entries'" [attr.aria-selected]="overviewTab() === 'entries'" role="tab" (click)="setOverviewTab('entries')">Lançamentos</button>
                  <button type="button" [class.active]="overviewTab() === 'investments'" [attr.aria-selected]="overviewTab() === 'investments'" role="tab" (click)="setOverviewTab('investments')">Investimentos</button>
                  <button type="button" [class.active]="overviewTab() === 'goals'" [attr.aria-selected]="overviewTab() === 'goals'" role="tab" (click)="setOverviewTab('goals')">Metas</button>
                </div>
                <div class="overview-summary-content">
                @if (overviewTab() === "summary") {
                <div class="dashboard-highlight">
                  <span>SALDO DO PERÍODO</span
                  ><strong>{{ money(dashboardData()?.saldoTotal) }}</strong
                  ><span class="dashboard-balance-note">SALDO CONSOLIDADO</span>
                </div>
                <div class="dashboard-metrics">
                  <div class="dash-metric">
                    <span>CRÉDITO TOTAL</span
                    ><strong class="positive">{{ money(dashboardData()?.creditoTotal) }}</strong
                    ><small>Limite disponível</small>
                  </div>
                  <div class="dash-metric">
                    <span>CRÉDITO USADO</span
                    ><strong class="negative">{{ money(dashboardData()?.creditoUsado) }}</strong
                    ><small>Disponível: {{ money(dashboardData()?.creditoRestante) }}</small>
                  </div>
                </div>
                <app-monthly-line-chart
                  [records]="dashboardRecords()"
                  [month]="store.overviewSelection().value"
                />
                @if (dashboardUpcomingInvoices().length) {
                  <div class="dashboard-summary-invoices">
                    <div class="dash-title">FATURAS DO PERÍODO</div>
                    @for (invoice of dashboardUpcomingInvoices(); track $index) {
                      <div class="dash-transaction">
                        <small class="dashboard-invoice-status">{{ invoice.status || "Status indisponível" }}</small>
                        <small class="dashboard-invoice-date">{{ dashboardInvoiceDeadlineLabel(invoice) }}</small>
                        <span class="dash-tx-icon"><span class="material-symbols-outlined">receipt_long</span></span>
                        <div>
                          <strong>{{ dashboardInvoiceLabel(invoice.referencia) }}</strong>
                          <small>{{ invoice.nomeCartao || "Cartão" }}</small>
                        </div>
                        <b>{{ money(invoice.valorTotal) }}</b>
                      </div>
                    }
                  </div>
                }
                }
                </div>
                <div class="dash-section overview-invoices">
                  <div class="dash-title">FATURAS DO PERÍODO</div>
                  @for (invoice of dashboardUpcomingInvoices(); track $index) {
                    <div class="dashboard-invoice-group">
                      <div class="dash-transaction">
                        <small class="dashboard-invoice-status">{{ invoice.status || "Status indisponível" }}</small>
                        <small class="dashboard-invoice-date">{{ dashboardInvoiceDeadlineLabel(invoice) }}</small>
                        <span class="dash-tx-icon"><span class="material-symbols-outlined">receipt_long</span></span>
                        <div>
                          <strong>{{ dashboardInvoiceLabel(invoice.referencia) }}</strong>
                          <small class="dashboard-resource-links">
                            @if (invoice.cartaoId) {
                              <button type="button" class="dashboard-resource-link" (click)="openDashboardCard(invoice)"><span class="material-symbols-outlined">credit_card</span>{{ invoice.nomeCartao || "Cartão" }}</button>
                            } @else {
                              <span>{{ invoice.nomeCartao || "Cartão não informado" }}</span>
                            }
                            <span aria-hidden="true">·</span>
                            @if (invoice.nomeBanco || dashboardInvoiceAccountId(invoice)) {
                              <button type="button" class="dashboard-resource-link" (click)="openDashboardAccount(invoice)"><span class="material-symbols-outlined">account_balance</span>{{ invoice.nomeBanco || "Conta bancária" }}</button>
                            } @else {
                              <span>{{ invoice.nomeBanco || "Banco não informado" }}</span>
                            }
                          </small>
                        </div>
                        <b>{{ money(invoice.valorTotal) }}</b>
                        @if (dashboardInvoiceEntries(invoice.id).length) {
                          <button type="button" class="dashboard-invoice-toggle" [attr.aria-expanded]="isDashboardInvoiceExpanded(invoice.id)" [attr.aria-label]="isDashboardInvoiceExpanded(invoice.id) ? 'Recolher lançamentos da fatura' : 'Expandir lançamentos da fatura'" (click)="toggleDashboardInvoice(invoice.id)">
                            <span class="material-symbols-outlined">{{ isDashboardInvoiceExpanded(invoice.id) ? "expand_less" : "expand_more" }}</span>
                          </button>
                        }
                      </div>
                      @if (isDashboardInvoiceExpanded(invoice.id)) {
                        <div class="dashboard-invoice-entries">
                          @for (entry of dashboardInvoiceEntries(invoice.id); track entry.id ?? $index) {
                            <div class="dashboard-invoice-entry">
                              <small class="dashboard-invoice-entry-date">{{ shortDate(entry.dataLancamento) }}</small>
                              <span class="dashboard-entry-category-tag">{{ entry.categoriaNome || "Categoria não informada" }}</span>
                              <div>
                                <strong>{{ entry.descricao || "Lançamento da fatura" }}</strong>
                              </div>
                              <div class="dashboard-invoice-entry-value">
                                @if (entry.numeroParcela && entry.totalParcelas && entry.totalParcelas > 1) {
                                  <small>Parcela {{ entry.numeroParcela }}/{{ entry.totalParcelas }}</small>
                                }
                                <b [class.positive]="(entry.valor ?? 0) >= 0">{{ money(entry.valor) }}</b>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  } @empty {
                    <div class="dashboard-empty">Nenhuma fatura disponível no período.</div>
                  }
                </div>
                <div class="dash-section overview-budgets">
                  <div class="dash-title">ORÇAMENTOS EM USO</div>
                  @for (item of dashboardBudgetTotals(); track item.name) {
                    <div class="category-bar">
                      <div class="bar-label">
                        <span>{{ item.name }}</span
                        ><strong>{{ money(item.amount) }} / {{ money(item.limit) }}</strong>
                      </div>
                      <div class="bar-track">
                        <span [style.width.%]="item.width"></span>
                      </div>
                    </div>
                  } @empty {
                    <div class="dashboard-empty">
                      Nenhum orçamento disponível no dashboard.
                    </div>
                  }
                </div>
                <div class="dash-section overview-movements">
                  <div class="dash-title">ÚLTIMAS MOVIMENTAÇÕES</div>
                  @for (item of dashboardRecords(); track item.id) {
                    <div class="dash-transaction">
                      <span
                        class="dash-tx-icon"
                        [class.income]="item.type === 'income'"
                      >
                        {{ movementIcon(item) }}</span
                      >
                      <div>
                        <strong>{{ item.title }}</strong
                        ><small>{{ shortDate(item.date) }}</small>
                      </div>
                      <b [class.positive]="item.type === 'income'"
                        >{{ movementIcon(item) }} {{ money(item.amount) }}</b
                      >
                    </div>
                  } @empty {
                    <div class="dashboard-empty">
                      Nenhuma movimentação recente disponível.
                    </div>
                  }
                </div>
                <div class="dash-section overview-accounts">
                  <div class="dash-title">CONTAS BANCÁRIAS</div>
                  @for (account of dashboardAccounts(); track account.id) {
                    <div class="dash-transaction">
                      <span class="dash-tx-icon"><span class="material-symbols-outlined">account_balance</span></span>
                      <div>
                        <button type="button" class="dashboard-resource-link dashboard-resource-title" (click)="openDashboardAccountById(account.id)">{{ account.nomeDoBanco || "Conta bancária" }}</button>
                      </div>
                      <div class="dashboard-account-value">
                        <small>Crédito utilizado: {{ dashboardAccountCreditLabel(account) }}</small>
                        <b class="dashboard-account-balance">{{ money(account.saldoCorrente) }}</b>
                      </div>
                    </div>
                  } @empty {
                    <div class="dashboard-empty">Nenhuma conta disponível.</div>
                  }
                  @if (dashboardData()?.snapshotHistoricoDisponivel && dashboardAccountSnapshots().length) {
                    <div class="dash-title dashboard-subsection-title">FECHAMENTO DO MÊS</div>
                    @for (snapshot of dashboardAccountSnapshots(); track snapshot.contaBancariaId ?? snapshot.nomeDoBanco) {
                      <div class="dash-transaction dashboard-snapshot-row">
                        <div>
                          <button type="button" class="dashboard-resource-link dashboard-resource-title" (click)="openDashboardAccountById(snapshot.contaBancariaId)">{{ snapshot.nomeDoBanco || "Conta bancária" }}</button>
                          <div class="dashboard-snapshot-metrics">
                            <div class="dashboard-flow-total-metric"><span>Fluxo do período</span><div class="dashboard-flow-labels"><strong class="income">{{ money(snapshot.totalEntradas) }} ({{ dashboardFlowPercentage(snapshot, snapshot.totalEntradas) }}%)</strong><strong class="expense">{{ money(snapshot.totalSaidas) }} ({{ dashboardFlowPercentage(snapshot, snapshot.totalSaidas) }}%)</strong></div><i class="dashboard-flow-bar"><b class="income" [style.width.%]="dashboardFlowWidth(snapshot, snapshot.totalEntradas)"></b><b class="expense" [style.width.%]="dashboardFlowWidth(snapshot, snapshot.totalSaidas)"></b></i></div>
                            <div class="dashboard-credit-total-metric"><span>Crédito total</span><strong>{{ money(snapshot.creditoTotal) }}</strong><div class="dashboard-credit-labels"><strong class="used">{{ money(snapshot.creditoUsado) }} ({{ dashboardCreditPercentage(snapshot.creditoUsado, snapshot.creditoTotal) }}%)</strong><strong class="available">{{ money(snapshot.creditoRestante) }} ({{ dashboardCreditPercentage(snapshot.creditoRestante, snapshot.creditoTotal) }}%)</strong></div><i class="dashboard-credit-bar"><b class="base"></b><b class="used" [style.width.%]="dashboardCreditWidth(snapshot.creditoUsado, snapshot.creditoTotal)"></b><b class="available" [style.left.%]="dashboardCreditWidth(snapshot.creditoUsado, snapshot.creditoTotal)" [style.width.%]="dashboardCreditWidth(snapshot.creditoRestante, snapshot.creditoTotal)"></b></i></div>
                          </div>
                        </div>
                        <div class="dashboard-snapshot-value"><small>Saldo final</small><b>{{ money(snapshot.saldoFinal) }}</b></div>
                      </div>
                    }
                  }
                </div>
                <div class="dash-section overview-entries">
                  <div class="dash-title">ÚLTIMOS LANÇAMENTOS</div>
                  @for (entry of dashboardEntries(); track (entry.dataLancamento ?? '') + (entry.descricao ?? '') + (entry.faturaId ?? '')) {
                    <div class="dash-transaction">
                      <small class="dashboard-entry-date">{{ shortDate(entry.dataLancamento) }}</small>
                      <span class="dash-tx-icon"><span class="material-symbols-outlined">description</span></span>
                      <div>
                        <strong>{{ entry.descricao || "Lançamento" }}</strong>
                      </div>
                      <div class="dashboard-entry-value">
                        @if (entry.faturaId && entry.numeroParcela && entry.totalParcelas && entry.totalParcelas > 1) {
                          <small>Parcela {{ entry.numeroParcela }}/{{ entry.totalParcelas }}</small>
                        }
                        @if (entry.faturaId && dashboardEntryInvoiceHref(entry.faturaId); as invoiceHref) {
                          <a
                            class="dashboard-resource-link dashboard-entry-invoice-link"
                            [href]="invoiceHref"
                            title="Abrir fatura"
                            [attr.aria-label]="'Abrir fatura ' + entry.faturaId"
                          ><span class="material-symbols-outlined">receipt_long</span></a>
                        } @else if (entry.faturaId) {
                          <button
                            type="button"
                            class="dashboard-resource-link dashboard-entry-invoice-link"
                            title="Abrir fatura"
                            [attr.aria-label]="'Abrir fatura ' + entry.faturaId"
                            (click)="openDashboardEntryInvoice(entry.faturaId)"
                          ><span class="material-symbols-outlined">receipt_long</span></button>
                        }
                        <b>{{ money(entry.valor) }}</b>
                      </div>
                    </div>
                  } @empty {
                    <div class="dashboard-empty">Nenhum lançamento disponível.</div>
                  }
                </div>
                <div class="dash-section overview-investments">
                  <div class="dash-title">INVESTIMENTOS</div>
                  @for (investment of dashboardInvestments(); track investment.id) {
                    <div class="dash-transaction">
                      <small class="dashboard-entry-date">{{ shortDate(investment.dataInicio) }}</small>
                      <span class="dash-tx-icon"><span class="material-symbols-outlined">trending_up</span></span>
                      <div>
                        <button type="button" class="dashboard-resource-link dashboard-resource-title" (click)="openDashboardResource('investments', investment.id)">{{ investment.categoria || "Investimento" }}</button>
                      </div>
                      <b>{{ money(investment.valorCorrente ?? investment.valorInicial) }}</b>
                    </div>
                  } @empty {
                    <div class="dashboard-empty">Nenhum investimento disponível.</div>
                  }
                  @if (dashboardData()?.snapshotInvestimentosHistoricoDisponivel && dashboardInvestmentSnapshots().length) {
                    <div class="dash-title dashboard-subsection-title">FECHAMENTO DO MÊS</div>
                    @for (snapshot of dashboardInvestmentSnapshots(); track snapshot.investimentoId ?? snapshot.categoria) {
                      <div class="dash-transaction dashboard-snapshot-row">
                        <div>
                          <button type="button" class="dashboard-resource-link dashboard-resource-title" (click)="openDashboardResource('investments', snapshot.investimentoId)">{{ snapshot.categoria || "Investimento" }}</button>
                        </div>
                        <div class="dashboard-snapshot-value"><small>Valor final</small><b>{{ money(snapshot.valorFinal) }}</b></div>
                      </div>
                    }
                  }
                </div>
                <div class="dash-section overview-goals">
                  <div class="dash-title">METAS FINANCEIRAS</div>
                  @for (goal of dashboardGoals(); track goal.id) {
                    <div class="dash-transaction">
                      <span class="dash-tx-icon"><span class="material-symbols-outlined">flag</span></span>
                      <div>
                        <button type="button" class="dashboard-resource-link dashboard-resource-title" (click)="openDashboardResource('goals', goal.id)">{{ goal.objetivo || "Meta financeira" }}</button>
                        <small>Conclusão: {{ fullDate(goal.dataConclusaoPrevista) }}</small>
                      </div>
                      <b>{{ money(goal.valorAcumulado) }} / {{ money(goal.valorAlvo) }}</b>
                    </div>
                  } @empty {
                    <div class="dashboard-empty">Nenhuma meta disponível.</div>
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
        </main>
      </div>
    </div>
    @if (movementAsideOpen()) {
      <div
        class="movement-aside-backdrop"
        (click)="$event.target === $event.currentTarget && closeMovementAside()"
      ></div>
      <aside
        class="movement-aside"
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-aside-title"
      >
        <div class="movement-aside-head">
          <div><h2 id="movement-aside-title">Registrar movimentação</h2></div>
          <button
            type="button"
            class="category-form-close"
            aria-label="Fechar formulário"
            (click)="closeMovementAside()"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          class="movement-form"
          [formGroup]="movementForm"
          (ngSubmit)="saveMovement()"
        >
          <div class="movement-type-options">
            <label
              [class.selected]="movementForm.controls.type.value === 'ENTRADA'"
              ><input
                type="radio"
                formControlName="type"
                value="ENTRADA"
              /><span class="material-symbols-outlined">arrow_upward</span
              >Entrada</label
            ><label
              [class.selected]="movementForm.controls.type.value === 'SAIDA'"
              ><input type="radio" formControlName="type" value="SAIDA" /><span
                class="material-symbols-outlined"
                >arrow_downward</span
              >Saída</label
            >
          </div>
          <label
            >Valor *<input
              appCurrencyInput
              formControlName="amount"
              type="text"
              inputmode="decimal"
              placeholder="R$ 0,00"
          /></label>
          <div class="movement-account-readonly">
            <span class="movement-field-label">Conta bancária ativa *</span
            ><input type="hidden" formControlName="accountId" />
            <div>
              <span class="material-symbols-outlined">account_balance</span
              ><strong>{{ activeAccountTitle() }}</strong
              ><span class="material-symbols-outlined">lock</span>
            </div>
          </div>
          <div class="movement-category-field" [class.popup-open]="categoryPickerOpen()">
            <span class="movement-field-label">Categoria</span>
            <div class="movement-selection-control">
              @if (selectedMovementCategory(); as category) {
                <div class="movement-selection-display">
                  <span
                    class="movement-selection-display-icon"
                    [style.backgroundColor]="categoryColor(category)"
                    ><span class="material-symbols-outlined">{{
                      categoryIcon(category)
                    }}</span></span
                  ><span class="movement-selection-display-content"
                    ><strong>{{ category.title }}</strong
                    ><span
                      class="movement-category-type-tag"
                      [class.income]="category.type === 'income'"
                      [class.expense]="category.type === 'expense'"
                      ><span>{{
                        category.type === "income" ? "Entrada" : "Saída"
                      }}</span
                      ><span class="material-symbols-outlined">{{
                        category.type === "income"
                          ? "arrow_upward"
                          : "arrow_downward"
                      }}</span></span
                    ></span
                  ><button
                    type="button"
                    class="movement-selection-clear"
                    aria-label="Limpar categoria selecionada"
                    (click)="clearMovementCategory($event)"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              } @else {
                <button
                  type="button"
                  class="movement-category-trigger"
                  (click)="toggleCategoryPicker()"
                >
                  <span class="material-symbols-outlined">sell</span
                  ><span>Selecione uma categoria</span
                  ><span
                    class="material-symbols-outlined movement-category-chevron"
                    >expand_more</span
                  >
                </button>
              }
            </div>
            @if (categoryPickerOpen()) {
              <div
                class="movement-category-picker"
                role="listbox"
                aria-label="Categorias disponíveis"
              >
                @for (category of movementCategories(); track category.apiId) {
                  <button
                    type="button"
                    class="movement-category-card"
                    [class.selected]="
                      movementForm.controls.categoryId.value === category.apiId
                    "
                    role="option"
                    [attr.aria-selected]="
                      movementForm.controls.categoryId.value === category.apiId
                    "
                    (click)="selectMovementCategory(category.apiId)"
                  >
                    <span
                      class="movement-category-card-icon"
                      [style.backgroundColor]="categoryColor(category)"
                      ><span class="material-symbols-outlined">{{
                        categoryIcon(category)
                      }}</span></span
                    ><span class="movement-category-card-copy"
                      ><span class="movement-category-title-line"
                        ><strong>{{ category.title }}</strong
                        ><span
                          class="movement-category-type-tag"
                          [class.income]="category.type === 'income'"
                          [class.expense]="category.type === 'expense'"
                          ><span>{{
                            category.type === "income" ? "Entrada" : "Saída"
                          }}</span
                          ><span class="material-symbols-outlined">{{
                            category.type === "income"
                              ? "arrow_upward"
                              : "arrow_downward"
                          }}</span></span
                        ></span
                      ></span
                    ><span
                      class="material-symbols-outlined movement-category-check"
                      >check</span
                    >
                  </button>
                } @empty {
                  <div class="movement-category-empty">
                    <span>Nenhuma categoria disponível.</span>
                    <button type="button" class="movement-category-create" (click)="createCategoryFromMovement()">
                      <span class="material-symbols-outlined">add</span>
                      Criar categoria
                    </button>
                  </div>
                }
              </div>
            }
          </div>
          <div class="movement-payment-field" [class.popup-open]="paymentPickerOpen()">
            <span class="movement-field-label">Forma de pagamento</span>
            <div class="movement-selection-control">
              @if (selectedMovementPayment(); as payment) {
                <div class="movement-selection-display">
                  <span class="movement-selection-display-icon"
                    ><span class="material-symbols-outlined">{{
                      payment.icon
                    }}</span></span
                  ><span class="movement-selection-display-content"
                    ><strong>{{ payment.label }}</strong></span
                  ><button
                    type="button"
                    class="movement-selection-clear"
                    aria-label="Limpar forma de pagamento selecionada"
                    (click)="clearMovementPayment($event)"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              } @else {
                <button
                  type="button"
                  class="movement-payment-trigger"
                  (click)="togglePaymentPicker()"
                >
                  <span class="material-symbols-outlined">payments</span
                  ><span>Selecione uma forma</span
                  ><span
                    class="material-symbols-outlined movement-category-chevron"
                    >expand_more</span
                  >
                </button>
              }
            </div>
            @if (paymentPickerOpen()) {
              <div
                class="movement-payment-picker"
                role="listbox"
                aria-label="Formas de pagamento disponíveis"
              >
                @for (payment of movementPaymentMethods; track payment.value) {
                  <button
                    type="button"
                    class="movement-payment-card"
                    [class.selected]="
                      movementForm.controls.method.value === payment.value
                    "
                    role="option"
                    [attr.aria-selected]="
                      movementForm.controls.method.value === payment.value
                    "
                    (click)="selectMovementPayment(payment.value)"
                  >
                    <span class="movement-payment-card-icon"
                      ><span class="material-symbols-outlined">{{
                        payment.icon
                      }}</span></span
                    ><span>{{ payment.label }}</span
                    ><span
                      class="material-symbols-outlined movement-category-check"
                      >check</span
                    >
                  </button>
                }
              </div>
            }
          </div>
          <div class="movement-card-row">
          @if (
            movementForm.controls.method.value === "CARTAO_CREDITO" ||
            movementForm.controls.method.value === "CARTAO_DEBITO"
          ) {
            <label
              >Cartão bancário<select formControlName="cardId">
                <option value="">Selecione um cartão</option>
                @for (card of movementCards(); track card.id) {
                  <option [value]="card.apiId">{{ card.title }}</option>
                }
              </select></label
            >
            @if (
              movementForm.controls.cardId.touched &&
              movementForm.controls.cardId.invalid
            ) {
              <small class="field-error">Selecione um cartão bancário.</small>
            }
          }
          @if (movementForm.controls.method.value === "CARTAO_CREDITO") {
            <label
              >Quantidade de parcelas<input
                formControlName="installments"
                type="number"
                min="1"
                step="1"
            /></label>
            @if (
              movementForm.controls.installments.touched &&
              movementForm.controls.installments.invalid
            ) {
              <small class="field-error">Informe ao menos uma parcela.</small>
            }
          }
          </div>
          <label
            >Descrição<textarea
              formControlName="description"
              maxlength="120"
              rows="4"
            ></textarea>
          </label>
          <label class="movement-check"
            ><input formControlName="recurring" type="checkbox" />Movimentação
            recorrente</label
          >
          <label>{{ movementForm.controls.recurring.value ? "Data da primeira movimentação" : "Data" }}<app-date-picker formControlName="date" ariaLabel="Data da movimentação"></app-date-picker></label>
          @if (
            movementForm.controls.type.invalid &&
            movementForm.controls.type.touched
          ) {
            <small class="field-error">Selecione Entrada ou Saída.</small>
          }
          @if (
            movementForm.controls.amount.invalid &&
            movementForm.controls.amount.touched
          ) {
            <small class="field-error">Informe um valor maior que zero.</small>
          }
          @if (
            movementForm.controls.accountId.invalid &&
            movementForm.controls.accountId.touched
          ) {
            <small class="field-error">Selecione uma conta bancária.</small>
          }
          @if (
            movementForm.controls.categoryId.invalid &&
            movementForm.controls.categoryId.touched
          ) {
            <small class="field-error">Selecione uma categoria.</small>
          }
          @if (
            movementForm.controls.method.invalid &&
            movementForm.controls.method.touched
          ) {
            <small class="field-error">Selecione a forma de pagamento.</small>
          }
          @if (store.error(); as error) {
            <div class="form-error" role="alert">{{ error }}</div>
          }
          <div class="category-form-actions movement-aside-actions">
            <button
              type="button"
              class="secondary-btn"
              (click)="closeMovementAside()"
            >
              <span class="material-symbols-outlined">close</span
              >CANCELAR</button
            ><button
              type="submit"
              class="primary-btn"
              [disabled]="movementForm.invalid || movementSaving()"
            >
              <span class="material-symbols-outlined">save</span
              >{{ movementSaving() ? "SALVANDO..." : "SALVAR MOVIMENTAÇÃO" }}
            </button>
          </div>
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
                  ? (active() === "goals" ? "Editar meta financeira" : "Editar registro")
                  : (active() === "goals" ? "Nova meta financeira" : "Novo " + activeSection().singular)
              }}
            </h2>
            <button class="close-modal" (click)="closeModal()">×</button>
          </div>
          <form [formGroup]="entryForm" (ngSubmit)="save()">
            <label>{{ active() === "goals" ? "Objetivo *" : "Descricao *" }}<input formControlName="title" maxlength="255" required /></label>
            @if (active() !== "statements" || !editingId()) {
              <div class="form-row">
                <label>{{ active() === "goals" ? "Valor alvo (R$) *" : "Valor (R$) *" }}<input appCurrencyInput formControlName="amount" type="text" inputmode="decimal" required /></label>
              </div>
              @if (active() !== "goals") {
                <label>Categoria *<input formControlName="category" required /></label>
                <label>Observações<textarea formControlName="notes" rows="3"></textarea></label>
              }
              <label>{{ active() === "goals" ? "Data prevista *" : "Data *" }}<app-date-picker formControlName="date" [ariaLabel]="active() === 'goals' ? 'Data prevista para concluir a meta' : 'Data do lancamento'"></app-date-picker></label>
            } @else {
              <small>A API permite alterar somente a descrição da movimentação.</small>
            }
            @if (store.error(); as error) { <div class="form-error" role="alert">{{ error }}</div> }
            <div class="modal-actions">
              <button type="button" class="secondary-btn" (click)="closeModal()">CANCELAR</button>
              <button class="primary-btn" type="submit" [disabled]="entryForm.invalid || store.loading()">SALVAR</button>
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
  readonly financeApi = inject(FinanceApiService);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly destroyRef = inject(DestroyRef);
  readonly fb = inject(FormBuilder);
  private readonly legacyNavigation: NavItem[] = navigation
    .filter((item) => item.key !== "budgets")
    .map((item) =>
      item.key === "categories"
        ? {
            ...item,
            children: [
              { key: "budgets", label: "Orçamentos", icon: "pie_chart" },
            ],
          }
        : item,
    );
  readonly navigation: NavItem[] = navigation.filter(
    (item) => item.key !== "budgets",
  );
  private readonly accountDependentSections = new Set<SectionKey>([
    "transactions",
    "statements",
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
  readonly selectedCardTypes = signal<Set<string>>(
    new Set(this.cardTypes.map((type) => type.value)),
  );
  readonly listFiltersOpen = signal(false);
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
  readonly nextMonth = (() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  })();
  readonly currentDate = (() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  })();
  readonly hasCurrentBudget = computed(() => {
    const category = this.selectedRecord();
    return Boolean(
      category?.budget?.month === this.currentMonth ||
        this.categoryBudgets().some(
          (budget) => budget.date === this.currentMonth,
        ),
    );
  });
  readonly movementAccounts = computed(() =>
    this.store.sections().accounts.records.filter((record) => record.apiId),
  );
  readonly activeAccountId = this.store.activeAccountId;
  readonly activeAccount = computed(
    () =>
      this.movementAccounts().find(
        (account) => account.apiId === this.activeAccountId(),
      ) ?? null,
  );
  readonly activeAccountTitle = computed(
    () => this.activeAccount()?.title ?? "",
  );
  readonly historicalPeriods = signal<string[]>([]);
  private historicalPeriodsLoaded = false;
  private historicalPeriodsLoading = false;
  private readonly activeAccountUrlEffect = effect(() => {
    if (this.active() === "overview") {
      this.loadHistoricalPeriods();
      this.loadingTarget.set("detail");
      this.store.loadDashboard(false, this.store.overviewSelection().value);
      this.store.loadSection("cardCredit");
    }
    const requestedSection = sectionFromRouteSegment(this.route.snapshot.paramMap.get("section"));
    const requestedRecordId = this.route.snapshot.paramMap.get("recordId");
    const routeCardId = this.route.snapshot.paramMap.get("cardId");
    const routeInvoiceId = this.route.snapshot.paramMap.get("invoiceId");
    const requestedTab = this.tabFromUrl(this.route.snapshot.queryParamMap.get("aba"));
    const routeCardTab: "invoices" | "overview" = requestedTab === "invoices" || requestedTab === "overview"
      ? requestedTab
      : this.route.snapshot.paramMap.get("cardId") && this.route.snapshot.url.some((segment) => segment.path === "faturas") ? "invoices" : "overview";
    if (requestedSection && this.active() !== requestedSection) {
      this.store.navigate(requestedSection);
      this.store.loadSection(requestedSection);
    }
    if (requestedSection === "accounts" && (requestedTab === "overview" || requestedTab === "movements" || requestedTab === "entries")) {
      this.store.setAccountTab(requestedTab);
    }
    if (requestedSection === "categories" && (requestedTab === "overview" || requestedTab === "budgets")) {
      this.store.setCategoryTab(requestedTab);
    }
    if (routeCardId && this.store.sections().cardCredit.records.length === 0) {
      this.store.loadSection("cardCredit");
    }
    if (routeCardId) {
      if (this.active() !== "cardCredit") this.store.navigate("cardCredit");
      const card = this.store.sections().cardCredit.records.find((record) => record.apiId === routeCardId);
      if (card && this.active() === "cardCredit") {
        if (this.store.selectedId() !== card.id) this.store.selectRecord(card.id);
        if (routeInvoiceId && this.activeAccountId() && this.invoiceDetailRequestedId() !== routeInvoiceId) {
          this.loadInvoiceDetailById(routeInvoiceId);
        }
      }
    }
    if (requestedRecordId && requestedSection) {
      const record = this.store.sections()[requestedSection].records.find((item) => item.apiId === requestedRecordId || item.id === requestedRecordId);
      if (record && this.active() === requestedSection && this.store.selectedId() !== record.id) {
        this.store.selectRecord(record.id);
      }
    }
    const requestedId =
      this.route.snapshot.paramMap.get("accountId") ??
      this.route.snapshot.queryParamMap.get("conta");
    const accounts = this.movementAccounts();
    if (!accounts.length) return;
    const account = accounts.find((item) => item.apiId === requestedId);
    if (account?.apiId && this.activeAccountId() !== account.apiId) {
      this.store.setActiveAccountId(account.apiId);
      if (requestedId !== account.apiId) this.updateAccountUrl(account.apiId);
    } else if (!account && requestedId) {
      if (this.activeAccountId() !== null) this.store.setActiveAccountId(null);
      void this.router.navigate(["/visao-geral"]);
    }
    if (routeCardId && this.active() === "cardCredit" && this.activeAccountId()) {
      const card = this.store.sections().cardCredit.records.find((record) => record.apiId === routeCardId);
      if (card) {
        if (this.store.cardTab() !== routeCardTab) this.setCardTab(routeCardTab);
        else if (card.cardType === "CREDITO" && !this.store.loading() && this.store.sections().invoices.records.length === 0) this.loadRouteCardInvoices(card.apiId!);
        if (routeInvoiceId && !this.invoiceDetail() && !this.store.loading()) this.loadInvoiceDetailById(routeInvoiceId);
      }
    }
  });
  private readonly accountSectionGuardEffect = effect(() => {
    const routeAccountId =
      this.route.snapshot.paramMap.get("accountId") ??
      this.route.snapshot.queryParamMap.get("conta");
    if (
      this.activeAccountId() === null &&
      !routeAccountId &&
      this.isAccountDependent(this.active())
    ) {
      this.store.navigate("overview");
      void this.router.navigate(["/visao-geral"]);
    }
  });
  readonly movementCategories = computed(() =>
    this.store.sections().categories.records.filter((record) => record.apiId),
  );
  readonly modalOpen = computed(
    () => this.store.editingId() !== null || this.modalVisible(),
  );
  readonly authUser = this.auth.user;
  readonly userMenuOpen = signal(false);
  readonly resourceLoadingVisible = signal(false);
  readonly resourceRevealActive = signal(false);
  readonly createdRecordId = signal<string | null>(null);
  readonly loadingTarget = signal<"list" | "detail">("list");
  private loadingStartedAt = 0;
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;
  private resourceRevealTimer: ReturnType<typeof setTimeout> | null = null;
  private createdRecordTimer: ReturnType<typeof setTimeout> | null = null;
  private detailRevealTimer: ReturnType<typeof setTimeout> | null = null;
  triggerCreatedRecordPop(recordId: string | undefined): void {
    if (!recordId) return;
    if (this.createdRecordTimer !== null) clearTimeout(this.createdRecordTimer);
    this.createdRecordId.set(recordId);
    this.createdRecordTimer = setTimeout(
      () => this.createdRecordId.set(null),
      700,
    );
  }
  private triggerDetailReveal(): void {
    if (this.detailRevealTimer !== null) clearTimeout(this.detailRevealTimer);
    this.resourceRevealActive.set(false);
    this.detailRevealTimer = setTimeout(() => {
      this.resourceRevealActive.set(true);
      this.detailRevealTimer = setTimeout(
        () => this.resourceRevealActive.set(false),
        700,
      );
    }, 0);
  }
  private newRecordId(
    section: SectionKey,
    previousIds: Set<string>,
  ): string | undefined {
    return this.store
      .sections()
      [section].records.find((record) => !previousIds.has(record.id))?.id;
  }
  private readonly resourceLoadingEffect = effect(() => {
    const loading = this.store.loading();
    if (loading) {
      if (!this.resourceLoadingVisible()) this.loadingStartedAt = Date.now();
      if (this.loadingTimer !== null) clearTimeout(this.loadingTimer);
      if (this.resourceRevealTimer !== null)
        clearTimeout(this.resourceRevealTimer);
      this.resourceRevealActive.set(false);
      this.resourceLoadingVisible.set(true);
      return;
    }
    if (!this.resourceLoadingVisible()) return;
    const remaining = Math.max(0, 3000 - (Date.now() - this.loadingStartedAt));
    const exitAnimationDuration = 1650;
    if (this.loadingTimer !== null) clearTimeout(this.loadingTimer);
    this.loadingTimer = setTimeout(
      () => {
        this.resourceLoadingVisible.set(false);
        this.resourceRevealActive.set(true);
        this.resourceRevealTimer = setTimeout(
          () => this.resourceRevealActive.set(false),
          700,
        );
      },
      Math.max(remaining, exitAnimationDuration),
    );
  });
  readonly editingId = this.store.editingId;
  private readonly modalVisible = signal(false);
  readonly categoryFormOpen = signal(false);
  readonly categorySaving = signal(false);
  readonly categoryEditingId = signal<string | null>(null);
  readonly accountFormOpen = signal(false);
  readonly accountSaving = signal(false);
  readonly accountEditingId = signal<string | null>(null);
  readonly cardFormOpen = signal(false);
  readonly cardSaving = signal(false);
  readonly cardEditingId = signal<string | null>(null);
  readonly investmentFormOpen = signal(false);
  readonly investmentSaving = signal(false);
  readonly investmentEditingId = signal<string | null>(null);
  readonly goalFormOpen = signal(false);
  readonly goalSaving = signal(false);
  readonly cardDays = Array.from({ length: 31 }, (_, index) => index + 1);
  readonly invoiceMonth = signal(this.nextMonth);
  readonly invoicePeriodRange = signal<{ dataInicial: string; dataFinal: string } | null>(null);
  readonly invoiceDetail = signal<FinanceRecord | null>(null);
  readonly invoiceDetailRequestedId = signal<string | null>(null);
  readonly statementPanelOpen = signal(false);
  readonly statementMode = signal<"statements" | "transactions">("statements");
  readonly overviewTab = signal<"summary" | "invoices" | "budgets" | "movements" | "accounts" | "entries" | "investments" | "goals">(this.readOverviewTabFromUrl());
  readonly statementDetail = signal<FinanceRecord | null>(null);
  readonly statementDetailLoading = signal(false);
  private statementDetailRevealTimer: ReturnType<typeof setTimeout> | null = null;
  readonly statementPeriodForm = this.fb.nonNullable.group({
    from: this.currentPeriod().dataInicial,
    to: this.currentPeriod().dataFinal,
  });
  readonly entryPeriodForm = this.fb.nonNullable.group({
    from: this.currentPeriod().dataInicial,
    to: this.currentPeriod().dataFinal,
  });
  readonly statementRecords = computed(
    () => this.store.sections().statements.records,
  );
  readonly periodSearchRecords = computed(() =>
    this.statementMode() === "transactions"
      ? this.store.sections().transactions.records
      : this.statementRecords(),
  );
  readonly budgetFormOpen = signal(false);
  readonly budgetSaving = signal(false);
  readonly budgetEditingId = signal<string | null>(null);
  readonly movementAsideOpen = signal(false);
  readonly movementSaving = signal(false);
  readonly categoryPickerOpen = signal(false);
  readonly paymentPickerOpen = signal(false);
  readonly movementPaymentMethods: {
    value: MovementMethod;
    label: string;
    icon: string;
  }[] = [
    { value: "DINHEIRO", label: "Dinheiro", icon: "payments" },
    { value: "PIX", label: "Pix", icon: "qr_code_2" },
    {
      value: "CARTAO_CREDITO",
      label: "Cartão de crédito",
      icon: "credit_card",
    },
    { value: "CARTAO_DEBITO", label: "Cartão de débito", icon: "credit_card" },
    { value: "VOUCHER", label: "Voucher", icon: "confirmation_number" },
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
    bankName: this.fb.nonNullable.control("", [
      Validators.required,
      Validators.maxLength(100),
    ]),
    creditTotal: this.fb.nonNullable.control(0, [
      Validators.required,
      Validators.min(0),
    ]),
    currentBalance: this.fb.nonNullable.control(0, [Validators.required]),
  });
  readonly cardForm = this.fb.group({
    nickname: this.fb.nonNullable.control("", [
      Validators.required,
      Validators.maxLength(80),
    ]),
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
    limit: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
  });
  readonly investmentForm = this.fb.group({
    category: this.fb.nonNullable.control("", [
      Validators.required,
      Validators.maxLength(100),
    ]),
    startDate: this.fb.nonNullable.control(this.currentDate),
    initialAmount: this.fb.control<number | null>(null, Validators.min(0.01)),
    currentAmount: this.fb.control<number | null>(null, Validators.min(0)),
    interestRate: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
  });
  readonly movementForm = this.fb.group({
    type: this.fb.control<CategoryType | "">("", Validators.required),
    amount: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    accountId: this.fb.nonNullable.control("", Validators.required),
    categoryId: this.fb.nonNullable.control("", Validators.required),
    cardId: this.fb.nonNullable.control(""),
    method: this.fb.control<MovementMethod | "">("", Validators.required),
    date: this.fb.nonNullable.control(""),
    description: this.fb.nonNullable.control("", Validators.maxLength(120)),
    recurring: this.fb.nonNullable.control(false),
    installments: this.fb.control<number | null>(1, Validators.min(1)),
  });
  readonly transactionsCount = computed(
    () => this.store.sections().transactions.records.length,
  );
  readonly periodRecords = computed(() =>
    this.store
      .sections()
      .transactions.records.filter(
        (record) =>
          record.date?.startsWith(this.store.overviewSelection().value) &&
          record.amount !== undefined,
      ),
  );
  readonly dashboardData = this.store.dashboard;
  readonly dashboardRecords = computed(() =>
    (this.dashboardData()?.ultimasMovimentacoes ?? [])
      .filter((item) => item.id !== undefined && item.dataLancamento !== undefined && item.valorTotal !== undefined)
      .map((item) => ({
        id: item.id!,
        apiId: item.id,
        title: item.descricao?.trim() || "Movimentação",
        category: item.categoriaId ?? "",
        amount: item.valorTotal!,
        date: item.dataLancamento!,
        type: item.valorTotal! >= 0 ? "income" as const : "expense" as const,
        method: item.metodoPagamento,
        recurring: item.ehRecorrente,
        nextRecurrence: item.proximaRecorrencia,
        installments: item.qntParcelas,
      })),
  );
  readonly dashboardBudgetTotals = computed(() => {
    const budgets = this.dashboardData()?.orcamentos ?? [];
    const values = budgets
      .filter((item) => item.categoria !== undefined && item.valorCorrente !== undefined)
      .map((item) => ({ name: item.categoria!, amount: item.valorCorrente!, limit: item.valorLimite ?? 0 }));
    return values.map((item) => ({ ...item, width: item.limit > 0 ? Math.min((item.amount / item.limit) * 100, 100) : 0 }));
  });
  readonly dashboardUpcomingInvoices = computed(() => {
    const dashboard = this.dashboardData();
    if (dashboard?.proximasFaturas?.length) return dashboard.proximasFaturas;
    const legacyInvoices = (dashboard?.faturas as unknown);
    return Array.isArray(legacyInvoices) ? legacyInvoices as DashboardInvoice[] : [];
  });
  readonly dashboardInvoiceSummary = computed(() => this.dashboardData()?.faturas ?? {});
  readonly dashboardAccounts = computed(() => this.dashboardData()?.contas ?? []);
  readonly dashboardAccountSnapshots = computed(() => this.dashboardData()?.contasNoMes ?? []);
  readonly dashboardAllEntries = computed(() => this.dashboardData()?.ultimosLancamentos ?? []);
  readonly dashboardEntries = computed(() => this.dashboardAllEntries().filter((entry) => !entry.faturaId));
  readonly dashboardInvestments = computed(() => this.dashboardData()?.investimentos ?? []);
  readonly dashboardInvestmentSnapshots = computed(() => this.dashboardData()?.investimentosNoMes ?? []);
  readonly collapsedDashboardInvoices = signal<Set<string>>(new Set());
  dashboardFlowWidth(snapshot: DashboardAccountSnapshot, value: number | undefined): number {
    const total = Math.abs(snapshot.totalEntradas ?? 0) + Math.abs(snapshot.totalSaidas ?? 0);
    return total > 0 ? (Math.abs(value ?? 0) / total) * 100 : 50;
  }
  dashboardFlowPercentage(snapshot: DashboardAccountSnapshot, value: number | undefined): number {
    return Math.round(this.dashboardFlowWidth(snapshot, value));
  }
  dashboardCreditWidth(value: number | undefined, total: number | undefined): number {
    return total && total > 0 ? Math.min(((value ?? 0) / total) * 100, 100) : 50;
  }
  dashboardCreditPercentage(value: number | undefined, total: number | undefined): number {
    return Math.round(this.dashboardCreditWidth(value, total));
  }
  readonly dashboardGoals = computed(() => this.dashboardData()?.metas ?? []);
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
    const values = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const biggest = Math.max(...values.map(([, amount]) => amount), 1);
    return values.map(([name, amount]) => ({
      name,
      amount,
      width: (amount / biggest) * 100,
    }));
  });
  constructor() {
    const urlMonth = this.route.snapshot.queryParamMap.get("mesReferencia");
    if (this.isOverviewMonth(urlMonth)) {
      this.store.selectOverview({ type: "month", value: urlMonth });
    }
    this.destroyRef.onDestroy(() => {
      for (const timer of [
        this.loadingTimer,
        this.resourceRevealTimer,
        this.createdRecordTimer,
        this.detailRevealTimer,
        this.statementDetailRevealTimer,
      ]) {
        if (timer !== null) clearTimeout(timer);
      }
    });
    if (this.auth.isAuthenticated()) {
      this.auth.loadUser();
      this.store.loadSection("accounts");
    }
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const rawSection = params.get("section");
      const value = sectionFromRouteSegment(rawSection) ?? (rawSection && this.isSection(rawSection) ? rawSection : null);
      const recordId = params.get("recordId");
      const instanceId = recordId ?? params.get("cardId");
      if (instanceId) this.loadingTarget.set("detail");
      const accountId =
        params.get("accountId") ??
        this.route.snapshot.queryParamMap.get("conta");
      if (
        accountId &&
        this.movementAccounts().some((account) => account.apiId === accountId)
      )
        this.store.setActiveAccountId(accountId);
      if (
        value &&
        this.isSection(value) &&
        (!this.isAccountDependent(value) || this.activeAccountId() || accountId)
      ) {
        if (recordId) this.loadingTarget.set("detail");
        if (this.active() !== value) {
          this.store.navigate(value);
          if (!recordId) this.loadingTarget.set("list");
          this.store.loadSection(value);
        }
      }
      const queryFrom = this.route.snapshot.queryParamMap.get("dataInicial");
      const queryTo = this.route.snapshot.queryParamMap.get("dataFinal");
      if (value === "statements" && queryFrom && queryTo) {
        this.statementMode.set(this.route.snapshot.queryParamMap.get("consulta") === "lancamentos" ? "transactions" : "statements");
        this.statementPeriodForm.reset({ from: queryFrom, to: queryTo });
      }
      if (queryFrom && queryTo && this.route.snapshot.url.some((segment) => segment.path === "faturas")) {
        this.invoicePeriodRange.set({ dataInicial: queryFrom, dataFinal: queryTo });
        this.invoiceMonth.set(queryFrom.slice(0, 7));
      }
    });
  }
  filterNavigation(items: NavItem[], accountSelected: boolean): NavItem[] {
    return items
      .filter((item) => accountSelected || !this.isAccountDependent(item.key))
      .map((item) =>
        item.key === "cards" ? { ...item, children: undefined } : item,
      )
      .map((item) =>
        item.children
          ? {
              ...item,
              children: this.filterNavigation(item.children, accountSelected),
            }
          : item,
      )
      .filter((item) => !item.children || item.children.length > 0);
  }
  isAccountDependent(section: SectionKey): boolean {
    return this.accountDependentSections.has(section);
  }
  cardSectionActive(): boolean {
    return ["cards", "cardCredit", "cardDebit", "cardVoucher"].includes(
      this.active(),
    );
  }
  isSection(value: string): value is SectionKey {
    return Object.prototype.hasOwnProperty.call(this.store.sections(), value);
  }
  sectionRoute(section: SectionKey): string {
    return sectionRouteSegments[section];
  }
  private updatePeriodQuery(params: { dataInicial: string; dataFinal: string; consulta: string }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }
  updateRecordUrl(recordId: string): void {
    const accountId = this.activeAccountId();
    if (this.active() === "cardCredit" && accountId) {
      this.updateCardUrl(recordId, this.store.cardTab());
      return;
    }
    const commands = accountId && this.isAccountDependent(this.active())
      ? ["/conta", accountId, this.sectionRoute(this.active()), recordId]
      : ["/", this.sectionRoute(this.active()), recordId];
    void this.router.navigate(commands, { replaceUrl: true });
  }
  isActive(item: NavItem): boolean {
    return (
      this.active() === item.key ||
      item.children?.some((child) => this.isActive(child)) === true
    );
  }
  navigate(item: NavItem): void {
    if (this.activeAccountId() === null && this.isAccountDependent(item.key))
      return;
    if (item.key !== "statements")
      this.statementPanelOpen.set(false);
    if (this.categoryFormOpen() && !this.categorySaving())
      this.closeCategoryForm();
    if (this.accountFormOpen() && !this.accountSaving())
      this.closeAccountForm();
    if (this.cardFormOpen() && !this.cardSaving()) this.closeCardForm();
    if (this.investmentFormOpen() && !this.investmentSaving())
      this.closeInvestmentForm();
    if (this.goalFormOpen() && !this.goalSaving()) this.closeGoalForm();
    this.store.navigate(item.key);
    this.loadingTarget.set("list");
    this.store.loadSection(item.key);
    const activeAccountId = this.activeAccountId();
    const useAccountRoute =
      activeAccountId !== null && this.isAccountDependent(item.key);
    void this.router.navigate(
      useAccountRoute
        ? ["/conta", activeAccountId, this.sectionRoute(item.key)]
        : item.key === "overview"
          ? ["/visao-geral"]
          : [this.sectionRoute(item.key)],
    );
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
    if (selection.type === "month") {
      this.store.selectOverview(selection);
      this.updateOverviewUrl(selection.value, this.overviewTab());
      this.loadingTarget.set("detail");
      this.store.loadDashboard(true, selection.value);
    }
  }
  private loadHistoricalPeriods(): void {
    if (this.historicalPeriodsLoaded || this.historicalPeriodsLoading) return;
    this.historicalPeriodsLoading = true;
    this.financeApi.historicalPeriods().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const periods = [...new Set((response.periodos ?? []).filter((period) => /^\d{4}-(0[1-9]|1[0-2])$/.test(period)))].sort();
        this.historicalPeriods.set(periods);
        this.historicalPeriodsLoaded = true;
        this.historicalPeriodsLoading = false;
        const selected = this.store.overviewSelection().value;
        if (periods.length && !periods.includes(selected)) {
          this.selectOverview({ type: "month", value: periods[periods.length - 1] });
        }
      },
      error: () => {
        this.historicalPeriodsLoading = false;
      },
    });
  }
  selectRecord(id: string): void {
    if (this.categorySaving()) return;
    if (this.categoryFormOpen()) this.closeCategoryForm();
    if (this.accountFormOpen()) this.closeAccountForm();
    if (this.cardFormOpen()) this.closeCardForm();
    if (this.goalFormOpen()) this.closeGoalForm();
    if (this.active() === "cards") {
      const card = this.store.sections().cards.records.find((record) => record.id === id);
      const cardSection = card?.cardType === "CREDITO"
        ? "cardCredit"
        : card?.cardType === "DEBITO"
          ? "cardDebit"
          : card?.cardType === "VOUCHER"
            ? "cardVoucher"
            : null;
      if (cardSection) this.store.navigate(cardSection);
    }
    const previousId = this.store.selectedId();
    this.invoiceDetail.set(null);
    this.store.selectRecord(id);
    if (previousId !== id) this.triggerDetailReveal();
    if (this.active() === "accounts") this.store.setAccountTab("overview");
    if (this.cardSectionActive()) this.setCardTab("overview");
    if (this.active() === "categories" && previousId !== id) {
      this.store.setCategoryTab("overview");
    }
    const record = this.selectedRecord();
    if (record?.apiId && this.active() === "cardCredit") {
      this.updateCardUrl(record.apiId, this.store.cardTab());
    }
    if (record?.apiId && this.active() !== "cardCredit" && this.active() !== "overview") {
      this.updateRecordUrl(record.apiId);
    }
    if (record?.apiId && this.active() === "categories") {
      this.loadingTarget.set("detail");
      this.store.loadBudgets(record.apiId);
    }
  }
  clearSelection(): void {
    this.store.selectRecord(null);
    this.invoiceDetail.set(null);
    this.invoiceDetailRequestedId.set(null);
    this.closeMovementDetail();
    const accountId = this.activeAccountId();
    const active = this.active();
    const commands = accountId && this.isAccountDependent(active)
      ? ["/conta", accountId, this.sectionRoute(active)]
      : active === "overview"
        ? ["/visao-geral"]
        : [this.sectionRoute(active)];
    void this.router.navigate(commands, { replaceUrl: true });
  }
  onQueryInput(event: Event): void {
    this.setQuery((event.target as HTMLInputElement).value);
  }
  setQuery(query: string): void {
    this.store.setQuery(query);
  }
  reloadRecords(): void {
    this.loadingTarget.set("list");
    if (this.active() === "overview") {
      this.loadingTarget.set("detail");
      this.store.loadDashboard(true, this.store.overviewSelection().value);
      return;
    }
    if (this.active() === "statements" && this.statementMode() === "transactions") {
      this.loadTransactionRecords();
      return;
    }
    this.store.loadFromApi(true);
  }
  loadTransactionRecords(): void {
    const accountId = this.activeAccountId();
    if (!accountId) return;
    this.loadingTarget.set("list");
    this.store.loadTransactions(accountId, this.currentPeriod());
  }
  openStatementPanel(mode: "statements" | "transactions" = this.statementMode()): void {
    if (!this.activeAccountId()) return;
    if (this.statementDetailRevealTimer !== null) clearTimeout(this.statementDetailRevealTimer);
    this.statementDetailRevealTimer = null;
    this.statementMode.set(mode);
    this.statementDetail.set(null);
    this.statementDetailLoading.set(false);
    this.store.selectRecord(null);
    const queryFrom = this.route.snapshot.queryParamMap.get("dataInicial");
    const queryTo = this.route.snapshot.queryParamMap.get("dataFinal");
    const period = queryFrom && queryTo ? { dataInicial: queryFrom, dataFinal: queryTo } : this.currentPeriod();
    this.statementPeriodForm.reset({
      from: period.dataInicial,
      to: period.dataFinal,
    });
    this.statementPanelOpen.set(true);
    this.updatePeriodQuery({ dataInicial: period.dataInicial, dataFinal: period.dataFinal, consulta: mode === "transactions" ? "lancamentos" : "registros" });
    this.searchStatement();
  }
  openMovementDetail(record: FinanceRecord): void {
    if (this.statementMode() !== "statements" || !record.apiId) return;
    if (this.statementDetailRevealTimer !== null) clearTimeout(this.statementDetailRevealTimer);
    const loadingStartedAt = Date.now();
    this.statementDetail.set(null);
    this.statementDetailLoading.set(true);
    this.store.loadMovementDetail(record.apiId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((detail) => {
      const remainingLoadingTime = Math.max(0, 3000 - (Date.now() - loadingStartedAt));
      this.statementDetailRevealTimer = setTimeout(() => {
        this.statementDetail.set(detail);
        this.statementDetailLoading.set(false);
        this.statementDetailRevealTimer = null;
      }, remainingLoadingTime);
    });
  }
  closeMovementDetail(): void {
    if (this.statementDetailRevealTimer !== null) {
      clearTimeout(this.statementDetailRevealTimer);
      this.statementDetailRevealTimer = null;
    }
    this.statementDetail.set(null);
    this.statementDetailLoading.set(false);
  }
  openMovementResult(accountId: string, date: string): void {
    this.store.setActiveAccountId(accountId);
    this.store.navigate("statements");
    this.statementMode.set("statements");
    this.statementPeriodForm.reset({ from: date, to: date });
    this.statementPanelOpen.set(true);
    void this.router.navigate(["/conta", accountId, this.sectionRoute("statements")], { queryParams: { dataInicial: date, dataFinal: date, consulta: "registros" }, replaceUrl: true });
    this.searchStatement();
  }
  closeStatementPanel(): void {
    this.statementPanelOpen.set(false);
    if (this.statementDetailRevealTimer !== null) clearTimeout(this.statementDetailRevealTimer);
    this.statementDetailRevealTimer = null;
    this.statementDetail.set(null);
    this.statementDetailLoading.set(false);
  }
  applyStatementPeriodPreset(preset: "current" | "previous3" | "previous6" | "next3" | "next6" | "next12"): void {
    const ranges = {
      current: [0, 0],
      previous3: [-3, -1],
      previous6: [-6, -1],
      next3: [1, 3],
      next6: [1, 6],
      next12: [1, 12],
    } as const;
    const [startOffset, endOffset] = ranges[preset];
    const start = this.monthFromCurrent(startOffset);
    const end = this.monthFromCurrent(endOffset);
    this.statementPeriodForm.patchValue({
      from: this.periodForMonth(start).dataInicial,
      to: this.periodForMonth(end).dataFinal,
    });
    this.updatePeriodQuery({ dataInicial: this.periodForMonth(start).dataInicial, dataFinal: this.periodForMonth(end).dataFinal, consulta: this.statementMode() === "transactions" ? "lancamentos" : "registros" });
  }
  searchStatement(): void {
    const accountId = this.activeAccountId();
    const period = this.statementPeriodForm.getRawValue();
    if (
      !accountId ||
      this.statementPeriodForm.invalid ||
      !period.from ||
      !period.to ||
      period.from > period.to
    ) {
      this.statementPeriodForm.markAllAsTouched();
      return;
    }
    this.loadingTarget.set("detail");
    const selectedPeriod = {
      dataInicial: period.from,
      dataFinal: period.to,
    };
    this.updatePeriodQuery({ dataInicial: selectedPeriod.dataInicial, dataFinal: selectedPeriod.dataFinal, consulta: this.statementMode() === "transactions" ? "lancamentos" : "registros" });
    if (this.statementMode() === "transactions")
      this.store.loadTransactions(accountId, selectedPeriod);
    else this.store.loadAccountMovements(accountId, selectedPeriod);
  }
  updateEntryPeriod(period: { from: string; to: string }): void {
    this.entryPeriodForm.setValue(period);
  }
  searchAccountEntries(): void {
    const record = this.selectedRecord();
    const period = this.entryPeriodForm.getRawValue();
    if (!record?.apiId || !period.from || !period.to || period.from > period.to) {
      return;
    }
    this.loadingTarget.set("detail");
    this.store.loadAccountEntries(record.apiId, {
      dataInicial: period.from,
      dataFinal: period.to,
    });
  }
  toggleListFilters(): void {
    this.listFiltersOpen.update((open) => !open);
  }
  updateListFilter(key: "sort" | "type" | "from" | "to" | "accountId" | "goalStatus" | "category", event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const current = this.store.filters();
    if (key === "sort") this.store.setFilters({ ...current, sort: value as Filters["sort"] });
    else if (key === "type") this.store.setFilters({ ...current, type: value as Filters["type"] });
    else if (key === "goalStatus") this.store.setFilters({ ...current, goalStatus: value as Filters["goalStatus"] });
    else this.store.setFilters({ ...current, [key]: value });
  }
  listSortOptions(): Array<{ value: Filters["sort"]; label: string }> {
    const standard = { value: "recent" as const, label: "Padrão" };
    switch (this.active()) {
      case "accounts": return [standard, { value: "az", label: "Banco A-Z" }, { value: "higher", label: "Maior saldo" }, { value: "lower", label: "Menor saldo" }, { value: "creditHigh", label: "Mais crédito disponível" }, { value: "creditLow", label: "Menos crédito disponível" }];
      case "cards": case "cardCredit": case "cardDebit": case "cardVoucher": return [standard, { value: "az", label: "Apelido A-Z" }, { value: "higher", label: "Maior limite ou saldo" }, { value: "lower", label: "Menor limite ou saldo" }];
      case "categories": return [{ value: "az", label: "Nome A-Z" }, { value: "recent", label: "Padrão" }];
      case "investments": return [standard, { value: "az", label: "Categoria A-Z" }, { value: "higher", label: "Maior valor atual" }, { value: "lower", label: "Menor valor atual" }, { value: "rateHigh", label: "Maior taxa mensal" }, { value: "rateLow", label: "Menor taxa mensal" }, { value: "oldest", label: "Início mais antigo" }];
      case "goals": return [standard, { value: "dueSoon", label: "Conclusão mais próxima" }, { value: "dueLate", label: "Conclusão mais distante" }, { value: "higher", label: "Maior valor alvo" }, { value: "lower", label: "Menor valor alvo" }, { value: "progressHigh", label: "Maior progresso" }, { value: "progressLow", label: "Menor progresso" }, { value: "az", label: "Objetivo A-Z" }];
      case "budgets": return [standard, { value: "oldest", label: "Mês mais antigo" }, { value: "higher", label: "Maior limite" }, { value: "lower", label: "Menor limite" }, { value: "usageHigh", label: "Maior utilização" }, { value: "usageLow", label: "Menor utilização" }, { value: "az", label: "Categoria A-Z" }];
      default: return [standard, { value: "oldest", label: "Mais antigos" }, { value: "higher", label: "Maior valor" }, { value: "lower", label: "Menor valor" }, { value: "az", label: "Nome A-Z" }];
    }
  }
  listCategoryOptions(): string[] {
    if (!["investments", "goals", "budgets"].includes(this.active())) return [];
    return [...new Set(this.store.sections()[this.active()].records.map((record) => record.title).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }
  hasListFilters(): boolean {
    const filters = this.store.filters();
    return filters.type !== "all" || filters.category !== "all" || filters.accountId !== "all" || filters.goalStatus !== "all" || !!filters.from || !!filters.to || filters.sort !== "recent" || (this.cardSectionActive() && this.selectedCardTypes().size !== this.cardTypes.length);
  }
  clearListFilters(): void {
    this.store.setFilters({ type: "all", category: "all", accountId: "all", goalStatus: "all", from: "", to: "", sort: "recent" });
    this.selectedCardTypes.set(new Set(this.cardTypes.map((type) => type.value)));
  }
  toggleCardType(type: string): void {
    const selected = new Set(this.selectedCardTypes());
    if (selected.has(type)) selected.delete(type);
    else selected.add(type);
    this.selectedCardTypes.set(selected);
  }
  setAccountTab(tab: "overview" | "movements" | "entries"): void {
    this.store.setAccountTab(tab);
    this.updateTabUrl(tab);
    const record = this.selectedRecord();
    if (record?.apiId && tab !== "overview") {
      this.loadingTarget.set("detail");
      const period = this.currentPeriod();
      if (tab === "movements")
        this.store.loadAccountMovements(record.apiId, period);
      else {
        this.entryPeriodForm.reset({
          from: period.dataInicial,
          to: period.dataFinal,
        });
        this.store.loadAccountEntries(record.apiId, period);
      }
    }
  }
  setCardTab(tab: "overview" | "invoices"): void {
    this.store.setCardTab(tab);
    this.invoiceDetail.set(null);
    if (tab === "invoices") {
      this.store.clearInvoices();
      this.invoicePeriodRange.set(null);
    }
    const record = this.selectedRecord();
    if (record?.apiId && this.activeAccountId()) this.updateCardUrl(record.apiId, tab);
    if (tab === "overview" && record?.apiId && record.cardType === "CREDITO") {
      this.loadingTarget.set("detail");
      const accountId = this.activeAccountId();
      if (accountId) this.store.loadInvoices(accountId, record.apiId, this.periodForMonth(this.invoiceMonth()));
    }
    if (tab === "invoices" && record?.apiId && record.cardType === "CREDITO") this.loadRouteCardInvoices(record.apiId);
  }
  private loadRouteCardInvoices(cardId: string): void {
    const accountId = this.activeAccountId();
    if (!accountId) return;
    this.loadingTarget.set("detail");
    this.store.loadInvoices(accountId, cardId, this.periodForMonth(this.invoiceMonth()));
  }
  setInvoiceMonth(month: string): void {
    if (!month) return;
    this.invoiceMonth.set(month);
    this.invoicePeriodRange.set(null);
    const period = this.periodForMonth(month);
    this.updatePeriodQuery({ dataInicial: period.dataInicial, dataFinal: period.dataFinal, consulta: "faturas" });
  }
  invoicePeriodForFilter(): { from: string; to: string } {
    const period = this.invoicePeriodRange() ?? this.periodForMonth(this.invoiceMonth());
    return { from: period.dataInicial, to: period.dataFinal };
  }
  setInvoicePeriod(period: { from: string; to: string }): void {
    if (!period.from || !period.to) return;
    this.invoicePeriodRange.set({ dataInicial: period.from, dataFinal: period.to });
    this.invoiceMonth.set(period.from.slice(0, 7));
    this.updatePeriodQuery({ dataInicial: period.from, dataFinal: period.to, consulta: "faturas" });
  }
  applyInvoicePeriodPreset(preset: "current" | "previous3" | "previous6" | "next3" | "next6" | "next12"): void {
    const ranges = {
      current: [0, 0],
      previous3: [-3, -1],
      previous6: [-6, -1],
      next3: [1, 3],
      next6: [1, 6],
      next12: [1, 12],
    } as const;
    const [startOffset, endOffset] = ranges[preset];
    const start = this.monthFromCurrent(startOffset);
    const end = this.monthFromCurrent(endOffset);
    this.invoiceMonth.set(start);
    this.invoicePeriodRange.set({
      dataInicial: this.periodForMonth(start).dataInicial,
      dataFinal: this.periodForMonth(end).dataFinal,
    });
    this.updatePeriodQuery({ dataInicial: this.periodForMonth(start).dataInicial, dataFinal: this.periodForMonth(end).dataFinal, consulta: "faturas" });
  }
  searchInvoices(): void {
    const record = this.selectedRecord();
    if (!record?.apiId || record.cardType !== "CREDITO") return;
    this.loadingTarget.set("detail");
    const period = this.invoicePeriodRange() ?? this.periodForMonth(this.invoiceMonth());
    this.updatePeriodQuery({ dataInicial: period.dataInicial, dataFinal: period.dataFinal, consulta: "faturas" });
    const accountId = this.activeAccountId();
    if (accountId) this.store.loadInvoices(accountId, record.apiId, period);
  }
  openInvoiceDetail(invoice: FinanceRecord): void {
    if (!invoice.apiId) return;
    this.loadingTarget.set("detail");
    const cardId = this.selectedRecord()?.apiId;
    const accountId = this.activeAccountId();
    if (cardId && accountId) {
      void this.router.navigate(["/conta", accountId, "cartoes", cardId, "faturas", invoice.apiId], {
        queryParams: { dataInicial: this.invoicePeriodForFilter().from, dataFinal: this.invoicePeriodForFilter().to, consulta: "faturas" },
        replaceUrl: true,
      });
    }
    this.loadInvoiceDetailById(invoice.apiId);
  }
  private loadInvoiceDetailById(invoiceId: string): void {
    this.invoiceDetailRequestedId.set(invoiceId);
    this.loadingTarget.set("detail");
    const cardId = this.selectedRecord()?.apiId;
    const accountId = this.activeAccountId();
    if (!cardId || !accountId) return;
    this.store.loadInvoiceDetail(accountId, cardId, invoiceId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((detail) => {
      if (detail) this.invoiceDetail.set(detail);
    });
  }
  payInvoice(invoiceId: string): void {
    this.store.payInvoice(invoiceId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((paid) => {
      if (paid) this.loadInvoiceDetailById(invoiceId);
    });
  }
  closeInvoiceDetail(): void {
    this.invoiceDetail.set(null);
    this.invoiceDetailRequestedId.set(null);
    const cardId = this.selectedRecord()?.apiId;
    const accountId = this.activeAccountId();
    if (cardId && accountId) {
      void this.router.navigate(["/conta", accountId, "cartoes", cardId, "faturas"], {
        queryParamsHandling: "merge",
        replaceUrl: true,
      });
    }
  }
  setOverviewTab(tab: "summary" | "invoices" | "budgets" | "movements" | "accounts" | "entries" | "investments" | "goals"): void {
    this.overviewTab.set(tab);
    this.updateOverviewUrl(this.store.overviewSelection().value, tab);
  }
  private updateOverviewUrl(mesReferencia: string, aba: "summary" | "invoices" | "budgets" | "movements" | "accounts" | "entries" | "investments" | "goals"): void {
    if (this.active() !== "overview") return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mesReferencia, aba: this.tabToUrl(aba) },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }
  private updateTabUrl(aba: string): void {
    const urlTab = this.active() === "accounts"
      ? this.accountTabToUrl(aba)
      : this.active() === "categories"
        ? this.categoryTabToUrl(aba)
        : this.tabToUrl(aba);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: urlTab },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }
  private isOverviewMonth(value: string | null): value is string {
    return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  }
  private readOverviewTabFromUrl(): "summary" | "invoices" | "budgets" | "movements" | "accounts" | "entries" | "investments" | "goals" {
    const value = this.tabFromUrl(this.route.snapshot.queryParamMap.get("aba"));
    return ["summary", "invoices", "budgets", "movements", "accounts", "entries", "investments", "goals"].includes(value)
      ? value as "summary" | "invoices" | "budgets" | "movements" | "accounts" | "entries" | "investments" | "goals"
      : "summary";
  }
  private tabFromUrl(value: string | null): string {
    const tabs: Record<string, string> = {
      resumo: "summary", summary: "summary",
      faturas: "invoices", invoices: "invoices",
      orcamentos: "budgets", budgets: "budgets",
      movimentacoes: "movements", movements: "movements",
      contas: "accounts", accounts: "accounts",
      lancamentos: "entries", entries: "entries",
      investimentos: "investments", investments: "investments",
      metas: "goals", goals: "goals",
      "visao-geral": "overview", overview: "overview",
    };
    return tabs[value ?? ""] ?? "";
  }
  private tabToUrl(tab: string): string {
    return {
      summary: "resumo", invoices: "faturas", budgets: "orcamentos",
      movements: "movimentacoes", accounts: "contas", entries: "lancamentos",
      investments: "investimentos", goals: "metas", overview: "visao-geral",
    }[tab] ?? tab;
  }
  private accountTabToUrl(tab: string): string {
    return { overview: "visao-geral", movements: "movimentacoes", entries: "lancamentos" }[tab] ?? this.tabToUrl(tab);
  }
  private categoryTabToUrl(tab: string): string {
    return { overview: "visao-geral", budgets: "orcamentos" }[tab] ?? this.tabToUrl(tab);
  }
  setCategoryTab(tab: CategoryTab): void {
    this.store.setCategoryTab(tab);
    this.updateTabUrl(tab);
    const record = this.selectedRecord();
    if (record?.apiId && tab === "budgets") {
      this.loadingTarget.set("detail");
      this.store.loadBudgets(record.apiId);
    }
  }
  openGoalForm(): void {
    this.closeModal();
    this.store.clearError();
    this.store.selectRecord(null);
    this.store.startEditing(null);
    this.entryForm.controls.amount.setValidators([Validators.required, Validators.min(0.01)]);
    this.entryForm.controls.category.clearValidators();
    this.entryForm.controls.amount.updateValueAndValidity();
    this.entryForm.controls.category.updateValueAndValidity();
    this.entryForm.reset({ title: "", amount: null, date: null, category: "", notes: "" });
    this.goalFormOpen.set(true);
  }
  closeGoalForm(): void {
    if (this.goalSaving()) return;
    this.goalFormOpen.set(false);
    this.store.startEditing(null);
    this.entryForm.controls.amount.setValidators([Validators.required, Validators.min(0)]);
    this.entryForm.controls.date.setValidators(Validators.required);
    this.entryForm.controls.category.setValidators(Validators.required);
    this.entryForm.reset({ title: "", amount: null, date: null, category: "", notes: "" });
    this.entryForm.updateValueAndValidity();
  }
  saveGoal(): void {
    if (this.entryForm.invalid || this.goalSaving()) {
      this.entryForm.markAllAsTouched();
      return;
    }
    const value = this.entryForm.getRawValue();
    if (value.amount === null || value.date === null) return;
    this.goalSaving.set(true);
    this.store.saveRecord({
      title: value.title.trim(),
      category: "Meta financeira",
      amount: value.amount,
      date: value.date,
      notes: "",
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((saved) => {
      this.goalSaving.set(false);
      if (saved) this.closeGoalForm();
    });
  }
  openModal(record?: FinanceRecord): void {
    if (this.active() === "categories" && !record) {
      this.openCategoryForm();
      return;
    }
    if (record && this.active() === "accounts") { this.openAccountEdit(record); return; }
    if (record && ["cards", "cardCredit", "cardDebit", "cardVoucher"].includes(this.active())) { this.openCardEdit(record); return; }
    if (record && this.active() === "investments") { this.openInvestmentEdit(record); return; }
    this.store.startEditing(record?.id ?? null);
    if (this.active() === "goals") {
      this.entryForm.controls.amount.setValidators([Validators.required, Validators.min(0.01)]);
      this.entryForm.controls.category.clearValidators();
      this.entryForm.controls.amount.updateValueAndValidity();
      this.entryForm.controls.category.updateValueAndValidity();
    }
    if (this.active() === "statements" && record) {
      this.entryForm.controls.amount.clearValidators();
      this.entryForm.controls.date.clearValidators();
      this.entryForm.controls.category.clearValidators();
      this.entryForm.controls.amount.updateValueAndValidity();
      this.entryForm.controls.date.updateValueAndValidity();
      this.entryForm.controls.category.updateValueAndValidity();
    }
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
    this.entryForm.controls.amount.setValidators([Validators.required, Validators.min(0)]);
    this.entryForm.controls.date.setValidators(Validators.required);
    this.entryForm.controls.category.setValidators(Validators.required);
    this.entryForm.updateValueAndValidity();
  }
  save(): void {
    if (this.entryForm.invalid) return;
    const value = this.entryForm.getRawValue();
    if (this.active() !== "statements" && (value.amount === null || value.date === null)) return;
    this.store.saveRecord({
      ...value,
      amount: value.amount ?? undefined,
      date: value.date ?? undefined,
      title: value.title.trim(),
      category: value.category.trim(),
      notes: value.notes.trim(),
    }).subscribe((saved) => {
      if (saved) {
        if (this.active() === "statements" && this.editingId()) this.statementDetail.update((current) => current && current.id === this.editingId() ? { ...current, title: value.title.trim(), notes: value.title.trim() } : current);
        this.closeModal();
      }
    });
  }
  toggleMovementRecurrence(record: FinanceRecord): void {
    if (!record.apiId) return;
    const active = !record.recurring;
    this.store.updateMovementRecurrence(record.apiId, { ativa: active }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((saved) => {
      if (saved) this.statementDetail.update((current) => current && current.apiId === record.apiId ? { ...current, recurring: active, nextRecurrence: active ? current.nextRecurrence : undefined } : current);
    });
  }
  openMovementAside(): void {
    const accountId = this.activeAccountId();
    if (!accountId) return;
    this.store.loadSection("accounts");
    this.store.loadSection("categories");
    this.store.loadSection("cards");
    if (this.categoryFormOpen() && !this.categorySaving())
      this.closeCategoryForm();
    this.store.clearError();
    this.movementAsideOpen.set(true);
    this.categoryPickerOpen.set(false);
    this.paymentPickerOpen.set(false);
    this.movementForm.reset({
      type: "",
      amount: null,
      accountId,
      categoryId: "",
      cardId: "",
      method: "",
      date: this.currentDate,
      description: "",
      recurring: false,
      installments: 1,
    });
  }
  loadAccountsForPicker(): void {
    this.store.loadSection("accounts");
  }
  selectActiveAccount(accountId: string): void {
    this.store.setActiveAccountId(accountId || null);
    this.updateAccountUrl(accountId || null);
    if (this.movementAsideOpen())
      this.movementForm.controls.accountId.setValue(accountId);
    if (accountId && this.active() === "accounts")
      this.store.selectRecord(accountId);
  }
  updateAccountUrl(accountId: string | null): void {
    if (accountId && this.isAccountDependent(this.active())) {
      void this.router.navigate(["/conta", accountId, this.sectionRoute(this.active())], {
        replaceUrl: true,
      });
    } else {
      void this.router.navigate(
        this.active() === "overview" ? ["/visao-geral"] : [this.sectionRoute(this.active())],
        { replaceUrl: true },
      );
    }
  }
  updateCardUrl(cardId: string, tab: "overview" | "invoices"): void {
    const accountId = this.activeAccountId();
    if (!accountId || this.active() !== "cardCredit") return;
    void this.router.navigate(
      tab === "invoices"
        ? ["/conta", accountId, "cartoes", cardId, "faturas"]
        : ["/conta", accountId, "cartoes", cardId],
      { queryParams: { aba: this.tabToUrl(tab) }, queryParamsHandling: "merge", replaceUrl: true },
    );
  }
  closeMovementAside(): void {
    if (!this.movementSaving()) {
      this.movementAsideOpen.set(false);
      this.categoryPickerOpen.set(false);
      this.paymentPickerOpen.set(false);
      this.movementForm.reset({
        type: "",
        amount: null,
        accountId: "",
        categoryId: "",
        cardId: "",
        method: "",
        date: "",
        description: "",
        recurring: false,
        installments: 1,
      });
    }
  }
  toggleCategoryPicker(): void {
    this.categoryPickerOpen.update((open) => !open);
  }
  selectMovementCategory(categoryId: string | undefined): void {
    if (!categoryId) return;
    this.movementForm.controls.categoryId.setValue(categoryId);
    this.movementForm.controls.categoryId.markAsTouched();
    this.categoryPickerOpen.set(false);
  }
  clearMovementCategory(event: Event): void {
    event.stopPropagation();
    this.movementForm.controls.categoryId.setValue("");
    this.movementForm.controls.categoryId.markAsTouched();
    this.categoryPickerOpen.set(false);
  }
  movementCards(): FinanceRecord[] {
    const accountId = this.movementForm.controls.accountId.value;
    const method = this.movementForm.controls.method.value;
    const cardType =
      method === "CARTAO_CREDITO"
        ? "CREDITO"
        : method === "CARTAO_DEBITO"
          ? "DEBITO"
          : null;
    return this.store
      .sections()
      .cards.records.filter(
        (card) =>
          card.accountId === accountId &&
          (!cardType || card.cardType === cardType),
      );
  }
  selectedMovementCategory(): FinanceRecord | null {
    const id = this.movementForm.controls.categoryId.value;
    return (
      this.movementCategories().find((category) => category.apiId === id) ??
      null
    );
  }
  togglePaymentPicker(): void {
    this.paymentPickerOpen.update((open) => !open);
  }
  selectMovementPayment(method: MovementMethod): void {
    this.movementForm.controls.method.setValue(method);
    if (method !== "CARTAO_CREDITO" && method !== "CARTAO_DEBITO") {
      this.movementForm.controls.cardId.setValue("");
    }
    this.movementForm.controls.method.markAsTouched();
    this.syncMovementConditionalValidation();
    this.paymentPickerOpen.set(false);
  }
  clearMovementPayment(event: Event): void {
    event.stopPropagation();
    this.movementForm.controls.method.setValue("");
    this.movementForm.controls.cardId.setValue("");
    this.movementForm.controls.method.markAsTouched();
    this.syncMovementConditionalValidation();
    this.paymentPickerOpen.set(false);
  }
  syncMovementConditionalValidation(): void {
    const method = this.movementForm.controls.method.value;
    const cardRequired =
      method === "CARTAO_CREDITO" || method === "CARTAO_DEBITO";
    const installmentsRequired = method === "CARTAO_CREDITO";
    this.movementForm.controls.cardId.setValidators(
      cardRequired ? [Validators.required] : [],
    );
    this.movementForm.controls.installments.setValidators(
      installmentsRequired
        ? [Validators.required, Validators.min(1)]
        : [Validators.min(1)],
    );
    this.movementForm.controls.cardId.updateValueAndValidity({
      emitEvent: false,
    });
    this.movementForm.controls.installments.updateValueAndValidity({
      emitEvent: false,
    });
  }
  selectedMovementPayment(): {
    value: MovementMethod;
    label: string;
    icon: string;
  } | null {
    const method = this.movementForm.controls.method.value;
    return (
      this.movementPaymentMethods.find((payment) => payment.value === method) ??
      null
    );
  }
  saveMovement(): void {
    if (!this.activeAccountId()) return;
    this.syncMovementConditionalValidation();
    if (this.movementForm.invalid || this.movementSaving()) {
      this.movementForm.markAllAsTouched();
      return;
    }
    const value = this.movementForm.getRawValue();
    if (!value.type || !value.method || value.amount === null) return;
    const cardPayment =
      value.method === "CARTAO_CREDITO" || value.method === "CARTAO_DEBITO";
    if (cardPayment && !value.cardId) {
      this.movementForm.controls.cardId.markAsTouched();
      return;
    }
    const creditCardPayment = value.method === "CARTAO_CREDITO";
    if (
      creditCardPayment &&
      (!value.installments || value.installments < 1)
    ) {
      this.movementForm.controls.installments.markAsTouched();
      return;
    }
    const body: MovementRequest = {
      valorTotal: Math.abs(value.amount),
      metodoPagamento: value.method,
      categoriaId: value.categoryId,
      dataLancamento: value.date,
      ...(value.description.trim()
        ? { descricao: value.description.trim() }
        : {}),
      ehRecorrente: value.recurring,
      ...(creditCardPayment && value.installments
        ? { quantidadeParcelas: value.installments }
        : {}),
      ...(cardPayment && value.cardId ? { cartaoId: value.cardId } : {}),
    };
    this.movementSaving.set(true);
    this.store.createMovement(value.accountId, body).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.movementSaving.set(false);
        if (created) {
          this.closeMovementAside();
          this.openMovementResult(value.accountId, value.date || this.currentDate);
        }
      },
      error: () => this.movementSaving.set(false),
    });
  }
  openCategoryForm(): void {
    this.store.selectRecord(null);
    this.store.clearError();
    this.categoryEditingId.set(null);
    this.categoryFormOpen.set(true);
    this.categoryForm.reset({ name: "", type: "", color: "", icon: "" });
  }
  editCategory(record: FinanceRecord): void {
    const categoryId = record.apiId ?? record.id;
    if (!categoryId) return;
    this.store.clearError();
    this.store.selectRecord(null);
    this.categoryEditingId.set(categoryId);
    this.categoryFormOpen.set(true);
    this.categoryForm.reset({
      name: record.title,
      type: record.type === "income" ? "ENTRADA" : "SAIDA",
      color: record.color ?? "#ed3114",
      icon: record.icon ?? "sell",
    });
  }
  createCategoryFromMovement(): void {
    this.categoryPickerOpen.set(false);
    this.closeMovementAside();
    this.navigate({ key: "categories", label: "Categorias", icon: "sell" });
    this.openCategoryForm();
  }
  openAccountForm(): void {
    this.accountEditingId.set(null);
    this.store.selectRecord(null);
    this.store.clearError();
    this.accountFormOpen.set(true);
    this.accountForm.reset({ bankName: "", creditTotal: 0, currentBalance: 0 });
  }
  openAccountEdit(record: FinanceRecord): void {
    if (!record.apiId) return;
    this.store.clearError();
    this.accountEditingId.set(record.apiId);
    this.accountFormOpen.set(true);
    this.accountForm.reset({ bankName: record.title, creditTotal: 0, currentBalance: 0 });
  }
  openCardForm(): void {
    this.cardEditingId.set(null);
    this.store.loadSection("accounts");
    this.store.selectRecord(null);
    this.store.clearError();
    this.cardFormOpen.set(true);
    const type =
      this.active() === "cardCredit"
        ? "CREDITO"
        : this.active() === "cardDebit"
          ? "DEBITO"
          : this.active() === "cardVoucher"
            ? "VOUCHER"
            : "";
    this.cardForm.reset({
      nickname: "",
      type,
      accountId: this.activeAccountId() ?? "",
      creditLimit: "",
      closingDay: null,
      dueDay: null,
      voucherType: "VA_VR",
      rechargeAmount: "",
      rechargeDay: null,
    });
  }
  openCardEdit(record: FinanceRecord): void {
    if (!record.apiId || !record.accountId || !["CREDITO", "DEBITO", "VOUCHER"].includes(record.cardType ?? "")) return;
    this.store.clearError();
    this.cardEditingId.set(record.apiId);
    this.cardFormOpen.set(true);
    this.cardForm.reset({
      nickname: record.title,
      type: record.cardType!,
      accountId: record.accountId,
      creditLimit: record.creditLimit === undefined ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(record.creditLimit),
      closingDay: record.closingDay ?? null,
      dueDay: record.dueDay ?? null,
      voucherType: record.voucherType ?? "VA_VR",
      rechargeAmount: record.rechargeAmount === undefined ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(record.rechargeAmount),
      rechargeDay: record.rechargeDay ?? null,
    });
  }
  selectCardType(type: "CREDITO" | "DEBITO" | "VOUCHER"): void {
    this.cardForm.controls.type.setValue(type);
    this.cardForm.controls.type.markAsTouched();
  }
  cardFormAccountTitle(): string {
    const id = this.cardForm.controls.accountId.value;
    return this.movementAccounts().find((account) => account.apiId === id)?.title ?? this.activeAccountTitle();
  }
  selectCardAccount(accountId: string | undefined): void {
    if (accountId) {
      this.cardForm.controls.accountId.setValue(accountId);
      this.cardForm.controls.accountId.markAsTouched();
    }
  }
  selectCardVoucherType(type: "VA_VR" | "CREDITO_VOUNCHER"): void {
    this.cardForm.controls.voucherType.setValue(type);
  }
  isDueDayDisabled(day: number): boolean {
    const closingDay = this.cardForm.controls.closingDay.value;
    return closingDay !== null && day <= closingDay;
  }
  updateDueDayOptions(): void {
    const closingDay = this.cardForm.controls.closingDay.value;
    document
      .querySelectorAll<HTMLButtonElement>(
        ".card-specific-fields .card-day-fieldset:nth-of-type(2) .card-day-options button",
      )
      .forEach((button, index) => {
        button.disabled = closingDay !== null && index + 1 <= closingDay;
      });
  }
  selectCardDay(
    control: "closingDay" | "dueDay" | "rechargeDay",
    day: number,
  ): void {
    if (control === "dueDay" && this.isDueDayDisabled(day)) return;
    this.cardForm.controls[control].setValue(day);
    this.cardForm.controls[control].markAsTouched();
    if (control === "closingDay") this.updateDueDayOptions();
    if (
      control === "closingDay" &&
      this.cardForm.controls.dueDay.value !== null &&
      this.cardForm.controls.dueDay.value <= day
    ) {
      this.cardForm.controls.dueDay.setValue(null);
      this.cardForm.controls.dueDay.markAsTouched();
    }
  }
  formatCardMoney(
    event: Event,
    control: "creditLimit" | "rechargeAmount",
  ): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, "");
    const formatted = digits
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(Number(digits) / 100)
      : "";
    this.cardForm.controls[control].setValue(formatted);
    input.value = formatted;
  }
  parseCardMoney(value: string): number | null {
    const digits = value.replace(/\D/g, "");
    return digits ? Number(digits) / 100 : null;
  }
  closeCardForm(): void {
    if (!this.cardSaving()) {
      this.cardFormOpen.set(false);
      this.cardEditingId.set(null);
      this.cardForm.reset({
        nickname: "",
        type: "",
        accountId: "",
        creditLimit: "",
        closingDay: null,
        dueDay: null,
        voucherType: "VA_VR",
        rechargeAmount: "",
        rechargeDay: null,
      });
    }
  }
  saveCard(): void {
    if (this.cardForm.invalid || this.cardSaving()) {
      this.cardForm.markAllAsTouched();
      return;
    }
    const value = this.cardForm.getRawValue();
    const type = value.type as CardRequest["tipoCartao"];
    const validDay = (day: number | null): day is number =>
      day !== null && Number.isInteger(day) && day >= 1 && day <= 31;
    const creditLimit = this.parseCardMoney(value.creditLimit);
    const rechargeAmount = this.parseCardMoney(value.rechargeAmount);
    if (
      type === "CREDITO" &&
      (creditLimit === null ||
        creditLimit <= 0 ||
        !validDay(value.closingDay) ||
        !validDay(value.dueDay) ||
        value.dueDay <= value.closingDay)
    ) {
      this.cardForm.controls.creditLimit.markAsTouched();
      this.cardForm.controls.closingDay.markAsTouched();
      this.cardForm.controls.dueDay.markAsTouched();
      return;
    }
    if (
      type === "VOUCHER" &&
      (rechargeAmount === null ||
        rechargeAmount <= 0 ||
        !validDay(value.rechargeDay))
    ) {
      this.cardForm.controls.rechargeAmount.markAsTouched();
      this.cardForm.controls.rechargeDay.markAsTouched();
      return;
    }
    const request: CardRequest = {
      tipoCartao: type,
      contaBancariaId: value.accountId,
      apelido: value.nickname.trim(),
    };
    if (type === "CREDITO")
      request.cartaoCredito = {
        limiteCredito: creditLimit!,
        diaFechamento: value.closingDay!,
        diaVencimento: value.dueDay!,
      };
    if (type === "VOUCHER")
      request.cartaoVoucher = {
        tipoVoucher: value.voucherType as "VA_VR" | "CREDITO_VOUNCHER",
        valorRecarga: rechargeAmount!,
        diaRecarga: value.rechargeDay!,
      };
    const editingId = this.cardEditingId();
    const previousIds = new Set(
      this.store.sections().cards.records.map((record) => record.id),
    );
    this.cardSaving.set(true);
    (editingId ? this.store.updateCard(editingId, request) : this.store.createCard(request)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.cardSaving.set(false);
        if (saved) {
          if (!editingId) { const newId = this.newRecordId("cards", previousIds); this.closeCardForm(); this.triggerCreatedRecordPop(newId); }
          else { this.closeCardForm(); }
        }
      },
      error: () => this.cardSaving.set(false),
    });
  }
  openBudgetForm(record?: FinanceRecord): void {
    if (!this.selectedRecord()?.apiId) return;
    this.store.clearError();
    this.budgetEditingId.set(record?.apiId ?? null);
    this.setCategoryTab("budgets");
    this.budgetFormOpen.set(true);
    this.budgetForm.reset({ limit: record?.amount ?? null });
  }
  openInvestmentForm(): void {
    this.investmentEditingId.set(null);
    this.store.selectRecord(null);
    this.store.clearError();
    this.investmentFormOpen.set(true);
    this.investmentForm.reset({
      category: "",
      startDate: this.currentDate,
      initialAmount: null,
      currentAmount: null,
      interestRate: null,
    });
  }
  openInvestmentEdit(record: FinanceRecord): void {
    if (!record.apiId) return;
    this.store.clearError();
    this.investmentEditingId.set(record.apiId);
    this.investmentFormOpen.set(true);
    this.investmentForm.reset({ category: record.title, startDate: record.date || this.currentDate, initialAmount: record.initialAmount ?? null, currentAmount: record.currentAmount ?? record.amount ?? null, interestRate: record.interestRate ?? null });
  }
  closeInvestmentForm(): void {
    if (!this.investmentSaving()) {
      this.investmentFormOpen.set(false);
      this.investmentEditingId.set(null);
      this.investmentForm.reset({
        category: "",
        startDate: this.currentDate,
        initialAmount: null,
        currentAmount: null,
        interestRate: null,
      });
    }
  }
  saveInvestment(): void {
    if (this.investmentForm.invalid || this.investmentSaving()) {
      this.investmentForm.markAllAsTouched();
      return;
    }
    const value = this.investmentForm.getRawValue();
    const editingId = this.investmentEditingId();
    const request: InvestmentRequest = {
      categoria: value.category.trim(),
      jurosAoMes: value.interestRate!,
      ...(!editingId && value.startDate ? { dataInicio: value.startDate } : {}),
      ...(!editingId && value.initialAmount !== null ? { valorInicial: value.initialAmount } : {}),
      ...(value.currentAmount !== null ? { valorCorrente: value.currentAmount } : {}),
    };
    const previousIds = new Set(
      this.store.sections().investments.records.map((record) => record.id),
    );
    this.investmentSaving.set(true);
    (editingId ? this.store.updateInvestment(editingId, request) : this.store.createInvestment(request)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.investmentSaving.set(false);
        if (saved) {
          if (!editingId) { const newId = this.newRecordId("investments", previousIds); this.closeInvestmentForm(); this.triggerCreatedRecordPop(newId); }
          else this.closeInvestmentForm();
        }
      },
      error: () => this.investmentSaving.set(false),
    });
  }
  closeBudgetForm(): void {
    if (!this.budgetSaving()) {
      this.budgetFormOpen.set(false);
      this.budgetEditingId.set(null);
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
    const editingId = this.budgetEditingId();
    (editingId ? this.store.updateBudget(categoryId, editingId, request) : this.store.createBudget(categoryId, request)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
      this.accountEditingId.set(null);
      this.accountForm.reset({
        bankName: "",
        creditTotal: 0,
        currentBalance: 0,
      });
    }
  }
  saveAccount(): void {
    if (this.accountForm.invalid || this.accountSaving()) {
      this.accountForm.markAllAsTouched();
      return;
    }
    const value = this.accountForm.getRawValue();
    const editingId = this.accountEditingId();
    const previousIds = new Set(this.store.sections().accounts.records.map((record) => record.id));
    this.accountSaving.set(true);
    (editingId
      ? this.store.updateAccount(editingId, { nomeDoBanco: value.bankName.trim() })
      : this.store.createAccount({ nomeDoBanco: value.bankName.trim(), creditoTotal: value.creditTotal, saldoCorrente: value.currentBalance }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.accountSaving.set(false);
          if (created) {
            if (!editingId) { const newId = this.newRecordId("accounts", previousIds); this.closeAccountForm(); this.triggerCreatedRecordPop(newId); }
            else this.closeAccountForm();
          }
        },
        error: () => this.accountSaving.set(false),
      });
  }
  closeCategoryForm(): void {
    if (!this.categorySaving()) {
      const categoryId = this.categoryEditingId();
      if (categoryId) this.store.selectRecord(categoryId);
      this.categoryFormOpen.set(false);
      this.categoryEditingId.set(null);
      this.categoryForm.reset({ name: "", type: "", color: "", icon: "" });
    }
  }
  selectCategoryColor(color: string): void {
    this.categoryForm.controls.color.setValue(color);
    this.categoryForm.controls.color.markAsTouched();
  }
  formatCategoryIconInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const caret = input.selectionStart ?? value.length;
    const formatted = this.toCategoryIconName(value);
    if (formatted === value) return;

    const formattedCaret = this.toCategoryIconName(value.slice(0, caret)).length;
    input.value = formatted;
    input.setSelectionRange(formattedCaret, formattedCaret);
    this.categoryForm.controls.icon.setValue(formatted);
  }
  private toCategoryIconName(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_")
      .toLowerCase();
  }
  saveCategory(): void {
    if (this.categoryForm.invalid || this.categorySaving()) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const value = this.categoryForm.getRawValue();
    if (!value.type) return;
    const categoryId = this.categoryEditingId();
    const previousIds = new Set(this.store.sections().categories.records.map((record) => record.id));
    const request = {
      nome: value.name.trim(),
      tipo: value.type,
      cor: value.color.trim(),
      icone: value.icon.trim(),
    };
    this.categorySaving.set(true);
    (categoryId
      ? this.store.updateCategory(categoryId, request)
      : this.store.createCategory(request))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.categorySaving.set(false);
          if (saved) {
            if (categoryId) {
              this.closeCategoryForm();
              return;
            }
            const newId = this.newRecordId("categories", previousIds);
            this.closeCategoryForm();
            this.triggerCreatedRecordPop(newId);
          }
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
    if (current === undefined || limit === undefined || limit <= 0) return null;
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
    const month = value.slice(0, 7);
    const date = new Date(`${month}-01T12:00:00`);
    return Number.isNaN(date.getTime())
      ? "Mês indisponível"
      : new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
        }).format(date);
  }
  dateReference(value: string | undefined): string {
    if (!value) return "Data indisponível";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("pt-BR").format(date);
  }
  categoryIcon(record: FinanceRecord): string {
    return record.icon ? this.toCategoryIconName(record.icon) || "sell" : "sell";
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
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(new Date(`${value}-01T12:00:00`))
      .toUpperCase();
  }
  dashboardMonthLabel(): string {
    const value = this.dashboardData()?.mesReferencia ?? this.store.overviewSelection().value;
    const date = new Date(`${value}-01T12:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date).toUpperCase();
  }
  dashboardInvoiceLabel(value: string | undefined): string {
    if (!value) return "Fatura";
    const date = new Date(`${value.slice(0, 7)}-01T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return `Fatura ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date)}`;
  }
  dashboardInvoiceDeadlineLabel(invoice: DashboardInvoice): string {
    const closingDate = invoice.dataFechamento;
    const dueDate = invoice.dataVencimento;
    if (closingDate && closingDate < this.currentDate) return `Vencimento: ${this.shortDate(dueDate)}`;
    return `Fechamento: ${this.shortDate(closingDate)}`;
  }
  dashboardInvoiceEntries(invoiceId: string | undefined) {
    if (!invoiceId) return [];
    return this.dashboardAllEntries().filter((entry) => entry.faturaId === invoiceId);
  }
  isDashboardInvoiceExpanded(invoiceId: string | undefined): boolean {
    return invoiceId ? !this.collapsedDashboardInvoices().has(invoiceId) : true;
  }
  toggleDashboardInvoice(invoiceId: string | undefined): void {
    if (!invoiceId) return;
    const collapsed = new Set(this.collapsedDashboardInvoices());
    if (collapsed.has(invoiceId)) collapsed.delete(invoiceId);
    else collapsed.add(invoiceId);
    this.collapsedDashboardInvoices.set(collapsed);
  }
  dashboardAccountCreditLabel(account: BankAccountResponse): string {
    const total = account.creditoTotal ?? 0;
    const used = account.creditoUsado ?? Math.max(total - (account.creditoRestante ?? 0), 0);
    const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    return `${format.format(used)}/${format.format(total)} (${percentage}%)`;
  }
  dashboardInvoiceCard(invoice: DashboardInvoice): FinanceRecord | null {
    return this.store.sections().cards.records.find((record) => record.apiId === invoice.cartaoId) ?? null;
  }
  dashboardInvoiceAccountId(invoice: DashboardInvoice): string | null {
    return this.dashboardInvoiceCard(invoice)?.accountId ?? null;
  }
  openDashboardCard(invoice: DashboardInvoice): void {
    const card = this.dashboardInvoiceCard(invoice);
    if (!card?.apiId || !card.accountId) {
      this.store.navigate("cardCredit");
      void this.router.navigate([this.sectionRoute("cardCredit")], { replaceUrl: true });
      return;
    }
    this.store.setActiveAccountId(card.accountId);
    this.store.navigate("cardCredit");
    this.store.selectRecord(card.id);
    void this.router.navigate(["/conta", card.accountId, "cartoes", card.apiId], { replaceUrl: true });
  }
  openDashboardAccount(invoice: DashboardInvoice): void {
    const accountId = this.dashboardInvoiceAccountId(invoice);
    if (!accountId) {
      this.store.navigate("accounts");
      void this.router.navigate([this.sectionRoute("accounts")], { replaceUrl: true });
      return;
    }
    this.openDashboardAccountById(accountId);
  }
  openDashboardAccountById(accountId: string | undefined): void {
    if (!accountId) {
      this.store.navigate("accounts");
      void this.router.navigate([this.sectionRoute("accounts")], { replaceUrl: true });
      return;
    }
    this.store.setActiveAccountId(accountId);
    this.store.navigate("accounts");
    this.store.selectRecord(accountId);
    void this.router.navigate(["/conta", accountId, this.sectionRoute("accounts")], { replaceUrl: true });
  }
  openDashboardResource(section: "investments" | "goals", id: string | undefined): void {
    this.store.navigate(section);
    void this.router.navigate(
      id ? [this.sectionRoute(section), id] : [this.sectionRoute(section)],
      { replaceUrl: true },
    );
  }
  openDashboardEntryInvoice(invoiceId: string | undefined): void {
    if (!invoiceId) return;

    const invoiceRecord = this.store.sections().invoices.records.find((record) => record.apiId === invoiceId);
    if (invoiceRecord) {
      this.openInvoiceDetail(invoiceRecord);
      return;
    }

    const invoice = this.dashboardUpcomingInvoices().find((item) => item.id === invoiceId);
    const accountId = this.route.snapshot.paramMap.get("accountId") ?? (invoice ? this.dashboardInvoiceAccountId(invoice) : null);
    const cardId = invoice?.cartaoId;
    if (accountId && cardId) {
      void this.router.navigate(["/conta", accountId, "cartoes", cardId, "faturas", invoiceId], {
        queryParams: { dataInicial: this.invoicePeriodForFilter().from, dataFinal: this.invoicePeriodForFilter().to, consulta: "faturas" },
        replaceUrl: true,
      });
      return;
    }

    if (invoice) this.openDashboardCard(invoice);
  }
  dashboardEntryInvoiceHref(invoiceId: string | undefined): string | null {
    if (!invoiceId) return null;
    const invoice = this.dashboardUpcomingInvoices().find((item) => item.id === invoiceId);
    const accountId = this.route.snapshot.paramMap.get("accountId") ?? (invoice ? this.dashboardInvoiceAccountId(invoice) : null);
    const cardId = invoice?.cartaoId;
    if (!accountId || !cardId) return null;
    return this.router.serializeUrl(this.router.createUrlTree(["/conta", accountId, "cartoes", cardId, "faturas", invoiceId], {
      queryParams: { dataInicial: this.invoicePeriodForFilter().from, dataFinal: this.invoicePeriodForFilter().to, consulta: "faturas" },
    }));
  }
  private currentPeriod(): { dataInicial: string; dataFinal: string } {
    return this.periodForMonth(this.store.overviewSelection().value);
  }
  private monthFromCurrent(offset: number): string {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  private periodForMonth(month: string): {
    dataInicial: string;
    dataFinal: string;
  } {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    return {
      dataInicial: `${month}-01`,
      dataFinal: `${month}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  listRecordIcon(record: { type: string; category?: string }): string {
    if (this.cardSectionActive())
      return record.category === "CREDITO"
        ? "credit_score"
        : record.category === "VOUCHER"
          ? "confirmation_number"
          : "payments";
    return this.active() === "accounts"
      ? "account_balance"
      : this.movementIcon(record);
  }
  statementPaymentLabel(method: string | undefined): string {
    return (
      this.movementPaymentMethods.find((payment) => payment.value === method)
        ?.label ?? "Método não informado"
    );
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
