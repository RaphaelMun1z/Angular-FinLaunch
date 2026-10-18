export type RecordType = "income" | "expense";
export type SectionKey =
  | "overview"
  | "transactions"
  | "accounts"
  | "cards"
  | "cardCredit"
  | "cardDebit"
  | "cardVoucher"
  | "categories"
  | "budgets"
  | "invoices"
  | "investments"
  | "goals";
export type AccountTab = "overview" | "movements" | "entries";
export type CategoryTab = "overview" | "budgets";
export type OverviewSelection =
  | { type: "day"; value: string }
  | { type: "month"; value: string };

export interface Movement {
  title: string;
  category: string;
  amount: number;
  date: string;
  type: RecordType;
}

export interface CategoryBudget {
  id?: string;
  month?: string;
  amount?: number;
  currentAmount?: number;
}

export interface FinanceRecord {
  id: string;
  apiId?: string;
  title: string;
  category: string;
  amount?: number;
  currentAmount?: number;
  initialAmount?: number;
  targetAmount?: number;
  accumulatedAmount?: number;
  creditTotal?: number;
  creditRemaining?: number;
  creditLimit?: number;
  balance?: number;
  accountId?: string;
  cardType?: string;
  closingDay?: number;
  dueDay?: number;
  rechargeDay?: number;
  rechargeAmount?: number;
  interestRate?: number;
  dueDate?: string;
  budget?: CategoryBudget;
  date?: string;
  type: RecordType;
  method?: string;
  icon?: string;
  color?: string;
  account?: string;
  notes?: string;
  status?: string;
  movements?: Movement[];
}

export interface SectionData {
  key: SectionKey;
  title: string;
  subtitle: string;
  singular: string;
  records: FinanceRecord[];
}

export interface NavItem {
  key: SectionKey;
  label: string;
  icon: string;
  children?: NavItem[];
}

export interface Filters {
  type: "all" | RecordType;
  category: string;
  from: string;
  to: string;
  sort: "recent" | "oldest" | "higher" | "lower" | "az";
}

export interface FinanceState {
  sections: Record<SectionKey, SectionData>;
  activeAccountId: string | null;
  active: SectionKey;
  selectedId: string | null;
  query: string;
  filters: Filters;
  accountTab: AccountTab;
  categoryTab: CategoryTab;
  overviewSelection: OverviewSelection;
  editingId: string | null;
  loading: boolean;
  error: string | null;
}
