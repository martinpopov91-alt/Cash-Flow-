import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Language, MonthlyBudget } from '../types/budget';
import { MONTH_SHORT, TRANSLATIONS } from '../i18n/translations';

interface MonthPickerModalProps {
  isOpen: boolean;
  selectedMonthKey: string;
  monthsMap: Record<string, MonthlyBudget>;
  lang: Language;
  onSelectMonth: (monthKey: string) => void;
  onClose: () => void;
}

export function MonthPickerModal({
  isOpen,
  selectedMonthKey,
  monthsMap,
  lang,
  onSelectMonth,
  onClose,
}: MonthPickerModalProps) {
  const initialYear = Number(selectedMonthKey.split('-')[0]) || 2026;
  const [browseYear, setBrowseYear] = useState(initialYear);
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  const now = new Date();
  const currentCalendarKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">{t.selectMonth}</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#5E5C64] hover:bg-[#EAE6E1] dark:hover:bg-[#383838] transition-colors cursor-pointer"
            aria-label={t.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setBrowseYear((y) => y - 1)}
              className="min-h-[40px] min-w-[40px] rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] flex items-center justify-center hover:bg-[#F5F3F1] dark:hover:bg-[#383838] transition-colors cursor-pointer"
              aria-label="Previous year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-display text-lg font-bold tabular-nums">{browseYear}</span>

            <button
              type="button"
              onClick={() => setBrowseYear((y) => y + 1)}
              className="min-h-[40px] min-w-[40px] rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] flex items-center justify-center hover:bg-[#F5F3F1] dark:hover:bg-[#383838] transition-colors cursor-pointer"
              aria-label="Next year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {MONTH_SHORT[lang].map((label, idx) => {
              const key = `${browseYear}-${String(idx + 1).padStart(2, '0')}`;
              const exists = Boolean(monthsMap[key]);
              const isSelected = key === selectedMonthKey;
              const isCurrentCal = key === currentCalendarKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSelectMonth(key);
                    onClose();
                  }}
                  className={`min-h-[52px] rounded-lg px-3 py-2 border text-left transition-colors flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#E95420] border-[#E95420] text-white'
                      : exists
                      ? 'bg-[#F7F6F5] dark:bg-[#363636] border-[#DEDAD6] dark:border-[#4A4A4A] hover:border-[#E95420]'
                      : 'bg-white dark:bg-[#2C2C2C] border-[#DEDAD6]/80 dark:border-[#3D3D3D] text-[#5E5C64] dark:text-[#9A9996] hover:bg-[#F5F3F1] dark:hover:bg-[#363636]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{label}</span>
                    {isCurrentCal && !isSelected && (
                      <span className="text-[10px] font-bold text-[#E95420]">Now</span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] ${
                      isSelected
                        ? 'text-white/90'
                        : exists
                        ? 'text-[#0E8420] dark:text-[#26A269]'
                        : 'text-[#8E8B87] dark:text-[#77767B]'
                    }`}
                  >
                    {exists ? t.activeMonthBadge : t.emptyMonthBadge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#ECE9E6] dark:border-[#3D3D3D]">
            <button
              type="button"
              onClick={() => {
                onSelectMonth(currentCalendarKey);
                onClose();
              }}
              className="text-xs font-medium text-[#E95420] hover:underline py-2 cursor-pointer"
            >
              {lang === 'bg' ? 'Към текущия месец' : 'Jump to current month'} ({currentCalendarKey})
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] hover:bg-[#F5F3F1] dark:hover:bg-[#383838] cursor-pointer"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
