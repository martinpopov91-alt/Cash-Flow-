import { useMemo } from 'react';
import { PiggyBank, Plus } from 'lucide-react';
import { BudgetGroup, Language, MonthlyBudget } from '../types/budget';
import { TRANSLATIONS, getItemLabel } from '../i18n/translations';
import { formatEUR, round2 } from '../lib/calculations';

interface VaultsViewProps {
  currentMonth: MonthlyBudget | null;
  allMonths: MonthlyBudget[];
  lang: Language;
  onQuickDeposit: (group: BudgetGroup, itemId: string) => void;
  onAddVault: () => void;
}

export function VaultsView({
  currentMonth,
  allMonths,
  lang,
  onQuickDeposit,
  onAddVault,
}: VaultsViewProps) {
  const t = TRANSLATIONS[lang];

  const vaultCards = useMemo(() => {
    const cumulativeByKey: Record<string, { totalSaved: number; meta: MonthlyBudget['items'][0] }> =
      {};

    allMonths.forEach((m) => {
      m.items
        .filter((i) => i.group === 'savings')
        .forEach((item) => {
          const mapKey = item.key || item.id;
          if (!cumulativeByKey[mapKey]) {
            cumulativeByKey[mapKey] = { totalSaved: 0, meta: item };
          }
          cumulativeByKey[mapKey].totalSaved = round2(
            cumulativeByKey[mapKey].totalSaved + (Number(item.actualAmount) || 0)
          );
          cumulativeByKey[mapKey].meta = item;
        });
    });

    const currentSavings = (currentMonth?.items || []).filter((i) => i.group === 'savings');

    return currentSavings.map((item) => {
      const mapKey = item.key || item.id;
      const cumulative = cumulativeByKey[mapKey]?.totalSaved ?? item.actualAmount;
      const pct =
        item.budgetAmount > 0
          ? Math.min(100, Math.round((item.actualAmount / item.budgetAmount) * 100))
          : item.actualAmount > 0
          ? 100
          : 0;

      return {
        item,
        cumulative,
        pct,
      };
    });
  }, [currentMonth, allMonths]);

  const totalCumulativeAllVaults = useMemo(
    () => round2(vaultCards.reduce((sum, v) => sum + v.cumulative, 0)),
    [vaultCards]
  );

  const totalMonthlyTarget = useMemo(
    () => round2(vaultCards.reduce((sum, v) => sum + v.item.budgetAmount, 0)),
    [vaultCards]
  );

  const totalMonthlyActual = useMemo(
    () => round2(vaultCards.reduce((sum, v) => sum + v.item.actualAmount, 0)),
    [vaultCards]
  );

  return (
    <div className="space-y-6">
      {/* Header Window */}
      <section className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden">
        <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#0E8420] dark:text-[#26A269]">
            <PiggyBank className="w-4 h-4" />
            <span className="text-xs font-bold">{t.groupSavings}</span>
          </div>
          <button
            type="button"
            onClick={onAddVault}
            className="min-h-[34px] px-3 py-1 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#2C2C2C] text-xs font-medium flex items-center gap-1.5 hover:bg-[#EFECE8] dark:hover:bg-[#383838] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E95420]" />
            <span>{t.addItem}</span>
          </button>
        </div>

        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-xl font-bold">{t.vaultsTitle}</h2>
            <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] mt-1">{t.vaultsSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">{t.vaultCumulative}</p>
              <p className="font-mono tabular-nums text-lg font-bold text-[#0E8420] dark:text-[#26A269]">
                {formatEUR(totalCumulativeAllVaults, lang)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">{t.vaultThisMonth}</p>
              <p className="font-mono tabular-nums text-lg font-bold">
                {formatEUR(totalMonthlyActual, lang)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vaults Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {vaultCards.map(({ item, cumulative, pct }) => (
          <div
            key={item.id}
            className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col justify-between"
          >
            <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-2.5 flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold truncate">
                {getItemLabel(item, lang)}
              </h3>
              <span className="font-mono tabular-nums text-xs font-bold text-[#0E8420] dark:text-[#26A269]">
                {pct}%
              </span>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div>
                <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] mb-3">
                  {t.vaultMonthlyTarget}:{' '}
                  <span className="font-mono tabular-nums font-medium">
                    {formatEUR(item.budgetAmount, lang)}
                  </span>
                </p>

                <div className="h-2 w-full rounded-full bg-[#ECE9E6] dark:bg-[#1B1B1B] overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-[#0E8420] dark:bg-[#26A269] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5E5C64] dark:text-[#9A9996]">{t.vaultThisMonth}</span>
                  <span className="font-mono tabular-nums font-bold">
                    {formatEUR(item.actualAmount, lang)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[#5E5C64] dark:text-[#9A9996]">{t.vaultCumulative}</span>
                  <span className="font-mono tabular-nums font-bold text-[#0E8420] dark:text-[#26A269]">
                    {formatEUR(cumulative, lang)}
                  </span>
                </div>
              </div>

              {currentMonth && (
                <button
                  type="button"
                  onClick={() => onQuickDeposit('savings', item.id)}
                  className="w-full min-h-[40px] rounded-lg bg-[#F5F3F1] hover:bg-[#EAE6E1] dark:bg-[#383838] dark:hover:bg-[#444444] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E95420]" />
                  <span>{t.vaultDeposit}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="text-xs text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums text-right">
        {t.vaultMonthlyTarget}: {formatEUR(totalMonthlyTarget, lang)}
      </div>
    </div>
  );
}
