import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";
import { logHttpError } from "../http/http-error.util";

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.currentToken();
  const authenticatedRequest = token && !request.url.endsWith("/auth/acessar")
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authenticatedRequest).pipe(catchError((error: HttpErrorResponse) => {
    logHttpError(error);
    if (error.status === 401 && !request.url.endsWith("/auth/acessar")) auth.unauthorized();
    return throwError(() => error);
  }));
};
