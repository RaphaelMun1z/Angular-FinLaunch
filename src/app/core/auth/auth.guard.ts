import { CanActivateFn } from "@angular/router";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "./auth.service";

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasValidToken()) return true;
  return router.createUrlTree([auth.hasToken() ? "/unauthorized" : "/login"]);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.hasValidToken() ? inject(Router).createUrlTree(["/overview"]) : true;
};
