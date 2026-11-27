import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Globe,
  Layers,
  Loader2,
  Lock,
  Moon,
  NotebookPen,
  ShieldCheck,
  Sun,
  Table2,
  UserRound,
} from 'lucide-react';
import { AuthFlowStatus, Language, ThemeMode } from '../types/budget';
import { TRANSLATIONS } from '../i18n/translations';
import { UbuntuCircleMark } from './UbuntuSplashScreen';

interface AuthScreenProps {
  lang: Language;
  theme: ThemeMode;
  loading: boolean;
  error: string | null;
  status: AuthFlowStatus;
  onSignIn: () => void;
  onClearError: () => void;
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

function formatGnomeClock(date: Date, lang: Language): string {
  return new Intl.DateTimeFormat(lang === 'bg' ? 'bg-BG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function AuthScreen({
  lang,
  theme,
  loading,
  error,
  status,
  onSignIn,
  onClearError,
  onToggleLanguage,
  onToggleTheme,
}: AuthScreenProps) {
  const t = TRANSLATIONS[lang];
  const [clockLabel, setClockLabel] = useState(() => formatGnomeClock(new Date(), lang));

  useEffect(() => {
    setClockLabel(formatGnomeClock(new Date(), lang));
    const timer = window.setInterval(() => {
      setClockLabel(formatGnomeClock(new Date(), lang));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [lang]);

  const friendlyError = (() => {
    if (!error) return null;
    if (error.includes('auth/unauthorized-domain')) return t.signInErrDomain;
    if (error.includes('auth/popup-blocked')) return t.signInErrPopupBlocked;
    if (error.includes('auth/popup-closed-by-user')) return t.signInErrPopupClosed;
    if (error.includes('auth/network-request-failed')) return t.signInErrNetwork;
    return error;
  })();

  const isBusy = loading || status === 'opening_popup' || status === 'verifying';
  const activeStep =
    status === 'opening_popup' ? 1 : status === 'verifying' ? 2 : 0;

  const buttonLabel =
    status === 'opening_popup'
      ? t.authOpeningBtn
      : status === 'verifying'
      ? t.authVerifyingBtn
      : loading
      ? t.signInLoading
      : t.signInButton;

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

  const steps = [
    { id: 1, label: t.authStep1 },
    { id: 2, label: t.authStep2 },
    { id: 3, label: t.authStep3 },
  ];

  return (
    <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#1B1B1B] text-[#2B2929] dark:text-[#EEEEEC] flex flex-col">
      {/* GNOME Top System Panel */}
      <header className="w-full bg-[#1D1D1D] text-[#EEEEEC] border-b border-black/40 h-12 px-4 sm:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <UbuntuCircleMark className="w-5 h-5" />
          <span className="font-display text-sm font-bold tracking-tight whitespace-nowrap">
            {t.brand}
          </span>
        </div>

        <div className="hidden md:block text-xs font-medium text-[#DEDDDA] font-mono tabular-nums whitespace-nowrap">
          {clockLabel}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleLanguage(lang === 'en' ? 'bg' : 'en')}
            className="min-h-[32px] px-2.5 py-1 rounded-md bg-[#2A2A2A] hover:bg-[#383838] text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={t.languageLabel}
          >
            <Globe className="w-3.5 h-3.5 text-[#E95420]" />
            <span>{lang.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[32px] min-w-[32px] rounded-md bg-[#2A2A2A] hover:bg-[#383838] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
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

      {/* Main Content Split */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Canonical Aubergine Ubuntu Splash Panel */}
          <section className="lg:col-span-7 relative rounded-xl overflow-hidden bg-gradient-to-br from-[#4D123B] via-[#2C001E] to-[#170612] text-white border border-[#3B1730] p-7 sm:p-9 flex flex-col justify-between">
            {/* Subtle Ubuntu Geometric Ring Backdrop */}
            <svg
              className="absolute -right-24 -bottom-24 w-80 h-80 text-white/6 pointer-events-none"
              viewBox="0 0 200 200"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="62" stroke="#E95420" strokeOpacity="0.35" strokeWidth="2" />
              <circle cx="100" cy="100" r="36" stroke="currentColor" strokeWidth="1" />
            </svg>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <UbuntuCircleMark className="w-10 h-10 shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-base font-bold tracking-tight leading-none">
                    {t.brand}
                  </p>
                  <p className="text-xs text-[#DFC4D4] mt-1">
                    {t.authUbuntuEdition} · {t.brandSubtitle} · EUR
                  </p>
                </div>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-balance leading-tight mb-3">
                {t.signInTitle}
              </h1>

              <p className="text-sm text-[#E9D7E2] leading-relaxed max-w-xl mb-7">
                {t.signInSubtitle}
              </p>
            </div>

            <div className="relative z-10 divide-y divide-white/12 border-t border-white/12">
              {capabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.title} className="py-3.5 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/12 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#FF8C66]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-white">{cap.title}</h2>
                      <p className="text-xs text-[#D5BBCB] leading-relaxed mt-0.5">
                        {cap.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right: Yaru GDM Sign-In Window Card */}
          <section className="lg:col-span-5 bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-xl overflow-hidden flex flex-col">
            <div className="bg-[#F2F0EE] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-6 py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-[#E95420] shrink-0" />
                <span className="font-display text-xs font-bold truncate">
                  {t.signInCardHeader}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#5E5C64] dark:text-[#9A9996] shrink-0">
                Google OAuth
              </span>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
              {/* GDM User Avatar + Title */}
              <div className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                  {isBusy && (
                    <div
                      className="absolute inset-0 rounded-full border-2 border-[#E95420]/25 border-t-[#E95420] animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                      status === 'error'
                        ? 'bg-[#C7162B]/10 border-[#C7162B]/40 text-[#C7162B] dark:text-[#FF7B89]'
                        : status === 'cancelled'
                        ? 'bg-[#E99002]/12 border-[#E99002]/40 text-[#E99002]'
                        : isBusy
                        ? 'bg-[#E95420]/10 border-[#E95420]/40 text-[#E95420]'
                        : 'bg-[#F5F3F1] dark:bg-[#383838] border-[#DEDAD6] dark:border-[#4A4A4A] text-[#5E5C64] dark:text-[#DEDDDA]'
                    }`}
                  >
                    <UserRound className="w-7 h-7" />
                  </div>
                </div>

                <h2 className="font-display text-2xl font-bold tracking-tight mb-1.5 text-balance">
                  {t.signInCardTitle}
                </h2>
                <p className="text-xs sm:text-sm text-[#5E5C64] dark:text-[#C0BFBC] leading-relaxed max-w-sm">
                  {t.signInCardDesc}
                </p>
              </div>

              {/* Login Flow Steps + Live Status Feedback */}
              <div className="space-y-3">
                {/* 3-Step Login Progress Strip */}
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium">
                  {steps.map((step) => {
                    const isCompleted = activeStep > step.id;
                    const isCurrent = activeStep === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`px-2 py-1.5 rounded-lg border text-center flex items-center justify-center gap-1 transition-colors ${
                          isCompleted
                            ? 'bg-[#0E8420]/10 border-[#0E8420]/30 text-[#0E8420] dark:text-[#26A269]'
                            : isCurrent
                            ? 'bg-[#E95420]/10 border-[#E95420]/35 text-[#E95420]'
                            : 'bg-[#F7F6F5] dark:bg-[#242424] border-[#ECE9E6] dark:border-[#3A3A3A] text-[#5E5C64] dark:text-[#9A9996]'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3 h-3 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                        ) : (
                          <span className="font-mono">{step.id}.</span>
                        )}
                        <span className="truncate">{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Live Status Feedback Box */}
                {status === 'error' && friendlyError ? (
                  <div
                    role="alert"
                    className="p-3.5 rounded-lg border border-[#C7162B]/35 bg-[#C7162B]/10 text-xs text-[#C7162B] dark:text-[#FF7B89] space-y-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0 space-y-1 flex-1">
                        <p className="font-semibold">{t.authStatusError}</p>
                        <p className="leading-relaxed">{friendlyError}</p>
                        {friendlyError !== error && (
                          <p className="font-mono text-[11px] opacity-80 break-all">{error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onClearError}
                        className="text-[11px] font-medium underline hover:opacity-80 cursor-pointer"
                      >
                        {t.authDismiss}
                      </button>
                    </div>
                  </div>
                ) : status === 'cancelled' ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-3 rounded-lg border border-[#E99002]/35 bg-[#E99002]/10 text-xs text-[#9C6000] dark:text-[#F5A623] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="leading-snug">{t.authStatusCancelled}</span>
                    </div>
                    <button
                      type="button"
                      onClick={onClearError}
                      className="text-[11px] font-medium underline shrink-0 cursor-pointer"
                    >
                      {t.authDismiss}
                    </button>
                  </div>
                ) : (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                      status === 'opening_popup' || status === 'verifying'
                        ? 'border-[#E95420]/35 bg-[#E95420]/8 text-[#2B2929] dark:text-[#EEEEEC]'
                        : 'border-[#ECE9E6] dark:border-[#3A3A3A] bg-[#F7F6F5] dark:bg-[#242424] text-[#5E5C64] dark:text-[#C0BFBC]'
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 text-[#E95420] shrink-0 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-[#0E8420] dark:text-[#26A269] shrink-0" />
                    )}
                    <span className="leading-snug">
                      {status === 'opening_popup'
                        ? t.authStatusOpeningPopup
                        : status === 'verifying'
                        ? t.authStatusVerifying
                        : t.authStatusIdle}
                    </span>
                  </div>
                )}

                {/* Primary Google Sign-In CTA */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={onSignIn}
                  className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white font-medium text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E95420] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#2C2C2C]"
                >
                  <span className="w-6 h-6 rounded-md bg-white flex items-center justify-center shrink-0">
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#E95420] animate-spin" />
                    ) : (
                      <GoogleMark />
                    )}
                  </span>
                  <span>{buttonLabel}</span>
                </button>
              </div>

              {/* Trust Summary */}
              <div className="pt-4 border-t border-[#ECE9E6] dark:border-[#3D3D3D] space-y-2 text-xs text-[#5E5C64] dark:text-[#9A9996]">
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
        <span>{t.authUbuntuEdition}</span>
        <span aria-hidden="true"> · </span>
        <span>EUR</span>
        <span aria-hidden="true"> · </span>
        <span>{lang === 'bg' ? 'Защитено чрез Google вход' : 'Secured by Google Sign-In'}</span>
      </footer>
    </div>
  );
}
