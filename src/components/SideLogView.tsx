import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Language, SideLogDirection, SideLogEntry } from '../types/budget';
import { TRANSLATIONS, formatMonthTitle } from '../i18n/translations';
import { formatEUR, getDefaultDateForMonth, parseNumberInput, round2 } from '../lib/calculations';

interface SideLogViewProps {
  entries: SideLogEntry[];
  loading: boolean;
  selectedMonthKey: string;
  lang: Language;
  onAdd: (payload: {
    direction: SideLogDirection;
    title: string;
    amount: number;
    date: string;
    note: string;
  }) => Promise<void>;
  onUpdate: (
    logId: string,
    payload: {
      direction: SideLogDirection;
      title: string;
      amount: number;
      date: string;
      note: string;
    }
  ) => Promise<void>;
  onDelete: (logId: string) => Promise<void>;
  onNotify: (msg: string) => void;
}

export function SideLogView({
  entries,
  loading,
  selectedMonthKey,
  lang,
  onAdd,
  onUpdate,
  onDelete,
  onNotify,
}: SideLogViewProps) {
  const t = TRANSLATIONS[lang];

  const [direction, setDirection] = useState<SideLogDirection>('in');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => getDefaultDateForMonth(selectedMonthKey));
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [directionFilter, setDirectionFilter] = useState<'all' | SideLogDirection>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const scopedEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (scopeFilter === 'month' && !entry.date.startsWith(selectedMonthKey)) {
        return false;
      }
      return true;
    });
  }, [entries, scopeFilter, selectedMonthKey]);

  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const entry of scopedEntries) {
      if (entry.direction === 'in') {
        totalIn = round2(totalIn + entry.amount);
      } else {
        totalOut = round2(totalOut + entry.amount);
      }
    }
    return {
      totalIn,
      totalOut,
      net: round2(totalIn - totalOut),
    };
  }, [scopedEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedEntries.filter((entry) => {
      if (directionFilter !== 'all' && entry.direction !== directionFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.note.toLowerCase().includes(q) ||
        entry.date.includes(q)
      );
    });
  }, [scopedEntries, directionFilter, searchQuery]);

  const parsedAmount = parseNumberInput(amountStr);
  const canSubmit = title.trim().length > 0 && parsedAmount > 0 && date.length === 10 && !saving;

  function resetForm() {
    setEditingId(null);
    setDirection('in');
    setTitle('');
    setAmountStr('');
    setDate(getDefaultDateForMonth(selectedMonthKey));
    setNote('');
  }

  function startEditing(entry: SideLogEntry) {
    setEditingId(entry.id);
    setDirection(entry.direction);
    setTitle(entry.title);
    setAmountStr(String(entry.amount));
    setDate(entry.date);
    setNote(entry.note);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        direction,
        title: title.trim(),
        amount: parsedAmount,
        date,
        note: note.trim(),
      };
      if (editingId) {
        await onUpdate(editingId, payload);
        onNotify(t.toastSideLogUpdated);
      } else {
        await onAdd(payload);
        onNotify(t.toastSideLogSaved);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const header = ['Date', 'Direction', 'Description', 'Amount (EUR)', 'Note'];
    const rows = filteredEntries.map((entry) => [
      entry.date,
      entry.direction === 'in' ? 'IN' : 'OUT',
      `"${entry.title.replace(/"/g, '""')}"`,
      entry.direction === 'in' ? entry.amount.toFixed(2) : (-entry.amount).toFixed(2),
      `"${entry.note.replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashflow-side-log-${scopeFilter === 'month' ? selectedMonthKey : 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify(t.toastExported);
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">{t.sideLogTitle}</h2>
            <span className="text-xs text-[#77216F] dark:text-[#D47CD0] font-medium">
              · {t.sideLogIsolatedBadge}
            </span>
          </div>
          <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] mt-0.5">
            {t.sideLogSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredEntries.length === 0}
          className="min-h-[38px] px-3.5 py-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#2C2C2C] text-xs font-medium flex items-center gap-2 hover:bg-[#F5F3F1] dark:hover:bg-[#383838] transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#E95420]" />
          <span>{t.sideLogExportCsv}</span>
        </button>
      </section>

      {/* 3-Column KPI Strip (Strictly isolated from Main Monthly Sheet) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.sideLogTotalIn}
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#0E8420] dark:text-[#26A269] shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight text-[#0E8420] dark:text-[#26A269]">
            +{formatEUR(totals.totalIn, lang)}
          </p>
          <p className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
            {scopeFilter === 'month' ? formatMonthTitle(selectedMonthKey, lang) : t.sideLogScopeAll}
          </p>
        </div>

        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.sideLogTotalOut}
            </span>
            <ArrowDownRight className="w-4 h-4 text-[#E95420] shrink-0" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold tracking-tight">
            {formatEUR(totals.totalOut, lang)}
          </p>
          <p className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
            {scopeFilter === 'month' ? formatMonthTitle(selectedMonthKey, lang) : t.sideLogScopeAll}
          </p>
        </div>

        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
              {t.sideLogNetBalance}
            </span>
            <span
              className={`text-xs font-bold ${
                totals.net < 0 ? 'text-[#C7162B] dark:text-[#FF7B89]' : 'text-[#0E8420] dark:text-[#26A269]'
              }`}
            >
              {totals.net < 0 ? t.deficit : t.surplus}
            </span>
          </div>
          <p
            className={`font-mono tabular-nums text-2xl font-bold tracking-tight ${
              totals.net < 0 ? 'text-[#C7162B] dark:text-[#FF7B89]' : ''
            }`}
          >
            {formatEUR(totals.net, lang)}
          </p>
          <p className="mt-2 pt-2 border-t border-[#F0EDE9] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
            {scopedEntries.length} {lang === 'bg' ? 'записа' : 'entries'}
          </p>
        </div>
      </section>

      {/* Main Workspace Split: Left Add/Edit Window Card + Right Entries Ledger */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Add / Edit Side Log Form Window */}
        <div className="xl:col-span-4 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold">{t.sideLogAddTitle}</h3>
            {editingId && (
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
            {/* Direction Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F5F3F1] dark:bg-[#1B1B1B]">
              <button
                type="button"
                onClick={() => setDirection('in')}
                className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  direction === 'in'
                    ? 'bg-[#0E8420] text-white'
                    : 'text-[#5E5C64] dark:text-[#9A9996] hover:text-[#2B2929] dark:hover:text-white'
                }`}
              >
                {t.sideLogDirectionIn}
              </button>
              <button
                type="button"
                onClick={() => setDirection('out')}
                className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  direction === 'out'
                    ? 'bg-[#E95420] text-white'
                    : 'text-[#5E5C64] dark:text-[#9A9996] hover:text-[#2B2929] dark:hover:text-white'
                }`}
              >
                {t.sideLogDirectionOut}
              </button>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="side-title"
                className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5"
              >
                {t.sideLogEntryTitle}
              </label>
              <input
                id="side-title"
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.sideLogEntryTitlePlaceholder}
                className="w-full min-h-[42px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="side-amount"
                  className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5"
                >
                  {t.entryAmount}
                </label>
                <input
                  id="side-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                />
              </div>

              <div>
                <label
                  htmlFor="side-date"
                  className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5"
                >
                  {t.entryDate}
                </label>
                <input
                  id="side-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                />
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label
                htmlFor="side-note"
                className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5"
              >
                {t.entryNote}
              </label>
              <input
                id="side-note"
                type="text"
                maxLength={250}
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
              <span>
                {saving
                  ? t.saving
                  : editingId
                  ? t.sideLogUpdateBtn
                  : t.sideLogSaveBtn}
              </span>
            </button>
          </form>
        </div>

        {/* Entries List Window */}
        <div className="xl:col-span-8 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-4 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-[#E6E3DF] dark:bg-[#1B1B1B]">
                {(['all', 'in', 'out'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDirectionFilter(key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      directionFilter === key
                        ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                        : 'text-[#5E5C64] dark:text-[#9A9996]'
                    }`}
                  >
                    {key === 'all'
                      ? t.sideLogFilterAll
                      : key === 'in'
                      ? t.sideLogFilterIn
                      : t.sideLogFilterOut}
                  </button>
                ))}
              </div>

              <div className="flex items-center p-0.5 rounded-lg bg-[#E6E3DF] dark:bg-[#1B1B1B]">
                <button
                  type="button"
                  onClick={() => setScopeFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    scopeFilter === 'all'
                      ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                      : 'text-[#5E5C64] dark:text-[#9A9996]'
                  }`}
                >
                  {t.sideLogScopeAll}
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter('month')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    scopeFilter === 'month'
                      ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                      : 'text-[#5E5C64] dark:text-[#9A9996]'
                  }`}
                >
                  {formatMonthTitle(selectedMonthKey, lang)}
                </button>
              </div>
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="w-3.5 h-3.5 text-[#77767B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.sideLogSearchPlaceholder}
                className="w-full min-h-[36px] pl-8 pr-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-xs focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-12 rounded-lg bg-[#F5F3F1] dark:bg-[#1F1F1F]"
                />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-[#5E5C64] dark:text-[#9A9996] max-w-md mx-auto">
                {t.sideLogEmpty}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#ECE9E6] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
                      <th className="text-left font-medium px-5 py-2.5">{t.entryDate}</th>
                      <th className="text-left font-medium px-4 py-2.5">{t.colDescription}</th>
                      <th className="text-left font-medium px-4 py-2.5">{t.entryType}</th>
                      <th className="text-right font-medium px-4 py-2.5">{t.entryAmount}</th>
                      <th className="text-right font-medium px-5 py-2.5">{t.colActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
                    {filteredEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-[#F7F6F5] dark:hover:bg-[#343434] transition-colors"
                      >
                        <td className="px-5 py-3 font-mono tabular-nums text-xs text-[#5E5C64] dark:text-[#C0BFBC] whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="px-4 py-3 min-w-0">
                          <p className="font-medium text-[13px] truncate">{entry.title}</p>
                          {entry.note && (
                            <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] truncate">
                              {entry.note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              entry.direction === 'in'
                                ? 'text-[#0E8420] dark:text-[#26A269]'
                                : 'text-[#E95420]'
                            }`}
                          >
                            {entry.direction === 'in' ? t.sideLogFilterIn : t.sideLogFilterOut}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono tabular-nums text-sm font-bold whitespace-nowrap ${
                            entry.direction === 'in'
                              ? 'text-[#0E8420] dark:text-[#26A269]'
                              : ''
                          }`}
                        >
                          {entry.direction === 'in' ? '+' : '-'}
                          {formatEUR(entry.amount, lang)}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditing(entry)}
                              className="min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-[#77767B] hover:text-[#2B2929] dark:hover:text-white hover:bg-[#EFECE8] dark:hover:bg-[#383838] transition-colors cursor-pointer"
                              aria-label={t.sideLogEdit}
                              title={t.sideLogEdit}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onDelete(entry.id);
                                if (editingId === entry.id) resetForm();
                                onNotify(t.toastSideLogRemoved);
                              }}
                              className="min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-[#77767B] hover:text-[#C7162B] dark:hover:text-[#FF7B89] hover:bg-[#EFECE8] dark:hover:bg-[#383838] transition-colors cursor-pointer"
                              aria-label={t.deleteConfirm}
                              title={t.deleteConfirm}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Rows */}
              <div className="md:hidden divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.title}</p>
                      <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] truncate">
                        <span className="font-mono tabular-nums">{entry.date}</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {entry.direction === 'in' ? t.sideLogFilterIn : t.sideLogFilterOut}
                        </span>
                        {entry.note ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{entry.note}</span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`font-mono tabular-nums text-sm font-bold ${
                          entry.direction === 'in' ? 'text-[#0E8420] dark:text-[#26A269]' : ''
                        }`}
                      >
                        {entry.direction === 'in' ? '+' : '-'}
                        {formatEUR(entry.amount, lang)}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditing(entry)}
                        className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#77767B] hover:bg-[#F5F3F1] dark:hover:bg-[#383838]"
                        aria-label={t.sideLogEdit}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDelete(entry.id);
                          if (editingId === entry.id) resetForm();
                          onNotify(t.toastSideLogRemoved);
                        }}
                        className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#77767B] hover:text-[#C7162B]"
                        aria-label={t.deleteConfirm}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
