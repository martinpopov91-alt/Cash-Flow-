import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  BudgetGroup,
  Language,
  MonthlyBudget,
  TransactionEntry,
} from '../types/budget';
import { TRANSLATIONS, getGroupTitle, getItemLabel } from '../i18n/translations';
import {
  MAIN_CATEGORIES,
  findSubcategoryById,
  getMainCategoryName,
  getSubcategoryName,
  resolveItemMainCategory,
} from '../data/categories';
import { calculateMonthTotals, formatEUR, round2 } from '../lib/calculations';

interface DashboardViewProps {
  month: MonthlyBudget;
  transactions: TransactionEntry[];
  lang: Language;
  onQuickEntry: (group?: BudgetGroup, itemId?: string) => void;
  onDeleteTransaction: (tx: TransactionEntry) => Promise<void>;
  onOpenLedger: () => void;
}

const YARU_CHART_PALETTE = [
  '#E95420', // Ubuntu Orange
  '#77216F', // Canonical Aubergine
  '#0E8420', // Yaru Green
  '#3584E4', // GNOME Blue
  '#E99002', // Yaru Amber
  '#9141AC', // Yaru Purple
  '#5E5C64', // Warm Slate
  '#C7162B', // Yaru Crimson
];

export function DashboardView({
  month,
  transactions,
  lang,
  onQuickEntry,
  onDeleteTransaction,
  onOpenLedger,
}: DashboardViewProps) {
  const t = TRANSLATIONS[lang];
  const totals = useMemo(() => calculateMonthTotals(month.items), [month.items]);
  const [spendingMode, setSpendingMode] = useState<'budget' | 'actual'>('budget');
  const [spendingGrouping, setSpendingGrouping] = useState<'items' | 'categories'>('items');
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const allocationBars = useMemo(
    () => [
      {
        id: 'income',
        label: t.groupIncome,
        budget: totals.incomeBudget,
        actual: totals.incomeActual,
      },
      {
        id: 'bills',
        label: t.groupBills,
        budget: totals.billsBudget,
        actual: totals.billsActual,
      },
      {
        id: 'variable',
        label: t.groupVariable,
        budget: totals.variableBudget,
        actual: totals.variableActual,
      },
      {
        id: 'savings',
        label: t.groupSavings,
        budget: totals.savingsBudget,
        actual: totals.savingsActual,
      },
    ],
    [t, totals]
  );

  const maxBarValue = useMemo(() => {
    return Math.max(100, ...allocationBars.flatMap((b) => [b.budget, b.actual]));
  }, [allocationBars]);

  const categoryBreakdown = useMemo(() => {
    const expenseItems = month.items.filter(
      (i) => i.group === 'bills' || i.group === 'variable'
    );

    if (spendingGrouping === 'categories') {
      const groupedMap: Record<
        string,
        { sliceId: string; label: string; value: number; color: string }
      > = {};

      for (const item of expenseItems) {
        const val = spendingMode === 'budget' ? item.budgetAmount : item.actualAmount;
        if (val <= 0) continue;
        const cat = resolveItemMainCategory(item);
        if (!groupedMap[cat.id]) {
          groupedMap[cat.id] = {
            sliceId: cat.id,
            label: getMainCategoryName(cat, lang),
            value: 0,
            color: cat.color,
          };
        }
        groupedMap[cat.id].value = round2(groupedMap[cat.id].value + val);
      }

      const ranked = Object.values(groupedMap).sort((a, b) => b.value - a.value);
      const total = round2(ranked.reduce((s, r) => s + r.value, 0));

      return {
        total,
        slices: ranked.map((entry) => ({
          ...entry,
          percent: total > 0 ? Math.round((entry.value / total) * 100) : 0,
        })),
      };
    }

    const ranked = expenseItems
      .map((item) => ({
        sliceId: item.id,
        label: getItemLabel(item, lang),
        value: spendingMode === 'budget' ? item.budgetAmount : item.actualAmount,
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = round2(ranked.reduce((s, r) => s + r.value, 0));
    const top = ranked.slice(0, 6);
    const restSum = round2(ranked.slice(6).reduce((s, r) => s + r.value, 0));
    if (restSum > 0) {
      top.push({
        sliceId: 'other_categories',
        label: lang === 'bg' ? 'Други категории' : 'Other categories',
        value: restSum,
      });
    }

    return {
      total,
      slices: top.map((entry, idx) => ({
        ...entry,
        percent: total > 0 ? Math.round((entry.value / total) * 100) : 0,
        color: YARU_CHART_PALETTE[idx % YARU_CHART_PALETTE.length],
      })),
    };
  }, [month.items, lang, spendingMode, spendingGrouping]);

  const donutSegments = useMemo(() => {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return categoryBreakdown.slices.map((slice) => {
      const length =
        categoryBreakdown.total > 0
          ? (slice.value / categoryBreakdown.total) * circumference
          : 0;
      const seg = {
        ...slice,
        dashArray: `${length} ${circumference}`,
        dashOffset: -offset,
      };
      offset += length;
      return seg;
    });
  }, [categoryBreakdown]);

  const priorityBills = useMemo(() => {
    return month.items
      .filter((i) => i.group === 'bills')
      .sort((a, b) => {
        if (a.highlightType === 'attention' && b.highlightType !== 'attention') return -1;
        if (b.highlightType === 'attention' && a.highlightType !== 'attention') return 1;
        return b.budgetAmount - a.budgetAmount;
      })
      .slice(0, 5);
  }, [month.items]);

  const itemById = useMemo(() => {
    const map: Record<string, (typeof month.items)[number]> = {};
    month.items.forEach((i) => {
      map[i.id] = i;
    });
    return map;
  }, [month.items]);

  const remainingIsNegativeActual = totals.remainingActual < 0;
  const remainingIsNegativeBudget = totals.remainingBudget < 0;

  return (
    <div className="space-y-6">
      {/* 4-column Yaru KPI Window Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Income */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.totalIncome}
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#0E8420] dark:text-[#26A269] shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight">
            {formatEUR(totals.incomeActual, lang)}
          </p>
          <div className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] flex items-center justify-between text-xs text-[#5E5C64] dark:text-[#9A9996]">
            <span>{t.budgetLabel}</span>
            <span className="font-mono tabular-nums">{formatEUR(totals.incomeBudget, lang)}</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.totalExpenses}
            </span>
            <ArrowDownRight className="w-4 h-4 text-[#E95420] shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight">
            {formatEUR(totals.totalExpensesActual, lang)}
          </p>
          <div className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] flex items-center justify-between text-xs text-[#5E5C64] dark:text-[#9A9996]">
            <span>
              {t.budgetLabel} (
              {totals.totalExpensesActual > totals.totalExpensesBudget
                ? t.overBudget
                : t.onTrack}
              )
            </span>
            <span className="font-mono tabular-nums">
              {formatEUR(totals.totalExpensesBudget, lang)}
            </span>
          </div>
        </div>

        {/* Savings */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.totalSavings}
            </span>
            <span className="text-xs font-mono tabular-nums font-bold text-[#0E8420] dark:text-[#26A269]">
              {totals.savingsRateBudget}% {t.ofIncome}
            </span>
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight text-[#0E8420] dark:text-[#26A269]">
            {formatEUR(totals.savingsActual, lang)}
          </p>
          <div className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] flex items-center justify-between text-xs text-[#5E5C64] dark:text-[#9A9996]">
            <span>{t.vaultMonthlyTarget}</span>
            <span className="font-mono tabular-nums">{formatEUR(totals.savingsBudget, lang)}</span>
          </div>
        </div>

        {/* Remaining */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.remainingBalance}
            </span>
            <span
              className={`text-xs font-bold ${
                remainingIsNegativeActual
                  ? 'text-[#C7162B] dark:text-[#FF7B89]'
                  : 'text-[#E95420]'
              }`}
            >
              {remainingIsNegativeActual ? t.deficit : t.surplus}
            </span>
          </div>
          <p
            className={`font-mono tabular-nums text-2xl font-bold tracking-tight ${
              remainingIsNegativeActual ? 'text-[#C7162B] dark:text-[#FF7B89]' : ''
            }`}
          >
            {formatEUR(totals.remainingActual, lang)}
          </p>
          <div className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] flex items-center justify-between text-xs text-[#5E5C64] dark:text-[#9A9996]">
            <span>
              {t.budgetLabel} ({remainingIsNegativeBudget ? t.deficit : t.surplus})
            </span>
            <span className="font-mono tabular-nums">
              {formatEUR(totals.remainingBudget, lang)}
            </span>
          </div>
        </div>
      </section>

      {/* Main Charts Row: GNOME HeaderBar Window Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Budget vs Actual Window */}
        <div className="lg:col-span-7 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-bold">{t.chartCashFlowTitle}</h2>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                {t.chartCashFlowSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#5E5C64] dark:text-[#C0BFBC]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#CBC6C1] dark:bg-[#5E5C64]" />
                {t.budgetLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#E95420]" />
                {t.actualLabel}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-3 my-auto">
            {allocationBars.map((bar) => {
              const budgetPct = Math.min(100, (bar.budget / maxBarValue) * 100);
              const actualPct = Math.min(100, (bar.actual / maxBarValue) * 100);
              const isHovered = hoveredGroup === bar.id;

              return (
                <div
                  key={bar.id}
                  onMouseEnter={() => setHoveredGroup(bar.id)}
                  onMouseLeave={() => setHoveredGroup(null)}
                  className={`p-3 rounded-lg transition-colors ${
                    isHovered ? 'bg-[#F5F3F1] dark:bg-[#242424]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium">{bar.label}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums text-[#5E5C64] dark:text-[#C0BFBC]">
                      <span>
                        {t.actualLabel}:{' '}
                        <strong className="text-[#2B2929] dark:text-white">
                          {formatEUR(bar.actual, lang)}
                        </strong>
                      </span>
                      <span aria-hidden="true">/</span>
                      <span>{formatEUR(bar.budget, lang)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full rounded-full bg-[#ECE9E6] dark:bg-[#1B1B1B] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#BDB8B3] dark:bg-[#5E5C64] transition-all duration-300"
                        style={{ width: `${Math.max(bar.budget > 0 ? 2 : 0, budgetPct)}%` }}
                      />
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#ECE9E6] dark:bg-[#1B1B1B] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          bar.id === 'savings'
                            ? 'bg-[#0E8420] dark:bg-[#26A269]'
                            : bar.id === 'income'
                            ? 'bg-[#77216F] dark:bg-[#A8559F]'
                            : 'bg-[#E95420]'
                        }`}
                        style={{ width: `${Math.max(bar.actual > 0 ? 2 : 0, actualPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Spending Donut Window */}
        <div className="lg:col-span-5 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-bold">{t.chartSpendingTitle}</h2>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                {t.chartSpendingSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-[#E6E3DF] dark:bg-[#1B1B1B]">
                <button
                  type="button"
                  onClick={() => setSpendingGrouping('items')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    spendingGrouping === 'items'
                      ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                      : 'text-[#5E5C64] dark:text-[#9A9996]'
                  }`}
                >
                  {t.chartGroupItems}
                </button>
                <button
                  type="button"
                  onClick={() => setSpendingGrouping('categories')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    spendingGrouping === 'categories'
                      ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                      : 'text-[#5E5C64] dark:text-[#9A9996]'
                  }`}
                >
                  {t.chartGroupCategories}
                </button>
              </div>

              <div className="flex items-center p-0.5 rounded-lg bg-[#E6E3DF] dark:bg-[#1B1B1B]">
                <button
                  type="button"
                  onClick={() => setSpendingMode('budget')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    spendingMode === 'budget'
                      ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                      : 'text-[#5E5C64] dark:text-[#9A9996]'
                  }`}
                >
                  {t.budgetLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setSpendingMode('actual')}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    spendingMode === 'actual'
                      ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                      : 'text-[#5E5C64] dark:text-[#9A9996]'
                  }`}
                >
                  {t.actualLabel}
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-center">
            {categoryBreakdown.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-[#5E5C64] dark:text-[#9A9996] mb-4">{t.noDataYet}</p>
                <button
                  type="button"
                  onClick={() => onQuickEntry('variable')}
                  className="min-h-[40px] px-4 py-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] text-xs font-medium hover:bg-[#F5F3F1] dark:hover:bg-[#363636] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E95420]" />
                  <span>{t.quickEntry}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6">
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                    <circle
                      cx="70"
                      cy="70"
                      r="56"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="16"
                      className="text-[#ECE9E6] dark:text-[#1B1B1B]"
                    />
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.sliceId}
                        cx="70"
                        cy="70"
                        r="56"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="16"
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        className="transition-all duration-300"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                    <span className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                      {spendingMode === 'budget' ? t.budgetLabel : t.actualLabel}
                    </span>
                    <span className="font-mono tabular-nums text-xs font-bold">
                      {formatEUR(categoryBreakdown.total, lang)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2.5">
                  {categoryBreakdown.slices.map((slice) => (
                    <div
                      key={slice.sliceId}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate text-[#2B2929] dark:text-[#DEDDDA]">
                          {slice.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                        <span className="font-bold">{formatEUR(slice.value, lang)}</span>
                        <span className="text-[#5E5C64] dark:text-[#9A9996] w-8 text-right">
                          {slice.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Row: Priority Bills & Recent Transactions Windows */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Priority Bills Window */}
        <div className="lg:col-span-5 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-bold">{t.billsWatchlistTitle}</h2>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                {t.billsWatchlistSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLedger}
              className="text-xs font-medium text-[#E95420] hover:underline whitespace-nowrap cursor-pointer"
            >
              {t.navLedger}
            </button>
          </div>

          <div className="p-5 flex-1 divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
            {priorityBills.map((bill) => {
              const isPaid = bill.budgetAmount > 0 && bill.actualAmount >= bill.budgetAmount;
              const isAttention = bill.highlightType === 'attention';
              return (
                <div
                  key={bill.id}
                  className={`py-3 flex items-center justify-between gap-3 ${
                    isAttention
                      ? 'bg-[#E99002]/10 dark:bg-[#F5A623]/12 -mx-3 px-3 rounded-lg'
                      : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isAttention && (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#E99002] shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {getItemLabel(bill, lang)}
                      </span>
                    </div>
                    <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] mt-0.5">
                      {bill.dueDate ? `${t.colDueDate}: ${bill.dueDate} · ` : ''}
                      {isPaid ? t.funded : t.pending}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono tabular-nums">
                      <p className="text-sm font-bold">{formatEUR(bill.actualAmount, lang)}</p>
                      <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                        / {formatEUR(bill.budgetAmount, lang)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuickEntry('bills', bill.id)}
                      className="min-h-[34px] px-2.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] text-xs font-medium hover:bg-[#F5F3F1] dark:hover:bg-[#383838] cursor-pointer"
                    >
                      {t.logEntry}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Entries Window */}
        <div className="lg:col-span-7 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-bold">{t.recentEntriesTitle}</h2>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                {transactions.length} {lang === 'bg' ? 'записа за месеца' : 'entries this month'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onQuickEntry('variable')}
              className="min-h-[34px] px-3 py-1 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.quickEntry}</span>
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col">
            {transactions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-[#5E5C64] dark:text-[#9A9996] max-w-sm">
                  {t.recentEntriesEmpty}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A] max-h-80 overflow-y-auto">
                {transactions.map((tx) => {
                  const matchedItem = itemById[tx.lineItemId];
                  const subMatch = findSubcategoryById(
                    tx.subcategoryId || matchedItem?.subcategoryId
                  );
                  const mainCat =
                    subMatch?.category ||
                    (tx.categoryId
                      ? MAIN_CATEGORIES.find((c) => c.id === tx.categoryId)
                      : undefined) ||
                    (matchedItem ? resolveItemMainCategory(matchedItem) : undefined);

                  const entryTitle =
                    (subMatch ? getSubcategoryName(subMatch.subcategory, lang) : '') ||
                    (lang === 'bg'
                      ? tx.subcategoryNameBg || tx.subcategoryNameEn
                      : tx.subcategoryNameEn || tx.subcategoryNameBg) ||
                    (matchedItem ? getItemLabel(matchedItem, lang) : tx.lineItemId);

                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {mainCat && (
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: mainCat.color }}
                              title={getMainCategoryName(mainCat, lang)}
                            />
                          )}
                          <p className="text-sm font-medium truncate">{entryTitle}</p>
                        </div>
                        <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] truncate">
                          <span className="font-mono tabular-nums">{tx.date}</span>
                          {mainCat ? (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{getMainCategoryName(mainCat, lang)}</span>
                            </>
                          ) : null}
                          <span aria-hidden="true"> · </span>
                          <span>{getGroupTitle(tx.group, lang)}</span>
                          {tx.note ? (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{tx.note}</span>
                            </>
                          ) : null}
                        </p>
                      </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono tabular-nums text-sm font-bold ${
                          tx.group === 'income'
                            ? 'text-[#0E8420] dark:text-[#26A269]'
                            : tx.group === 'savings'
                            ? 'text-[#77216F] dark:text-[#D47CD0]'
                            : ''
                        }`}
                      >
                        {tx.group === 'income' ? '+' : ''}
                        {formatEUR(tx.amount, lang)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx)}
                        className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#77767B] hover:text-[#C7162B] dark:hover:text-[#FF7B89] hover:bg-[#F5F3F1] dark:hover:bg-[#383838] transition-colors cursor-pointer"
                        aria-label={t.deleteConfirm}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
