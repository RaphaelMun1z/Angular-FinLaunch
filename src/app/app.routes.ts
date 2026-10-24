import { Routes } from "@angular/router";
import { FinanceShellComponent } from "./features/finance/finance-shell.component";
import { LoginComponent } from "./features/auth/login.component";
import { RegisterComponent } from "./features/auth/register.component";
import { UnauthorizedComponent } from "./features/auth/unauthorized.component";
import { authGuard, guestGuard } from "./core/auth/auth.guard";

export const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [guestGuard] },
  { path: "cadastro", component: RegisterComponent, canActivate: [guestGuard] },
  { path: "unauthorized", component: UnauthorizedComponent },
  { path: "", redirectTo: "visao-geral", pathMatch: "full" },
  { path: "conta/:accountId/cartoes/:cardId/faturas/:invoiceId", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: "conta/:accountId/cartoes/:cardId/faturas", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: "conta/:accountId/cartoes/:cardId", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: "conta/:accountId/:section/:recordId", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: "conta/:accountId/:section", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: ":section/:recordId", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: ":section", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: "**", redirectTo: "" },
];
