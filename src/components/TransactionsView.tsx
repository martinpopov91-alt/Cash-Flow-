import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Download,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  BudgetGroup,
  BudgetLineItem,
  CategorySubitem,
  Language,
  MainCategory,
  MonthlyBudget,
  TransactionEntry,
} from '../types/budget';
import {
  TRANSLATIONS,
  formatMonthTitle,
  getGroupTitle,
  getItemLabel,
} from '../i18n/translations';
import {
  MAIN_CATEGORIES,
  findSubcategoryById,
  getMainCategoryName,
  getSubcategoryName,
  mapCategoryGroupToLedgerGroup,
  resolveItemMainCategory,
} from '../data/categories';
import {
  formatEUR,
  getDefaultDateForMonth,
  getTodayISO,
  parseNumberInput,
  round2,
} from '../lib/calculations';

export interface TransactionFormPayload {
  lineItemId?: string;
  group: BudgetGroup;
  amount: number;
  note: string;
  date: string;
  categoryId?: string;
  subcategoryId?: string;
  subcategoryNameEn?: string;
  subcategoryNameBg?: string;
  newItem?: {
    labelEn: string;
    labelBg: string;
    categoryId: string;
    subcategoryId?: string;
  };
}

interface TransactionsViewProps {
  month: MonthlyBudget;
  transactions: TransactionEntry[];
  loading: boolean;
  lang: Language;
  onLogTransaction: (payload: TransactionFormPayload) => Promise<void>;
  onUpdateTransaction: (
    oldTx: TransactionEntry,
    payload: TransactionFormPayload
  ) => Promise<void>;
  onDeleteTransaction: (tx: TransactionEntry) => Promise<void>;
  onNotify: (msg: string) => void;
}

const GROUPS: BudgetGroup[] = ['variable', 'bills', 'income', 'savings'];

function getYesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayHeading(isoDate: string, lang: Language): string {
  const today = getTodayISO();
  const yesterday = getYesterdayISO();
  const parsed = new Date(`${isoDate}T12:00:00`);
  const formatted = Number.isNaN(parsed.getTime())
    ? isoDate
    : new Intl.DateTimeFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(parsed);

  if (isoDate === today) {
    return `${TRANSLATIONS[lang].txTodayBtn} · ${formatted}`;
  }
  if (isoDate === yesterday) {
    return `${TRANSLATIONS[lang].txYesterdayBtn} · ${formatted}`;
  }
  return formatted;
}

export function TransactionsView({
  month,
  transactions,
  loading,
  lang,
  onLogTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onNotify,
}: TransactionsViewProps) {
  const t = TRANSLATIONS[lang];
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Composer state
  const [editingTx, setEditingTx] = useState<TransactionEntry | null>(null);
  const [pickerMode, setPickerMode] = useState<'taxonomy' | 'existing'>('taxonomy');
  const [group, setGroup] = useState<BudgetGroup>('variable');
  const [lineItemId, setLineItemId] = useState<string>('');
  const [taxonomySearch, setTaxonomySearch] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [date, setDate] = useState<string>(() => getDefaultDateForMonth(month.monthKey));
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Filter & sort state
  const [typeFilter, setTypeFilter] = useState<'all' | 'expenses' | 'income' | 'savings'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest'>('newest');

  // Reset month-scoped date & editing state when switching months
  useEffect(() => {
    setEditingTx(null);
    setDate(getDefaultDateForMonth(month.monthKey));
    setDayFilter('');
  }, [month.monthKey]);

  const itemById = useMemo(() => {
    const map: Record<string, BudgetLineItem> = {};
    for (const item of month.items) {
      map[item.id] = item;
    }
    return map;
  }, [month.items]);

  const filteredItemsForGroup = useMemo(
    () => month.items.filter((i) => i.group === group),
    [month.items, group]
  );

  useEffect(() => {
    if (pickerMode !== 'existing') return;
    if (
      filteredItemsForGroup.length > 0 &&
      !filteredItemsForGroup.some((i) => i.id === lineItemId)
    ) {
      setLineItemId(filteredItemsForGroup[0].id);
    } else if (filteredItemsForGroup.length === 0) {
      setLineItemId('');
    }
  }, [pickerMode, filteredItemsForGroup, lineItemId]);

  const selectedExistingItem = useMemo(
    () => filteredItemsForGroup.find((i) => i.id === lineItemId) || null,
    [filteredItemsForGroup, lineItemId]
  );

  const selectedCategory = useMemo(
    () => MAIN_CATEGORIES.find((c) => c.id === selectedCategoryId) || null,
    [selectedCategoryId]
  );

  const selectedSubcategory = useMemo(
    () =>
      selectedCategory?.subcategories.find((s) => s.id === selectedSubcategoryId) || null,
    [selectedCategory, selectedSubcategoryId]
  );

  const orderedCategories = useMemo(() => {
    return [...MAIN_CATEGORIES].sort((a, b) => {
      const aMatch = mapCategoryGroupToLedgerGroup(a.group) === group ? 0 : 1;
      const bMatch = mapCategoryGroupToLedgerGroup(b.group) === group ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [group]);

  const searchMatches = useMemo(() => {
    const q = taxonomySearch.trim().toLowerCase();
    if (!q) return [];
    const results: { category: MainCategory; subcategory: CategorySubitem }[] = [];
    for (const cat of MAIN_CATEGORIES) {
      const catMatch =
        cat.name.toLowerCase().includes(q) || cat.nameBg.toLowerCase().includes(q);
      for (const sub of cat.subcategories) {
        const subMatch =
          sub.name.toLowerCase().includes(q) || sub.nameBg.toLowerCase().includes(q);
        if (catMatch || subMatch) {
          results.push({ category: cat, subcategory: sub });
        }
      }
    }
    return results.slice(0, 10);
  }, [taxonomySearch]);

  const matchedExistingFromTaxonomy = useMemo(() => {
    if (!selectedSubcategory) return null;
    return (
      month.items.find(
        (i) =>
          i.subcategoryId === selectedSubcategory.id ||
          i.labelEn.toLowerCase() === selectedSubcategory.name.toLowerCase() ||
          i.labelBg.toLowerCase() === selectedSubcategory.nameBg.toLowerCase()
      ) || null
    );
  }, [month.items, selectedSubcategory]);

  // Summary metrics from all logged transactions in the selected month
  const summary = useMemo(() => {
    let income = 0;
    let incomeCount = 0;
    let bills = 0;
    let variable = 0;
    let expenseCount = 0;
    let savings = 0;
    let savingsCount = 0;

    for (const tx of transactions) {
      if (tx.group === 'income') {
        income = round2(income + tx.amount);
        incomeCount += 1;
      } else if (tx.group === 'bills') {
        bills = round2(bills + tx.amount);
        expenseCount += 1;
      } else if (tx.group === 'variable') {
        variable = round2(variable + tx.amount);
        expenseCount += 1;
      } else if (tx.group === 'savings') {
        savings = round2(savings + tx.amount);
        savingsCount += 1;
      }
    }

    const totalExpenses = round2(bills + variable);
    const net = round2(income - totalExpenses - savings);

    return {
      income,
      incomeCount,
      bills,
      variable,
      totalExpenses,
      expenseCount,
      savings,
      savingsCount,
      net,
    };
  }, [transactions]);

  // Resolve display metadata helper
  function resolveTxMeta(tx: TransactionEntry) {
    const matchedItem = itemById[tx.lineItemId];
    const subMatch = findSubcategoryById(tx.subcategoryId || matchedItem?.subcategoryId);
    const mainCat =
      subMatch?.category ||
      (tx.categoryId ? MAIN_CATEGORIES.find((c) => c.id === tx.categoryId) : undefined) ||
      (matchedItem ? resolveItemMainCategory(matchedItem) : undefined);

    const title =
      (subMatch ? getSubcategoryName(subMatch.subcategory, lang) : '') ||
      (lang === 'bg'
        ? tx.subcategoryNameBg || tx.subcategoryNameEn
        : tx.subcategoryNameEn || tx.subcategoryNameBg) ||
      (matchedItem ? getItemLabel(matchedItem, lang) : tx.lineItemId);

    return { matchedItem, subMatch, mainCat, title };
  }

  // Filtered & sorted transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = transactions.filter((tx) => {
      if (typeFilter === 'expenses' && tx.group !== 'bills' && tx.group !== 'variable') {
        return false;
      }
      if (typeFilter === 'income' && tx.group !== 'income') return false;
      if (typeFilter === 'savings' && tx.group !== 'savings') return false;
      if (dayFilter && tx.date !== dayFilter) return false;

      const meta = resolveTxMeta(tx);
      if (categoryFilter !== 'all' && meta.mainCat?.id !== categoryFilter) {
        return false;
      }

      if (!q) return true;
      const catName = meta.mainCat ? getMainCategoryName(meta.mainCat, lang).toLowerCase() : '';
      const groupName = getGroupTitle(tx.group, lang).toLowerCase();
      return (
        meta.title.toLowerCase().includes(q) ||
        catName.includes(q) ||
        groupName.includes(q) ||
        (tx.note || '').toLowerCase().includes(q) ||
        tx.date.includes(q)
      );
    });

    const sorted = [...list];
    if (sortBy === 'oldest') {
      sorted.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.id.localeCompare(b.id);
      });
    } else if (sortBy === 'highest') {
      sorted.sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        return b.date.localeCompare(a.date);
      });
    } else {
      sorted.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.id.localeCompare(a.id);
      });
    }
    return sorted;
  }, [transactions, typeFilter, categoryFilter, dayFilter, searchQuery, sortBy, itemById, lang]);

  // Daily grouped view (when sorting by newest or oldest)
  const groupedDays = useMemo(() => {
    if (sortBy === 'highest') return null;

    const groups: {
      date: string;
      items: TransactionEntry[];
      incomeTotal: number;
      outflowTotal: number;
    }[] = [];
    const byDate: Record<string, (typeof groups)[number]> = {};

    for (const tx of filteredTransactions) {
      if (!byDate[tx.date]) {
        const bucket = {
          date: tx.date,
          items: [],
          incomeTotal: 0,
          outflowTotal: 0,
        };
        byDate[tx.date] = bucket;
        groups.push(bucket);
      }
      byDate[tx.date].items.push(tx);
      if (tx.group === 'income') {
        byDate[tx.date].incomeTotal = round2(byDate[tx.date].incomeTotal + tx.amount);
      } else {
        byDate[tx.date].outflowTotal = round2(byDate[tx.date].outflowTotal + tx.amount);
      }
    }
    return groups;
  }, [filteredTransactions, sortBy]);

  function resetForm() {
    setEditingTx(null);
    setPickerMode('taxonomy');
    setGroup('variable');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setTaxonomySearch('');
    setAmountStr('');
    setDate(getDefaultDateForMonth(month.monthKey));
    setNote('');
  }

  function startEditing(tx: TransactionEntry) {
    setEditingTx(tx);
    setGroup(tx.group);
    setAmountStr(String(tx.amount));
    setDate(tx.date);
    setNote(tx.note || '');
    setTaxonomySearch('');

    const matchedItem = itemById[tx.lineItemId];
    const subMatch = findSubcategoryById(tx.subcategoryId || matchedItem?.subcategoryId);
    if (subMatch) {
      setPickerMode('taxonomy');
      setSelectedCategoryId(subMatch.category.id);
      setSelectedSubcategoryId(subMatch.subcategory.id);
    } else if (matchedItem) {
      setPickerMode('existing');
      setLineItemId(matchedItem.id);
      const cat = resolveItemMainCategory(matchedItem);
      setSelectedCategoryId(cat.id);
      setSelectedSubcategoryId('');
    } else {
      setPickerMode('taxonomy');
      setSelectedCategoryId(tx.categoryId || '');
      setSelectedSubcategoryId(tx.subcategoryId || '');
    }

    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });
  }

  function applySubcategory(cat: MainCategory, sub: CategorySubitem) {
    setPickerMode('taxonomy');
    setSelectedCategoryId(cat.id);
    setSelectedSubcategoryId(sub.id);
    setGroup(mapCategoryGroupToLedgerGroup(cat.group));
    setTaxonomySearch('');
    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });
  }

  function handleMainCategoryChange(nextCatId: string) {
    setSelectedCategoryId(nextCatId);
    if (!nextCatId) {
      setSelectedSubcategoryId('');
      return;
    }
    const cat = MAIN_CATEGORIES.find((c) => c.id === nextCatId);
    if (cat) {
      setGroup(mapCategoryGroupToLedgerGroup(cat.group));
      if (cat.subcategories.length === 1) {
        setSelectedSubcategoryId(cat.subcategories[0].id);
      } else {
        setSelectedSubcategoryId('');
      }
    } else {
      setSelectedSubcategoryId('');
    }
  }

  const parsedAmount = parseNumberInput(amountStr);
  const canSubmit =
    parsedAmount > 0 &&
    date.length === 10 &&
    !saving &&
    (pickerMode === 'existing'
      ? Boolean(selectedExistingItem)
      : Boolean(selectedCategory && selectedSubcategory));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      let payload: TransactionFormPayload | null = null;

      if (pickerMode === 'existing' && selectedExistingItem) {
        const cat = resolveItemMainCategory(selectedExistingItem);
        const subMatch = findSubcategoryById(selectedExistingItem.subcategoryId);
        payload = {
          lineItemId: selectedExistingItem.id,
          group,
          amount: parsedAmount,
          note,
          date,
          categoryId: (subMatch?.category || cat).id,
          subcategoryId: subMatch?.subcategory.id || selectedExistingItem.subcategoryId,
          subcategoryNameEn: subMatch?.subcategory.name || selectedExistingItem.labelEn,
          subcategoryNameBg: subMatch?.subcategory.nameBg || selectedExistingItem.labelBg,
        };
      } else if (selectedCategory && selectedSubcategory) {
        if (matchedExistingFromTaxonomy) {
          payload = {
            lineItemId: matchedExistingFromTaxonomy.id,
            group,
            amount: parsedAmount,
            note,
            date,
            categoryId: selectedCategory.id,
            subcategoryId: selectedSubcategory.id,
            subcategoryNameEn: selectedSubcategory.name,
            subcategoryNameBg: selectedSubcategory.nameBg,
          };
        } else {
          payload = {
            group,
            amount: parsedAmount,
            note,
            date,
            categoryId: selectedCategory.id,
            subcategoryId: selectedSubcategory.id,
            subcategoryNameEn: selectedSubcategory.name,
            subcategoryNameBg: selectedSubcategory.nameBg,
            newItem: {
              labelEn: selectedSubcategory.name,
              labelBg: selectedSubcategory.nameBg,
              categoryId: selectedCategory.id,
              subcategoryId: selectedSubcategory.id,
            },
          };
        }
      }

      if (!payload) return;

      if (editingTx) {
        await onUpdateTransaction(editingTx, payload);
        onNotify(t.toastTxUpdated);
      } else {
        await onLogTransaction(payload);
        onNotify(t.toastEntrySaved);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const header = ['Date', 'Section', 'MainCategory', 'Item', 'AmountEUR', 'Note'];
    const rows = filteredTransactions.map((tx) => {
      const meta = resolveTxMeta(tx);
      const catName = meta.mainCat ? getMainCategoryName(meta.mainCat, lang) : '';
      const signed = tx.group === 'income' ? tx.amount.toFixed(2) : (-tx.amount).toFixed(2);
      return [
        tx.date,
        tx.group,
        `"${catName.replace(/"/g, '""')}"`,
        `"${meta.title.replace(/"/g, '""')}"`,
        signed,
        `"${(tx.note || '').replace(/"/g, '""')}"`,
      ];
    });
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashflow-transactions-${month.monthKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(t.toastExported);
  }

  const hasActiveFilters =
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    dayFilter !== '' ||
    searchQuery.trim() !== '';

  function renderTransactionRow(tx: TransactionEntry) {
    const meta = resolveTxMeta(tx);
    const isEditingThis = editingTx?.id === tx.id;

    return (
      <div
        key={tx.id}
        className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 transition-colors ${
          isEditingThis
            ? 'bg-[#E95420]/8 dark:bg-[#E95420]/15'
            : 'hover:bg-[#F7F6F5] dark:hover:bg-[#333333]'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {meta.mainCat && (
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: meta.mainCat.color }}
                title={getMainCategoryName(meta.mainCat, lang)}
              />
            )}
            <p className="text-sm font-medium truncate">{meta.title}</p>
          </div>

          <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] truncate mt-0.5">
            {sortBy === 'highest' && (
              <>
                <span className="font-mono tabular-nums">{tx.date}</span>
                <span aria-hidden="true"> · </span>
              </>
            )}
            {meta.mainCat && (
              <>
                <span>{getMainCategoryName(meta.mainCat, lang)}</span>
                <span aria-hidden="true"> · </span>
              </>
            )}
            <span>{getGroupTitle(tx.group, lang)}</span>
            {tx.note && (
              <>
                <span aria-hidden="true"> · </span>
                <span>{tx.note}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span
            className={`font-mono tabular-nums text-sm font-bold whitespace-nowrap ${
              tx.group === 'income'
                ? 'text-[#0E8420] dark:text-[#26A269]'
                : tx.group === 'savings'
                ? 'text-[#77216F] dark:text-[#D47CD0]'
                : ''
            }`}
          >
            {tx.group === 'income' ? '+' : tx.group === 'savings' ? '' : '-'}
            {formatEUR(tx.amount, lang)}
          </span>

          <button
            type="button"
            onClick={() => startEditing(tx)}
            className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#77767B] hover:text-[#2B2929] dark:hover:text-white hover:bg-[#EFECE8] dark:hover:bg-[#383838] transition-colors cursor-pointer"
            aria-label={t.sideLogEdit}
            title={t.sideLogEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={async () => {
              await onDeleteTransaction(tx);
              if (editingTx?.id === tx.id) resetForm();
              onNotify(t.toastEntryRemoved);
            }}
            className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#77767B] hover:text-[#C7162B] dark:hover:text-[#FF7B89] hover:bg-[#EFECE8] dark:hover:bg-[#383838] transition-colors cursor-pointer"
            aria-label={t.deleteConfirm}
            title={t.deleteConfirm}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">{t.txTabTitle}</h2>
            <span className="text-xs text-[#5E5C64] dark:text-[#9A9996]">
              · {formatMonthTitle(month.monthKey, lang)} ·{' '}
              <span className="font-mono tabular-nums">{transactions.length}</span>{' '}
              {transactions.length === 1 ? t.txEntrySingular : t.txEntriesCount}
            </span>
          </div>
          <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] mt-0.5">{t.txTabSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredTransactions.length === 0}
          className="min-h-[38px] px-3.5 py-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#2C2C2C] text-xs font-medium flex items-center gap-2 hover:bg-[#F5F3F1] dark:hover:bg-[#383838] transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#E95420]" />
          <span>{t.txExportCsv}</span>
        </button>
      </section>

      {/* 4-Column Summary KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.txDailyIncome}
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#0E8420] dark:text-[#26A269] shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight text-[#0E8420] dark:text-[#26A269]">
            +{formatEUR(summary.income, lang)}
          </p>
          <p className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums">
            {summary.incomeCount}{' '}
            {summary.incomeCount === 1 ? t.txEntrySingular : t.txEntriesCount}
          </p>
        </div>

        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.txDailyExpenses}
            </span>
            <ArrowDownRight className="w-4 h-4 text-[#E95420] shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight">
            {formatEUR(summary.totalExpenses, lang)}
          </p>
          <p className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums truncate">
            {t.groupBills}: {formatEUR(summary.bills, lang)} · {t.groupVariable}:{' '}
            {formatEUR(summary.variable, lang)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.txVaultDeposits}
            </span>
            <PiggyBank className="w-4 h-4 text-[#77216F] dark:text-[#D47CD0] shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight text-[#77216F] dark:text-[#D47CD0]">
            {formatEUR(summary.savings, lang)}
          </p>
          <p className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums">
            {summary.savingsCount}{' '}
            {summary.savingsCount === 1 ? t.txEntrySingular : t.txEntriesCount}
          </p>
        </div>

        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.txNetFlow}
            </span>
            <span
              className={`text-xs font-bold ${
                summary.net < 0
                  ? 'text-[#C7162B] dark:text-[#FF7B89]'
                  : 'text-[#0E8420] dark:text-[#26A269]'
              }`}
            >
              {summary.net < 0 ? t.deficit : t.surplus}
            </span>
          </div>
          <p
            className={`font-mono tabular-nums text-2xl font-bold tracking-tight ${
              summary.net < 0 ? 'text-[#C7162B] dark:text-[#FF7B89]' : ''
            }`}
          >
            {formatEUR(summary.net, lang)}
          </p>
          <p className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
            {formatMonthTitle(month.monthKey, lang)}
          </p>
        </div>
      </section>

      {/* Main Split: Left Composer Window + Right Daily Grouped Timeline */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Composer Card */}
        <div className="xl:col-span-4 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold">
              {editingTx ? t.txEditTitle : t.txAddTitle}
            </h3>
            {editingTx && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-[#5E5C64] hover:text-[#2B2929] dark:text-[#9A9996] dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.cancel}</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Section Segmented Toggle */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-1 p-1 rounded-lg bg-[#F5F3F1] dark:bg-[#1B1B1B]">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors truncate cursor-pointer ${
                    group === g
                      ? g === 'income'
                        ? 'bg-[#0E8420] text-white'
                        : g === 'savings'
                        ? 'bg-[#77216F] text-white'
                        : 'bg-[#E95420] text-white'
                      : 'text-[#5E5C64] dark:text-[#9A9996] hover:text-[#2B2929] dark:hover:text-white'
                  }`}
                >
                  {getGroupTitle(g, lang)}
                </button>
              ))}
            </div>

            {/* Search EN/BG Subcategories */}
            <div>
              <div className="relative">
                <Search className="w-4 h-4 text-[#77767B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={taxonomySearch}
                  onChange={(e) => setTaxonomySearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchMatches.length > 0) {
                      e.preventDefault();
                      applySubcategory(
                        searchMatches[0].category,
                        searchMatches[0].subcategory
                      );
                    }
                  }}
                  placeholder={t.searchCategoriesPlaceholder}
                  className="w-full min-h-[40px] pl-9 pr-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-[#F7F6F5] dark:bg-[#1B1B1B] text-xs focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                />
              </div>

              {searchMatches.length > 0 && (
                <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] divide-y divide-[#ECE9E6] dark:divide-[#2F2F2F]">
                  {searchMatches.map(({ category, subcategory }) => (
                    <button
                      key={subcategory.id}
                      type="button"
                      onClick={() => applySubcategory(category, subcategory)}
                      className="w-full px-3 py-2 text-left hover:bg-[#F5F3F1] dark:hover:bg-[#2C2C2C] flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium truncate">
                          {getSubcategoryName(subcategory, lang)}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#5E5C64] dark:text-[#9A9996] shrink-0">
                        {getMainCategoryName(category, lang)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picker Mode Switch: All Categories vs Month Lines */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F5F3F1] dark:bg-[#1B1B1B]">
              <button
                type="button"
                onClick={() => setPickerMode('taxonomy')}
                className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  pickerMode === 'taxonomy'
                    ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                    : 'text-[#5E5C64] dark:text-[#9A9996]'
                }`}
              >
                {t.quickEntryModeTaxonomy}
              </button>
              <button
                type="button"
                onClick={() => setPickerMode('existing')}
                className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  pickerMode === 'existing'
                    ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                    : 'text-[#5E5C64] dark:text-[#9A9996]'
                }`}
              >
                {t.quickEntryModeExisting}
              </button>
            </div>

            {pickerMode === 'taxonomy' ? (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1">
                    {t.mainCategoryLabel}
                  </label>
                  <div className="relative flex items-center">
                    {selectedCategory && (
                      <span
                        className="w-2.5 h-2.5 rounded-xs absolute left-3 pointer-events-none"
                        style={{ backgroundColor: selectedCategory.color }}
                      />
                    )}
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => handleMainCategoryChange(e.target.value)}
                      className={`w-full min-h-[42px] pr-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420] ${
                        selectedCategory ? 'pl-8' : 'pl-3'
                      }`}
                    >
                      <option value="">{t.mainCategoryLabel}...</option>
                      {orderedCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {getMainCategoryName(cat, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1">
                    {t.subcategoryLabel}
                  </label>
                  <select
                    value={selectedSubcategoryId}
                    disabled={!selectedCategory}
                    onChange={(e) => {
                      setSelectedSubcategoryId(e.target.value);
                      if (e.target.value) {
                        requestAnimationFrame(() => amountInputRef.current?.focus());
                      }
                    }}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420] disabled:opacity-50"
                  >
                    <option value="">{t.selectSubcategoryPrompt}</option>
                    {(selectedCategory?.subcategories || []).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {getSubcategoryName(sub, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategory && selectedSubcategory && (
                  <div className="rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-[#F7F6F5] dark:bg-[#1F1F1F] px-3 py-2 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: selectedCategory.color }}
                      />
                      <span className="text-[#5E5C64] dark:text-[#9A9996] truncate">
                        {getMainCategoryName(selectedCategory, lang)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#77767B] shrink-0" />
                      <span className="truncate">
                        {getSubcategoryName(selectedSubcategory, lang)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums truncate">
                      {matchedExistingFromTaxonomy
                        ? `${t.quickEntryMatchedExisting}: ${getItemLabel(matchedExistingFromTaxonomy, lang)}`
                        : `${t.quickEntryWillCreate}: ${getSubcategoryName(selectedSubcategory, lang)}`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1">
                  {t.entryCategory}
                </label>
                <select
                  value={lineItemId}
                  onChange={(e) => setLineItemId(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                >
                  {filteredItemsForGroup.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getItemLabel(item, lang)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1"
                >
                  {t.entryAmount}
                </label>
                <input
                  ref={amountInputRef}
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label
                    htmlFor="tx-date"
                    className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]"
                  >
                    {t.entryDate}
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDate(getTodayISO())}
                      className="text-[#E95420] hover:underline cursor-pointer"
                    >
                      {t.txTodayBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(getYesterdayISO())}
                      className="text-[#5E5C64] dark:text-[#9A9996] hover:underline cursor-pointer"
                    >
                      {t.txYesterdayBtn}
                    </button>
                  </div>
                </div>
                <input
                  id="tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label
                htmlFor="tx-note"
                className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1"
              >
                {t.entryNote}
              </label>
              <input
                id="tx-note"
                type="text"
                maxLength={180}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.entryNotePlaceholder}
                className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full min-h-[44px] px-4 py-2 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? t.saving : editingTx ? t.txUpdateBtn : t.saveEntry}</span>
            </button>
          </form>
        </div>

        {/* Right Daily Activity Timeline Window */}
        <div className="xl:col-span-8 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-4 sm:px-5 py-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-[#E6E3DF] dark:bg-[#1B1B1B]">
                {(['all', 'expenses', 'income', 'savings'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      typeFilter === key
                        ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                        : 'text-[#5E5C64] dark:text-[#9A9996]'
                    }`}
                  >
                    {key === 'all'
                      ? t.txFilterAll
                      : key === 'expenses'
                      ? t.txFilterExpenses
                      : key === 'income'
                      ? t.txFilterIncome
                      : t.txFilterSavings}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'highest')}
                aria-label="Sort transactions"
                className="min-h-[34px] px-2.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              >
                <option value="newest">{t.txSortNewest}</option>
                <option value="oldest">{t.txSortOldest}</option>
                <option value="highest">{t.txSortHighest}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5 relative">
                <Search className="w-3.5 h-3.5 text-[#77767B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.txSearchPlaceholder}
                  className="w-full min-h-[36px] pl-8 pr-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-xs focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label={t.mainCategoryLabel}
                  className="w-full min-h-[36px] px-2.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-xs focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                >
                  <option value="all">{t.txAllCategories}</option>
                  {MAIN_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {getMainCategoryName(cat, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Calendar className="w-3.5 h-3.5 text-[#77767B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    aria-label={t.txFilterByDay}
                    className="w-full min-h-[36px] pl-8 pr-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-xs focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                  />
                </div>
                {dayFilter && (
                  <button
                    type="button"
                    onClick={() => setDayFilter('')}
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] flex items-center justify-center text-[#5E5C64] hover:text-[#2B2929] dark:hover:text-white cursor-pointer"
                    aria-label={t.txClearDay}
                    title={t.txClearDay}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content Area: Loading / Empty / Daily Timeline */}
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-14 rounded-lg bg-[#F5F3F1] dark:bg-[#1F1F1F]"
                />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="font-display text-sm font-bold">{t.txEmptyTitle}</p>
              <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] max-w-md mx-auto">
                {t.txEmptyDesc}
              </p>
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.txLogFirstBtn}</span>
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-[#5E5C64] dark:text-[#9A9996]">{t.txNoMatches}</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setCategoryFilter('all');
                    setDayFilter('');
                    setSearchQuery('');
                  }}
                  className="min-h-[38px] px-4 py-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] text-xs font-medium hover:bg-[#F5F3F1] dark:hover:bg-[#383838] cursor-pointer"
                >
                  {t.txResetFilters}
                </button>
              )}
            </div>
          ) : groupedDays ? (
            <div className="divide-y divide-[#DEDAD6] dark:divide-[#3D3D3D]">
              {groupedDays.map((dayGroup) => (
                <div key={dayGroup.date}>
                  <div className="bg-[#FAF9F8] dark:bg-[#242424] px-4 sm:px-5 py-2.5 border-b border-[#ECE9E6] dark:border-[#353535] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-[#2B2929] dark:text-[#EEEEEC]">
                        {formatDayHeading(dayGroup.date, lang)}
                      </span>
                      <span className="text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums">
                        · {dayGroup.items.length}{' '}
                        {dayGroup.items.length === 1 ? t.txEntrySingular : t.txEntriesCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      {dayGroup.incomeTotal > 0 && (
                        <span className="text-[#0E8420] dark:text-[#26A269] font-medium">
                          +{formatEUR(dayGroup.incomeTotal, lang)}
                        </span>
                      )}
                      {dayGroup.outflowTotal > 0 && (
                        <span className="text-[#5E5C64] dark:text-[#C0BFBC] font-medium">
                          -{formatEUR(dayGroup.outflowTotal, lang)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
                    {dayGroup.items.map((tx) => renderTransactionRow(tx))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
              {filteredTransactions.map((tx) => renderTransactionRow(tx))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
