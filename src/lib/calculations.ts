import {
  BudgetGroup,
  BudgetLineItem,
  Language,
  MonthlyBudget,
  MonthlyTotals,
  TransactionEntry,
} from '../types/budget';
import { getItemLabel } from '../i18n/translations';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseNumberInput(raw: string): number {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return round2(Math.min(parsed, 10_000_000));
}

export function formatEUR(amount: number, lang: Language): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-IE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${formatted} EUR`;
}

export function sumGroup(
  items: BudgetLineItem[],
  group: BudgetGroup
): { budget: number; actual: number } {
  return items.reduce(
    (acc, item) => {
      if (item.group !== group) return acc;
      acc.budget = round2(acc.budget + (Number(item.budgetAmount) || 0));
      acc.actual = round2(acc.actual + (Number(item.actualAmount) || 0));
      return acc;
    },
    { budget: 0, actual: 0 }
  );
}

export function calculateMonthTotals(items: BudgetLineItem[]): MonthlyTotals {
  const income = sumGroup(items, 'income');
  const bills = sumGroup(items, 'bills');
  const variable = sumGroup(items, 'variable');
  const savings = sumGroup(items, 'savings');

  const totalExpensesBudget = round2(bills.budget + variable.budget);
  const totalExpensesActual = round2(bills.actual + variable.actual);

  const remainingBudget = round2(income.budget - totalExpensesBudget - savings.budget);
  const remainingActual = round2(income.actual - totalExpensesActual - savings.actual);

  const savingsRateBudget =
    income.budget > 0 ? round2((savings.budget / income.budget) * 100) : 0;
  const savingsRateActual =
    income.actual > 0 ? round2((savings.actual / income.actual) * 100) : 0;

  return {
    incomeBudget: income.budget,
    incomeActual: income.actual,
    billsBudget: bills.budget,
    billsActual: bills.actual,
    variableBudget: variable.budget,
    variableActual: variable.actual,
    savingsBudget: savings.budget,
    savingsActual: savings.actual,
    totalExpensesBudget,
    totalExpensesActual,
    remainingBudget,
    remainingActual,
    savingsRateBudget,
    savingsRateActual,
  };
}

/**
 * Clones recurring items from a prior month with NO balance carryover:
 * - Only keeps items marked `isRecurring: true`
 * - Resets `actualAmount` to 0
 * - Ensures `prev_month` ("Преден месец") budget & actual both reset to 0
 */
export function cloneMonthItemsWithoutCarryover(
  sourceItems: BudgetLineItem[]
): BudgetLineItem[] {
  return sourceItems
    .filter((item) => item.isRecurring)
    .map((item) => ({
      ...item,
      budgetAmount: item.key === 'prev_month' ? 0 : round2(item.budgetAmount),
      actualAmount: 0,
    }));
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1 + deltaMonths, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDefaultDateForMonth(monthKey: string): string {
  const today = getTodayISO();
  if (today.startsWith(monthKey)) return today;
  return `${monthKey}-01`;
}

export function exportMonthCSV(
  month: MonthlyBudget,
  transactions: TransactionEntry[],
  lang: Language
): void {
  const headers = ['Section', 'Description', 'DueDate', 'BudgetEUR', 'ActualEUR', 'Recurring'];
  const rows = month.items.map((item) => [
    item.group,
    `"${getItemLabel(item, lang).replace(/"/g, '""')}"`,
    item.dueDate || '',
    item.budgetAmount.toFixed(2),
    item.actualAmount.toFixed(2),
    item.isRecurring ? 'Yes' : 'No',
  ]);

  const txSection =
    transactions.length > 0
      ? [
          [],
          ['Logged Transactions'],
          ['Date', 'Category', 'Section', 'AmountEUR', 'Note'],
          ...transactions.map((tx) => {
            const matched = month.items.find((i) => i.id === tx.lineItemId);
            const label = matched ? getItemLabel(matched, lang) : tx.lineItemId;
            return [
              tx.date,
              `"${label.replace(/"/g, '""')}"`,
              tx.group,
              tx.amount.toFixed(2),
              `"${(tx.note || '').replace(/"/g, '""')}"`,
            ];
          }),
        ]
      : [];

  const csvContent = [headers, ...rows, ...txSection].map((r) => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `cashflow-${month.monthKey}.csv`);
}

export function exportAllMonthsJSON(months: MonthlyBudget[]): void {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), months }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  triggerDownload(blob, `cashflow-archive-${getTodayISO()}.json`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
