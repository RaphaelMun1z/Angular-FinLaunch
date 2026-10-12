export type CardType = "CREDITO" | "DEBITO" | "VOUCHER";
export type MovementMethod = "DINHEIRO" | "PIX" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "VOUNCHER" | "OUTRO";
export type CategoryType = "ENTRADA" | "SAIDA";
export type InvoiceStatus = "ABERTA" | "FECHADA" | "PAGA" | "VENCIDA";

export interface PeriodRequest { dataInicial: string; dataFinal: string; }
export interface LoginRequest { email: string; senha: string; }
export interface TokenDto { username?: string; created?: string; expiration?: string; accessToken: string; }
export interface LoginResponse { token: TokenDto; }
export interface UserDetailsResponse { id?: string; nomeCompleto?: string; email?: string; papel?: string; authorities?: string[]; }

export interface GoalRequest { objetivo: string; valorAlvo: number; valorAcumulado?: number; dataConclusaoPrevista: string; }
export interface GoalResponse extends GoalRequest { id?: string; }
export interface InvestmentRequest { categoria: string; dataInicio?: string; valorInicial?: number; valorCorrente?: number; jurosAoMes: number; }
export interface InvestmentResponse extends InvestmentRequest { id?: string; }
export interface BankAccountRequest { nomeDoBanco: string; saldoCorrente?: number; creditoTotal: number; creditoRestante?: number; }
export interface BankAccountResponse extends BankAccountRequest { id?: string; creditoUsado?: number; }

export interface MovementRequest { valorTotal: number; metodoPagamento: MovementMethod; categoriaId: string; dataLancamento?: string; descricao?: string; ehRecorrente?: boolean; quantidadeParcelas?: number; cartaoId?: string; }
export interface MovementResponse { id?: string; valorTotal?: number; dataLancamento?: string; descricao?: string; metodoPagamento?: MovementMethod; ehRecorrente?: boolean; qntParcelas?: number; categoriaId?: string; contaBancariaId?: string; }
export interface EntryResponse { valor?: number; dataLancamento?: string; descricao?: string; }
export interface CategoryRequest { nome: string; tipo: CategoryType; cor: string; icone: string; }
export interface BudgetRequest { valorLimite: number; valorCorrente?: number; }
export interface BudgetResponse { id?: string; mesReferencia?: string; valorLimite?: number; valorCorrente?: number; categoria?: string; }
export interface CategoryResponse { id?: string; nome?: string; tipo?: CategoryType; cor?: string; icone?: string; orcamento?: BudgetResponse; }

export interface CardCreditRequest { limiteCredito: number; diaFechamento: number; diaVencimento: number; }
export interface CardVoucherRequest { tipoVoucher: "VA_VR" | "CREDITO_VOUNCHER"; valorRecarga: number; diaRecarga: number; saldoCorrente?: number; }
export interface CardRequest { tipoCartao: CardType; contaBancariaId: string; apelido: string; cartaoCredito?: CardCreditRequest; cartaoVoucher?: CardVoucherRequest; }
export interface CardResponse { id?: string; apelido?: string; contaBancariaId?: string; tipoCartao?: CardType | "VA_VR" | "CREDITO_VOUNCHER"; limiteCredito?: number; diaFechamento?: number; diaVencimento?: number; diaRecarga?: number; valorRecarga?: number; saldoCorrente?: number; }
export interface InvoiceResponse { id?: string; valorTotal?: number; dataReferencia?: string; status?: InvoiceStatus; cartaoDeCreditoId?: string; }
