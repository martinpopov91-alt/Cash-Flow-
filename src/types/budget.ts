export type Language = 'en' | 'bg';
export type ThemeMode = 'light' | 'dark';
export type BudgetGroup = 'income' | 'bills' | 'variable' | 'savings';
export type HighlightType = 'none' | 'attention' | 'vault';

export type ActiveTab = 'overview' | 'ledger' | 'vaults' | 'trends';

export type RawCategoryGroup = 'variable' | 'fixed' | 'debt' | 'savings' | 'income';

export interface CategorySubitem {
  id: string;
  name: string;
  nameBg: string;
  icon: string;
}

export interface MainCategory {
  id: string;
  name: string;
  nameBg: string;
  group: RawCategoryGroup;
  color: string;
  icon: string;
  subcategories: CategorySubitem[];
}

export interface BudgetLineItem {
  id: string;
  group: BudgetGroup;
  key: string;
  labelEn: string;
  labelBg: string;
  dueDate: string;
  budgetAmount: number;
  actualAmount: number;
  isRecurring: boolean;
  highlightType: HighlightType;
  categoryId?: string;
  subcategoryId?: string;
}

export interface MonthlyBudget {
  monthKey: string; // YYYY-MM
  ownerId: string;
  year: number;
  month: number; // 1-12
  items: BudgetLineItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TransactionEntry {
  id: string;
  ownerId: string;
  monthKey: string;
  lineItemId: string;
  group: BudgetGroup;
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  categoryId?: string;
  subcategoryId?: string;
  subcategoryNameEn?: string;
  subcategoryNameBg?: string;
  createdAt?: unknown;
}

export interface UserSettings {
  uid: string;
  language: Language;
  theme: ThemeMode;
  currency: 'EUR';
  defaultSeeded: boolean;
  updatedAt?: unknown;
}

export interface MonthlyTotals {
  incomeBudget: number;
  incomeActual: number;
  billsBudget: number;
  billsActual: number;
  variableBudget: number;
  variableActual: number;
  savingsBudget: number;
  savingsActual: number;
  totalExpensesBudget: number;
  totalExpensesActual: number;
  remainingBudget: number;
  remainingActual: number;
  savingsRateBudget: number;
  savingsRateActual: number;
}
