import { FinanceState, NavItem, SectionData, SectionKey } from "./finance.models";

const section = (key: SectionKey, title: string, subtitle: string, singular: string): SectionData => ({ key, title, subtitle, singular, records: [] });

export const sections: Record<SectionKey, SectionData> = {
  overview: section("overview", "Visão geral", "Um resumo completo das suas finanças.", "resumo"),
  transactions: section("transactions", "Lançamentos", "Acompanhe e organize suas movimentações.", "lançamento"),
  accounts: section("accounts", "Contas bancárias", "Gerencie seus saldos e instituições.", "conta bancária"),
  cards: section("cards", "Cartões", "Controle seus cartões e limites.", "cartão"),
  cardCredit: section("cardCredit", "Cartões > Crédito", "Acompanhe limites e compras no crédito.", "cartão de crédito"),
  cardDebit: section("cardDebit", "Cartões > Débito", "Gerencie os cartões vinculados às suas contas.", "cartão de débito"),
  cardVoucher: section("cardVoucher", "Cartões > Voucher", "Organize seus cartões de benefícios e vouchers.", "cartão voucher"),
  categories: section("categories", "Categorias", "Personalize a classificação financeira.", "categoria"),
  budgets: section("budgets", "Orçamentos", "Defina limites e acompanhe seus gastos.", "orçamento"),
  invoices: section("invoices", "Faturas", "Acompanhe seus pagamentos e vencimentos.", "fatura"),
  investments: section("investments", "Investimentos", "Acompanhe sua carteira e seus aportes.", "investimento"),
  goals: section("goals", "Meta financeira", "Planeje objetivos e acompanhe seu progresso.", "meta financeira"),
};

export const navigation: NavItem[] = [
  { key: "overview", label: "Visão geral", icon: "dashboard" },
  { key: "accounts", label: "Contas bancárias", icon: "account_balance" },
  { key: "cards", label: "Cartões", icon: "credit_card", children: [
    { key: "cardCredit", label: "Crédito", icon: "credit_score", children: [{ key: "invoices", label: "Faturas", icon: "description" }] },
    { key: "cardDebit", label: "Débito", icon: "payments" },
    { key: "cardVoucher", label: "Voucher", icon: "confirmation_number" },
  ] },
  { key: "transactions", label: "Lançamentos", icon: "receipt_long" },
  { key: "categories", label: "Categorias", icon: "sell" },
  { key: "budgets", label: "Orçamentos", icon: "pie_chart" },
  { key: "investments", label: "Investimentos", icon: "monitoring" },
  { key: "goals", label: "Meta financeira", icon: "flag" },
];

export const initialState: FinanceState = {
  sections,
  activeAccountId: null,
  active: "overview",
  selectedId: null,
  query: "",
  filters: { type: "all", category: "all", from: "", to: "", sort: "recent" },
  accountTab: "overview",
  cardTab: "overview",
  categoryTab: "overview",
  overviewSelection: { type: "month", value: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}` },
  editingId: null,
  loading: false,
  error: null,
};
