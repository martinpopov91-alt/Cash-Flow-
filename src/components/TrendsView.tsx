import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Language, MonthlyBudget, TransactionEntry } from '../types/budget';
import { MONTH_SHORT, TRANSLATIONS, formatMonthTitle } from '../i18n/translations';
import {
  calculateMonthTotals,
  exportAllMonthsJSON,
  exportMonthCSV,
  formatEUR,
} from '../lib/calculations';

interface TrendsViewProps {
  allMonths: MonthlyBudget[];
  currentMonth: MonthlyBudget | null;
  transactions: TransactionEntry[];
  lang: Language;
  onSelectMonth: (monthKey: string) => void;
  onNotify: (msg: string) => void;
}

export function TrendsView({
  allMonths,
  currentMonth,
  transactions,
  lang,
  onSelectMonth,
  onNotify,
}: TrendsViewProps) {
  const t = TRANSLATIONS[lang];

  const series = useMemo(() => {
    return allMonths.map((m) => {
      const totals = calculateMonthTotals(m.items);
      const shortName = `${MONTH_SHORT[lang][Math.max(0, m.month - 1)]} ${String(m.year).slice(-2)}`;
      return {
        monthKey: m.monthKey,
        shortName,
        fullName: formatMonthTitle(m.monthKey, lang),
        totals,
      };
    });
  }, [allMonths, lang]);

  const savingsChart = useMemo(() => {
    const width = 640;
    const height = 220;
    const padX = 40;
    const padY = 24;
    const maxVal = Math.max(
      100,
      ...series.flatMap((s) => [s.totals.savingsActual, s.totals.savingsBudget])
    );

    const points = series.map((s, idx) => {
      const x =
        series.length === 1
          ? width / 2
          : padX + (idx / (series.length - 1)) * (width - padX * 2);
      const yActual =
        height - padY - (s.totals.savingsActual / maxVal) * (height - padY * 2);
      const yBudget =
        height - padY - (s.totals.savingsBudget / maxVal) * (height - padY * 2);
      return { ...s, x, yActual, yBudget };
    });

    const lineActual = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yActual}`).join(' ');
    const lineBudget = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yBudget}`).join(' ');
    const areaActual =
      points.length > 0
        ? `${lineActual} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`
        : '';

    return { width, height, padY, maxVal, points, lineActual, lineBudget, areaActual };
  }, [series]);

  const maxCashFlowVal = useMemo(() => {
    return Math.max(
      100,
      ...series.flatMap((s) => [
        s.totals.incomeActual,
        s.totals.incomeBudget,
        s.totals.totalExpensesActual,
        s.totals.totalExpensesBudget,
      ])
    );
  }, [series]);

  return (
    <div className="space-y-6">
      {/* Header Window */}
      <section className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">{t.trendsTitle}</h2>
          <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] mt-0.5">{t.trendsSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentMonth && (
            <button
              type="button"
              onClick={() => {
                exportMonthCSV(currentMonth, transactions, lang);
                onNotify(t.toastExported);
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] text-xs font-medium flex items-center gap-2 hover:bg-[#F5F3F1] dark:hover:bg-[#383838] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportCsv}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              exportAllMonthsJSON(allMonths);
              onNotify(t.toastExported);
            }}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportJson}</span>
          </button>
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Savings Trajectory Window */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-sm font-bold">{t.trendsSavingsChartTitle}</h3>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                {series.length} {t.monthsTracked}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#5E5C64] dark:text-[#C0BFBC]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0E8420] dark:bg-[#26A269]" />
                {t.actualLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#8E8B87]" />
                {t.budgetLabel}
              </span>
            </div>
          </div>

          <div className="p-5 w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${savingsChart.width} ${savingsChart.height}`}
              className="w-full h-52 min-w-[320px]"
            >
              <defs>
                <linearGradient id="yaruSavingsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0E8420" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#0E8420" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0.25, 0.5, 0.75, 1].map((frac) => {
                const y =
                  savingsChart.height -
                  savingsChart.padY -
                  frac * (savingsChart.height - savingsChart.padY * 2);
                return (
                  <line
                    key={frac}
                    x1={20}
                    x2={savingsChart.width - 20}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    className="text-[#DEDAD6] dark:text-[#3D3D3D]"
                  />
                );
              })}

              {savingsChart.points.length > 1 && (
                <>
                  <path d={savingsChart.areaActual} fill="url(#yaruSavingsFill)" />
                  <path
                    d={savingsChart.lineBudget}
                    fill="none"
                    stroke="#8E8B87"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d={savingsChart.lineActual}
                    fill="none"
                    stroke="#0E8420"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </>
              )}

              {savingsChart.points.map((pt) => (
                <g key={pt.monthKey}>
                  <circle cx={pt.x} cy={pt.yBudget} r="4" fill="#8E8B87" />
                  <circle cx={pt.x} cy={pt.yActual} r="5" fill="#0E8420" />
                  <text
                    x={pt.x}
                    y={savingsChart.height - 4}
                    textAnchor="middle"
                    className="fill-[#5E5C64] dark:fill-[#9A9996] text-[11px] font-mono"
                  >
                    {pt.shortName}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Income vs Expenses Window */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
          <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3.5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-sm font-bold">{t.trendsCashFlowChartTitle}</h3>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
                {t.budgetLabel} vs {t.actualLabel}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#5E5C64] dark:text-[#C0BFBC]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#77216F] dark:bg-[#A8559F]" />
                {t.groupIncome}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#E95420]" />
                {t.totalExpenses}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {series.map((s) => {
              const incVal =
                s.totals.incomeActual > 0 ? s.totals.incomeActual : s.totals.incomeBudget;
              const expVal =
                s.totals.totalExpensesActual > 0
                  ? s.totals.totalExpensesActual
                  : s.totals.totalExpensesBudget;
              const incPct = Math.min(100, (incVal / maxCashFlowVal) * 100);
              const expPct = Math.min(100, (expVal / maxCashFlowVal) * 100);

              return (
                <button
                  key={s.monthKey}
                  type="button"
                  onClick={() => onSelectMonth(s.monthKey)}
                  className="w-full text-left p-2.5 -mx-2.5 rounded-lg hover:bg-[#F5F3F1] dark:hover:bg-[#363636] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium">{s.fullName}</span>
                    <span className="font-mono tabular-nums text-[#5E5C64] dark:text-[#9A9996]">
                      {formatEUR(incVal, lang)} / {formatEUR(expVal, lang)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-[#ECE9E6] dark:bg-[#1B1B1B] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#77216F] dark:bg-[#A8559F]"
                        style={{ width: `${incPct}%` }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-[#ECE9E6] dark:bg-[#1B1B1B] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#E95420]"
                        style={{ width: `${expPct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Monthly Archive Comparison Table Window */}
      <section className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
        <div className="bg-[#F7F6F5] dark:bg-[#242424] px-6 py-3.5 border-b border-[#DEDAD6] dark:border-[#3D3D3D]">
          <h3 className="font-display text-sm font-bold">{t.trendsTableTitle}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#ECE9E6] dark:border-[#3A3A3A] text-xs text-[#5E5C64] dark:text-[#9A9996]">
                <th className="text-left font-medium px-6 py-3">{t.selectMonth}</th>
                <th className="text-right font-medium px-4 py-3">{t.totalIncome}</th>
                <th className="text-right font-medium px-4 py-3">{t.totalExpenses}</th>
                <th className="text-right font-medium px-4 py-3">{t.totalSavings}</th>
                <th className="text-right font-medium px-6 py-3">{t.remainingBalance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE9E6] dark:divide-[#3A3A3A]">
              {series.map((s) => (
                <tr
                  key={s.monthKey}
                  onClick={() => onSelectMonth(s.monthKey)}
                  className="hover:bg-[#F5F3F1] dark:hover:bg-[#363636] cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3 font-medium text-[#E95420]">{s.fullName}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatEUR(s.totals.incomeActual, lang)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatEUR(s.totals.totalExpensesActual, lang)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#0E8420] dark:text-[#26A269]">
                    {formatEUR(s.totals.savingsActual, lang)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums font-bold">
                    {formatEUR(s.totals.remainingActual, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
