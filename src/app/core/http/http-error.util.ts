import { HttpErrorResponse } from "@angular/common/http";

const DEFAULT_MESSAGES: Record<number, string> = {
  0: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  400: "Não foi possível processar a solicitação. Verifique os dados informados.",
  401: "Sua sessão expirou. Faça login novamente.",
  403: "Você não tem permissão para realizar esta operação.",
  404: "O recurso solicitado não foi encontrado.",
  409: "Já existe um registro com essas informações.",
  422: "Alguns dados informados são inválidos. Verifique e tente novamente.",
  429: "Muitas solicitações realizadas. Tente novamente em instantes.",
};

export function toUserError(error: unknown): string {
  const response = error instanceof HttpErrorResponse ? error : null;
  const status = response?.status ?? readStatus(error);
  const backendMessage = readBackendMessage(response?.error);
  if (backendMessage && isSafeMessage(backendMessage)) return backendMessage;
  if (status >= 500 && status <= 599) return "Ocorreu um problema no servidor. Tente novamente mais tarde.";
  return DEFAULT_MESSAGES[status] ?? "Não foi possível concluir a operação. Tente novamente.";
}

export function logHttpError(error: unknown): void {
  if (typeof ngDevMode !== "undefined" && ngDevMode) console.error("Erro HTTP:", error);
}

function readStatus(error: unknown): number {
  const value = error as { status?: unknown };
  return typeof value.status === "number" ? value.status : 0;
}

function readBackendMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    try { return readBackendMessage(JSON.parse(payload)); } catch { return payload; }
  }
  if (Array.isArray(payload)) {
    const messages = payload.map(readBackendMessage).filter((message): message is string => Boolean(message));
    return messages.length > 0 ? messages.join(" ") : null;
  }
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  for (const key of ["message", "detail", "messages", "error", "errors"]) {
    const message = readBackendMessage(body[key]);
    if (message) return message;
  }
  const nestedMessages = Object.values(body).map(readBackendMessage).filter((message): message is string => Boolean(message));
  return nestedMessages.length > 0 ? nestedMessages.join(" ") : null;
}

function isSafeMessage(message: string): boolean {
  const normalized = message.trim();
  if (!normalized || normalized === "[object Object]" || normalized.length > 240) return false;
  return !/^(?:\d{3}\s+)?(?:forbidden|unauthorized|bad request|not found|internal server error)$/i.test(normalized)
    && !/(https?:\/\/|localhost:\d+|Http failure response| stack| at [\w$].*\(|Exception|Error:|SQLException|org\.springframework|java\.)/i.test(normalized);
}
