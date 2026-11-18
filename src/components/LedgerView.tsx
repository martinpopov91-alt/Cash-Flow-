import { useMemo, useState } from 'react';
import { Plus, Repeat, Search, Trash2 } from 'lucide-react';
import { BudgetGroup, BudgetLineItem, Language, MonthlyBudget } from '../types/budget';
import { TRANSLATIONS, getGroupTitle, getItemLabel } from '../i18n/translations';
import { getMainCategoryName, resolveItemMainCategory } from '../data/categories';
import {
  calculateMonthTotals,
  formatEUR,
  parseNumberInput,
  sumGroup,
} from '../lib/calculations';

interface LedgerViewProps {
  month: MonthlyBudget;
  lang: Language;
  onUpdateItem: (itemId: string, updates: Partial<BudgetLineItem>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onOpenAddItem: (group: BudgetGroup) => void;
  onQuickEntry: (group: BudgetGroup, itemId: string) => void;
}

const GROUP_ORDER: BudgetGroup[] = ['income', 'bills', 'variable', 'savings'];

interface EditableCellProps {
  value: number;
  lang: Language;
  onCommit: (nextVal: number) => void;
}

function EditableCurrencyCell({ value, lang, onCommit }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (editing) {
    return (
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const next = parseNumberInput(draft);
          if (next !== value) onCommit(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        className="w-24 min-h-[32px] px-2 py-1 rounded-lg border border-[#E95420] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-xs text-right focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value === 0 ? '' : String(value));
        setEditing(true);
      }}
      className="min-h-[32px] px-2 py-1 rounded-lg hover:bg-[#EFECE8] dark:hover:bg-[#383838] font-mono tabular-nums text-xs sm:text-[13px] text-right transition-colors cursor-text whitespace-nowrap"
      title={lang === 'bg' ? 'Кликнете за редакция' : 'Click to edit'}
    >
      {formatEUR(value, lang)}
    </button>
  );
}

function EditableTextCell({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder: string;
  onCommit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        type="text"
        maxLength={20}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() !== value) onCommit(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-16 min-h-[32px] px-2 py-1 rounded-lg border border-[#E95420] bg-white dark:bg-[#1B1B1B] font-mono text-xs focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="min-h-[32px] px-2 py-1 rounded-lg hover:bg-[#EFECE8] dark:hover:bg-[#383838] font-mono text-xs text-[#5E5C64] dark:text-[#9A9996] cursor-text"
    >
      {value || placeholder}
    </button>
  );
}

export function LedgerView({
  month,
  lang,
  onUpdateItem,
  onDeleteItem,
  onOpenAddItem,
  onQuickEntry,
}: LedgerViewProps) {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all' | BudgetGroup>('all');

  const totals = useMemo(() => calculateMonthTotals(month.items), [month.items]);

  function renderGroupWindow(group: BudgetGroup, spanClass = '') {
    const groupItems = month.items.filter((item) => {
      if (item.group !== group) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.labelEn.toLowerCase().includes(q) || item.labelBg.toLowerCase().includes(q)
      );
    });
    const groupSum = sumGroup(month.items, group);
    const showDueDate = group === 'bills';

    return (
      <section
        key={group}
        className={`bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col justify-between ${spanClass}`}
      >
        <div>
          {/* GNOME HeaderBar */}
          <div className="bg-[#F7F6F5] dark:bg-[#242424] px-4 sm:px-5 py-3 border-b border-[#DEDAD6] dark:border-[#3D3D3D] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-sm font-bold truncate">
                {getGroupTitle(group, lang)}
              </h3>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums mt-0.5 truncate">
                {t.budgetLabel}: {formatEUR(groupSum.budget, lang)} · {t.actualLabel}:{' '}
                {formatEUR(groupSum.actual, lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAddItem(group)}
              className="min-h-[34px] px-3 py-1 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#2C2C2C] text-xs font-medium flex items-center gap-1.5 hover:bg-[#EFECE8] dark:hover:bg-[#383838] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#E95420]" />
              <span>{t.addItem}</span>
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ECE9E6] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
                  <th className="text-left font-medium px-4 py-2.5">{t.colDescription}</th>
                  {showDueDate && (
                    <th className="text-left font-medium px-2 py-2.5">{t.colDueDate}</th>
                  )}
                  <th className="text-right font-medium px-2.5 py-2.5">{t.colBudget}</th>
                  <th className="text-right font-medium px-2.5 py-2.5">{t.colActual}</th>
                  <th className="text-right font-medium px-4 py-2.5">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
                {groupItems.map((item) => {
                  const isAttention = item.highlightType === 'attention';
                  const isVault = item.highlightType === 'vault';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isAttention
                          ? 'bg-[#E99002]/10 dark:bg-[#F5A623]/12 hover:bg-[#E99002]/16'
                          : isVault
                          ? 'hover:bg-[#0E8420]/5 dark:hover:bg-[#26A269]/8'
                          : 'hover:bg-[#F7F6F5] dark:hover:bg-[#343434]'
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{
                              backgroundColor: resolveItemMainCategory(item).color,
                            }}
                            title={getMainCategoryName(resolveItemMainCategory(item), lang)}
                          />
                          <span className="font-medium text-[13px] truncate">
                            {getItemLabel(item, lang)}
                          </span>
                          {item.isRecurring && (
                            <Repeat
                              className="w-3 h-3 text-[#77767B] dark:text-[#9A9996] shrink-0"
                              aria-label={t.recurring}
                            />
                          )}
                        </div>
                      </td>

                      {showDueDate && (
                        <td className="px-2 py-1.5">
                          <EditableTextCell
                            value={item.dueDate}
                            placeholder="—"
                            onCommit={(val) => onUpdateItem(item.id, { dueDate: val })}
                          />
                        </td>
                      )}

                      <td className="px-2.5 py-1 text-right">
                        <EditableCurrencyCell
                          value={item.budgetAmount}
                          lang={lang}
                          onCommit={(val) => onUpdateItem(item.id, { budgetAmount: val })}
                        />
                      </td>

                      <td className="px-2.5 py-1 text-right">
                        <EditableCurrencyCell
                          value={item.actualAmount}
                          lang={lang}
                          onCommit={(val) => onUpdateItem(item.id, { actualAmount: val })}
                        />
                      </td>

                      <td className="px-4 py-1 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onQuickEntry(group, item.id)}
                            className="min-h-[30px] px-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] text-xs font-medium hover:bg-[#EFECE8] dark:hover:bg-[#383838] cursor-pointer"
                            title={t.logEntry}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateItem(item.id, { isRecurring: !item.isRecurring })
                            }
                            className={`min-h-[30px] min-w-[30px] rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              item.isRecurring
                                ? 'text-[#E95420] bg-[#E95420]/12'
                                : 'text-[#77767B] hover:bg-[#EFECE8] dark:hover:bg-[#383838]'
                            }`}
                            title={item.isRecurring ? t.recurring : t.oneTime}
                            aria-label={item.isRecurring ? t.recurring : t.oneTime}
                          >
                            <Repeat className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="min-h-[30px] min-w-[30px] rounded-lg flex items-center justify-center text-[#77767B] hover:text-[#C7162B] dark:hover:text-[#FF7B89] hover:bg-[#EFECE8] dark:hover:bg-[#383838] transition-colors cursor-pointer"
                            aria-label={t.deleteConfirm}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Rows */}
          <div className="md:hidden divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
            {groupItems.map((item) => {
              const isAttention = item.highlightType === 'attention';
              return (
                <div
                  key={item.id}
                  className={`p-4 space-y-2.5 ${
                    isAttention ? 'bg-[#E99002]/10 dark:bg-[#F5A623]/12' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-xs shrink-0"
                          style={{
                            backgroundColor: resolveItemMainCategory(item).color,
                          }}
                        />
                        <p className="text-sm font-medium truncate">
                          {getItemLabel(item, lang)}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                        {getMainCategoryName(resolveItemMainCategory(item), lang)} ·{' '}
                        {item.isRecurring ? t.recurring : t.oneTime}
                        {showDueDate && item.dueDate ? ` · ${t.colDueDate}: ${item.dueDate}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuickEntry(group, item.id)}
                      className="min-h-[38px] px-3 rounded-lg bg-[#E95420]/12 text-[#E95420] text-xs font-medium shrink-0"
                    >
                      + {t.logEntry}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-lg bg-[#F5F3F1] dark:bg-[#1B1B1B] px-3 py-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                        {t.budgetLabel}
                      </span>
                      <EditableCurrencyCell
                        value={item.budgetAmount}
                        lang={lang}
                        onCommit={(val) => onUpdateItem(item.id, { budgetAmount: val })}
                      />
                    </div>
                    <div className="rounded-lg bg-[#F5F3F1] dark:bg-[#1B1B1B] px-3 py-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                        {t.actualLabel}
                      </span>
                      <EditableCurrencyCell
                        value={item.actualAmount}
                        lang={lang}
                        onCommit={(val) => onUpdateItem(item.id, { actualAmount: val })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Window Footer Totals */}
        <div className="border-t border-[#DEDAD6] dark:border-[#3D3D3D] bg-[#F7F6F5] dark:bg-[#242424] px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs font-bold">
          <span>
            {t.budgetLabel}: <span className="font-mono tabular-nums">{formatEUR(groupSum.budget, lang)}</span>
          </span>
          <span>
            {t.actualLabel}: <span className="font-mono tabular-nums">{formatEUR(groupSum.actual, lang)}</span>
          </span>
          <span className="hidden sm:inline text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums font-medium">
            {t.remainingLabel}: {formatEUR(groupSum.budget - groupSum.actual, lang)}
          </span>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter & Search Toolbar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-x-auto">
          {(['all', ...GROUP_ORDER] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setGroupFilter(key)}
              className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                groupFilter === key
                  ? 'bg-[#E95420] text-white'
                  : 'text-[#5E5C64] dark:text-[#C0BFBC] hover:text-[#2B2929] dark:hover:text-white'
              }`}
            >
              {key === 'all' ? t.filterAll : getGroupTitle(key, lang)}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#77767B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full min-h-[42px] pl-9 pr-3.5 rounded-xl border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#2C2C2C] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
          />
        </div>
      </section>

      {groupFilter === 'all' ? (
        <div className="space-y-5">
          {/* Top Row: Income (7 cols) + Monthly Summary (5 cols) matching sheet layout across full screen */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
            {renderGroupWindow('income', 'xl:col-span-7')}

            <section className="xl:col-span-5 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#F7F6F5] dark:bg-[#242424] px-5 py-3 border-b border-[#DEDAD6] dark:border-[#3D3D3D] flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold">{t.summaryCardTitle}</h2>
                  <span className="font-mono tabular-nums text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                    {t.savingsRate}: {totals.savingsRateBudget}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#ECE9E6] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
                        <th className="text-left font-medium px-5 py-2.5">{t.colDescription}</th>
                        <th className="text-right font-medium px-4 py-2.5">{t.colBudget}</th>
                        <th className="text-right font-medium px-5 py-2.5">{t.colActual}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
                      <tr>
                        <td className="px-5 py-3 font-medium text-[13px]">{t.totalIncome}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[13px]">
                          {formatEUR(totals.incomeBudget, lang)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-[13px]">
                          {formatEUR(totals.incomeActual, lang)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-medium text-[13px] text-[#0E8420] dark:text-[#26A269]">
                          {t.totalSavings}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[13px]">
                          {formatEUR(totals.savingsBudget, lang)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-[13px] text-[#0E8420] dark:text-[#26A269]">
                          {formatEUR(totals.savingsActual, lang)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3 font-medium text-[13px]">{t.totalExpenses}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[13px]">
                          {formatEUR(totals.totalExpensesBudget, lang)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-[13px]">
                          {formatEUR(totals.totalExpensesActual, lang)}
                        </td>
                      </tr>
                      <tr className="bg-[#E99002]/12 dark:bg-[#F5A623]/12 font-bold">
                        <td className="px-5 py-3.5 text-[13px]">{t.remainingBalance}</td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums text-[13px]">
                          {formatEUR(totals.remainingBudget, lang)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-mono tabular-nums text-[13px] ${
                            totals.remainingActual < 0
                              ? 'text-[#C7162B] dark:text-[#FF7B89]'
                              : 'text-[#0E8420] dark:text-[#26A269]'
                          }`}
                        >
                          {formatEUR(totals.remainingActual, lang)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-[#DEDAD6] dark:border-[#3D3D3D] bg-[#F7F6F5] dark:bg-[#242424] px-5 py-2.5 flex items-center justify-between text-xs text-[#5E5C64] dark:text-[#9A9996]">
                <span>{totals.remainingActual >= 0 ? t.surplus : t.deficit}</span>
                <span className="font-mono tabular-nums">
                  {t.varianceLabel}: {formatEUR(totals.remainingActual - totals.remainingBudget, lang)}
                </span>
              </div>
            </section>
          </div>

          {/* Bottom Grid: Bills, Variable Costs, and Savings side-by-side on wide screens */}
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 items-stretch">
            {renderGroupWindow('bills')}
            {renderGroupWindow('variable')}
            {renderGroupWindow('savings', 'xl:col-span-2 2xl:col-span-1')}
          </div>
        </div>
      ) : (
        <div>{renderGroupWindow(groupFilter)}</div>
      )}
    </div>
  );
}
