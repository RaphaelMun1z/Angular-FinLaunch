import { Routes } from "@angular/router";
import { FinanceShellComponent } from "./features/finance/finance-shell.component";
import { LoginComponent } from "./features/auth/login.component";
import { UnauthorizedComponent } from "./features/auth/unauthorized.component";
import { authGuard, guestGuard } from "./core/auth/auth.guard";

export const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [guestGuard] },
  { path: "unauthorized", component: UnauthorizedComponent },
  { path: "", redirectTo: "overview", pathMatch: "full" },
  { path: ":section", component: FinanceShellComponent, canActivate: [authGuard] },
  { path: "**", redirectTo: "" },
];
