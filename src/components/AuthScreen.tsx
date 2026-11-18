import { ArrowRight, Globe, Moon, ShieldCheck, Sun, Terminal } from 'lucide-react';
import { Language, ThemeMode } from '../types/budget';
import { TRANSLATIONS } from '../i18n/translations';

interface AuthScreenProps {
  lang: Language;
  theme: ThemeMode;
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
  onToggleLanguage: (lang: Language) => void;
  onToggleTheme: () => void;
}

export function AuthScreen({
  lang,
  theme,
  loading,
  error,
  onSignIn,
  onToggleLanguage,
  onToggleTheme,
}: AuthScreenProps) {
  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3F1] via-[#F2ECE9] to-[#EAE0E8] dark:from-[#1B1B1B] dark:via-[#231521] dark:to-[#181818] text-[#2B2929] dark:text-[#EEEEEC] flex flex-col">
      {/* GNOME Top System Bar */}
      <header className="w-full bg-[#1D1D1D] text-[#EEEEEC] border-b border-black/40 h-11 px-4 sm:px-6 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <Terminal className="w-4 h-4 text-[#E95420]" />
          <span className="font-display text-sm font-bold tracking-tight whitespace-nowrap">
            {t.brand}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleLanguage(lang === 'en' ? 'bg' : 'en')}
            className="min-h-[30px] px-2.5 py-1 rounded-md bg-[#2D2D2D] hover:bg-[#3A3A3A] text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={t.languageLabel}
          >
            <Globe className="w-3.5 h-3.5 text-[#E95420]" />
            <span>{lang.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[30px] min-w-[30px] rounded-md bg-[#2D2D2D] hover:bg-[#3A3A3A] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#F5A623]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#EEEEEC]" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Primary GNOME Window Card */}
          <div className="lg:col-span-7 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]">
                {t.brandSubtitle}
              </span>
              <span className="text-xs font-mono text-[#E95420] font-medium">EUR</span>
            </div>

            <div className="p-7 sm:p-9 flex-1 flex flex-col justify-between">
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance leading-tight mb-4">
                  {t.signInTitle}
                </h1>
                <p className="text-sm sm:text-base text-[#5E5C64] dark:text-[#C0BFBC] leading-relaxed mb-8 max-w-xl">
                  {t.signInSubtitle}
                </p>
              </div>

              <div>
                {error && (
                  <div className="mb-4 p-3 rounded-lg border border-[#C7162B]/30 bg-[#C7162B]/10 text-xs text-[#C7162B] dark:text-[#FF7B89]">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={onSignIn}
                  className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white font-medium text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <span>{loading ? t.signInLoading : t.signInButton}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="mt-5 flex items-center gap-2 text-xs text-[#5E5C64] dark:text-[#9A9996]">
                  <ShieldCheck className="w-4 h-4 text-[#0E8420] dark:text-[#26A269] shrink-0" />
                  <span>
                    {lang === 'bg'
                      ? 'Личните ви данни се синхронизират сигурно в облака чрез вашия Google профил.'
                      : 'Private cloud sync across desktop and mobile secured by your Google account.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary GNOME Window Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-6 py-3">
              <h2 className="font-display text-xs font-bold tracking-normal">
                {lang === 'bg' ? 'Структура на бюджета' : 'Included Ledger Blueprint'}
              </h2>
            </div>

            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] mb-5">
                  {lang === 'bg'
                    ? 'Заредено автоматично с вашата майска таблица в EUR'
                    : 'Pre-loaded with your May EUR budget structure'}
                </p>

                <div className="divide-y divide-[#ECE9E6] dark:divide-[#3D3D3D] text-sm">
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#5E5C64] dark:text-[#C0BFBC]">{t.groupIncome}</span>
                    <span className="font-mono tabular-nums font-bold">3 507,71 EUR</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#5E5C64] dark:text-[#C0BFBC]">{t.groupBills}</span>
                    <span className="font-mono tabular-nums font-bold">1 759,49 EUR</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#5E5C64] dark:text-[#C0BFBC]">{t.groupVariable}</span>
                    <span className="font-mono tabular-nums font-bold">30,00 EUR</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-[#5E5C64] dark:text-[#C0BFBC]">{t.groupSavings}</span>
                    <span className="font-mono tabular-nums font-bold text-[#0E8420] dark:text-[#26A269]">
                      383,00 EUR
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#ECE9E6] dark:border-[#3D3D3D] flex items-center justify-between text-xs text-[#5E5C64] dark:text-[#9A9996]">
                <span>{lang === 'bg' ? '8 спестовни трезора' : '8 Savings Vaults'}</span>
                <span aria-hidden="true">·</span>
                <span>{lang === 'bg' ? 'EN / BG превод' : 'EN / BG toggle'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
