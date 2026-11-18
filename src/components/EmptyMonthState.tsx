import { useState } from 'react';
import { CalendarPlus, Copy } from 'lucide-react';
import { Language } from '../types/budget';
import { TRANSLATIONS, formatMonthTitle } from '../i18n/translations';

interface EmptyMonthStateProps {
  monthKey: string;
  lang: Language;
  hasAnyMonths: boolean;
  onInitializeFromRecurring: () => Promise<void>;
  onInitializeFromTemplate: () => Promise<void>;
}

export function EmptyMonthState({
  monthKey,
  lang,
  hasAnyMonths,
  onInitializeFromRecurring,
  onInitializeFromTemplate,
}: EmptyMonthStateProps) {
  const t = TRANSLATIONS[lang];
  const [creating, setCreating] = useState(false);

  async function handleAction(fn: () => Promise<void>) {
    setCreating(true);
    try {
      await fn();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden max-w-2xl mx-auto my-8">
      <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-6 py-3 flex items-center justify-between">
        <span className="text-xs font-bold">{formatMonthTitle(monthKey, lang)}</span>
        <span className="text-xs text-[#5E5C64] dark:text-[#9A9996]">{t.emptyMonthBadge}</span>
      </div>

      <div className="p-8 sm:p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#E95420]/12 text-[#E95420] flex items-center justify-center mx-auto mb-5">
          <CalendarPlus className="w-6 h-6" />
        </div>

        <h2 className="font-display text-xl sm:text-2xl font-bold text-balance mb-3">
          {t.monthNotCreatedTitle}
        </h2>
        <p className="text-sm text-[#5E5C64] dark:text-[#C0BFBC] leading-relaxed mb-8 max-w-lg mx-auto">
          {t.monthNotCreatedDesc}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {hasAnyMonths && (
            <button
              type="button"
              disabled={creating}
              onClick={() => handleAction(onInitializeFromRecurring)}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{creating ? t.initializing : t.initializeMonthBtn}</span>
            </button>
          )}

          <button
            type="button"
            disabled={creating}
            onClick={() => handleAction(onInitializeFromTemplate)}
            className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer ${
              hasAnyMonths
                ? 'border border-[#DEDAD6] dark:border-[#3D3D3D] hover:bg-[#F5F3F1] dark:hover:bg-[#383838]'
                : 'bg-[#E95420] hover:bg-[#D34615] text-white'
            }`}
          >
            <span>{creating ? t.initializing : t.initializeBlankBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
