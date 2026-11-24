import {
  AlertCircle,
  Check,
  Globe,
  Layers,
  Lock,
  Moon,
  NotebookPen,
  ShieldCheck,
  Sun,
  Table2,
  Terminal,
} from 'lucide-react';
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

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
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

  const friendlyError = (() => {
    if (!error) return null;
    if (error.includes('auth/unauthorized-domain')) return t.signInErrDomain;
    if (error.includes('auth/popup-blocked')) return t.signInErrPopupBlocked;
    if (error.includes('auth/popup-closed-by-user')) return t.signInErrPopupClosed;
    return error;
  })();

  const capabilities = [
    {
      icon: Table2,
      title: t.signInFeature1Title,
      desc: t.signInFeature1Desc,
    },
    {
      icon: Layers,
      title: t.signInFeature2Title,
      desc: t.signInFeature2Desc,
    },
    {
      icon: NotebookPen,
      title: t.signInFeature3Title,
      desc: t.signInFeature3Desc,
    },
    {
      icon: ShieldCheck,
      title: t.signInFeature4Title,
      desc: t.signInFeature4Desc,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3F1] via-[#F2ECE9] to-[#EAE0E8] dark:from-[#1B1B1B] dark:via-[#231521] dark:to-[#181818] text-[#2B2929] dark:text-[#EEEEEC] flex flex-col">
      {/* GNOME Top System Bar */}
      <header className="w-full bg-[#1D1D1D] text-[#EEEEEC] border-b border-black/40 h-12 px-4 sm:px-8 flex items-center justify-between gap-8">
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
            className="min-h-[32px] px-2.5 py-1 rounded-md bg-[#2D2D2D] hover:bg-[#3A3A3A] text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={t.languageLabel}
          >
            <Globe className="w-3.5 h-3.5 text-[#E95420]" />
            <span>{lang.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[32px] min-w-[32px] rounded-md bg-[#2D2D2D] hover:bg-[#3A3A3A] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            title={theme === 'dark' ? t.lightMode : t.darkMode}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#F5A623]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#EEEEEC]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Official Product Overview */}
          <section className="lg:col-span-7 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium text-[#77216F] dark:text-[#D47CD0] mb-3">
                {t.brand} · {t.brandSubtitle} · EUR
              </p>

              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance leading-tight mb-4">
                {t.signInTitle}
              </h1>

              <p className="text-sm sm:text-base text-[#5E5C64] dark:text-[#C0BFBC] leading-relaxed max-w-xl mb-8">
                {t.signInSubtitle}
              </p>
            </div>

            <div className="divide-y divide-[#DEDAD6] dark:divide-[#353535] border-t border-b border-[#DEDAD6] dark:border-[#353535]">
              {capabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.title} className="py-3.5 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#E95420]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[#2B2929] dark:text-white">
                        {cap.title}
                      </h2>
                      <p className="text-xs text-[#5E5C64] dark:text-[#9A9996] leading-relaxed mt-0.5">
                        {cap.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right: Official Sign-In Window Card */}
          <section className="lg:col-span-5 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-6 py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-[#E95420] shrink-0" />
                <span className="font-display text-xs font-bold truncate">
                  {t.signInCardHeader}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#5E5C64] dark:text-[#9A9996] shrink-0">
                Google Auth
              </span>
            </div>

            <div className="p-7 sm:p-8 flex-1 flex flex-col justify-between gap-8">
              <div>
                <div className="w-11 h-11 rounded-xl bg-[#231421] text-white flex items-center justify-center mb-5">
                  <Terminal className="w-5 h-5 text-[#E95420]" />
                </div>

                <h2 className="font-display text-2xl font-bold tracking-tight mb-2 text-balance">
                  {t.signInCardTitle}
                </h2>
                <p className="text-sm text-[#5E5C64] dark:text-[#C0BFBC] leading-relaxed">
                  {t.signInCardDesc}
                </p>
              </div>

              <div className="space-y-4">
                {friendlyError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-lg border border-[#C7162B]/35 bg-[#C7162B]/10 text-xs text-[#C7162B] dark:text-[#FF7B89] flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-relaxed">{friendlyError}</p>
                      {friendlyError !== error && (
                        <p className="font-mono text-[11px] opacity-80 break-all">{error}</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={onSignIn}
                  className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white font-medium text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E95420] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#2C2C2C]"
                >
                  <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0">
                    {loading ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-[#E95420] border-t-transparent animate-spin" />
                    ) : (
                      <GoogleMark />
                    )}
                  </span>
                  <span>{loading ? t.signInLoading : t.signInButton}</span>
                </button>
              </div>

              <div className="pt-5 border-t border-[#ECE9E6] dark:border-[#3D3D3D] space-y-2.5 text-xs text-[#5E5C64] dark:text-[#9A9996]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#0E8420] dark:text-[#26A269] shrink-0" />
                  <span>{t.signInTrust1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#0E8420] dark:text-[#26A269] shrink-0" />
                  <span>{t.signInTrust2}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#0E8420] dark:text-[#26A269] shrink-0" />
                  <span>{t.signInTrust3}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="px-4 sm:px-8 py-4 border-t border-[#DEDAD6]/70 dark:border-[#2F2F2F] text-center text-xs text-[#5E5C64] dark:text-[#9A9996]">
        <span>{t.brand}</span>
        <span aria-hidden="true"> · </span>
        <span>{t.brandSubtitle}</span>
        <span aria-hidden="true"> · </span>
        <span>EUR</span>
        <span aria-hidden="true"> · </span>
        <span>{lang === 'bg' ? 'Защитено чрез Google вход' : 'Secured by Google Sign-In'}</span>
      </footer>
    </div>
  );
}
