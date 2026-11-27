import { AuthFlowStatus, Language } from '../types/budget';
import { TRANSLATIONS } from '../i18n/translations';

export function UbuntuCircleMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="#E95420" />
      <circle
        cx="32"
        cy="32"
        r="15.5"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeDasharray="24 8.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="11.5" r="4.2" fill="#FFFFFF" stroke="#E95420" strokeWidth="1.5" />
      <circle cx="14.2" cy="42.2" r="4.2" fill="#FFFFFF" stroke="#E95420" strokeWidth="1.5" />
      <circle cx="49.8" cy="42.2" r="4.2" fill="#FFFFFF" stroke="#E95420" strokeWidth="1.5" />
    </svg>
  );
}

interface UbuntuSplashScreenProps {
  lang: Language;
  status?: AuthFlowStatus;
}

export function UbuntuSplashScreen({
  lang,
  status = 'checking',
}: UbuntuSplashScreenProps) {
  const t = TRANSLATIONS[lang];
  const statusLabel =
    status === 'verifying' ? t.splashVerifyingWorkspace : t.splashCheckingSession;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4D123B] via-[#2C001E] to-[#170612] text-white flex flex-col justify-between p-6 sm:p-10">
      <div />

      <div className="flex flex-col items-center text-center max-w-sm mx-auto space-y-6">
        <div className="relative flex items-center justify-center">
          <div
            className="w-24 h-24 rounded-full border-2 border-white/15 border-t-[#E95420] animate-spin"
            aria-hidden="true"
          />
          <UbuntuCircleMark className="w-14 h-14 absolute" />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.brand}
          </h1>
          <p className="text-xs text-[#E4CBD9] tracking-wide">
            {t.brandSubtitle}
          </p>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="px-4 py-2 rounded-lg bg-white/8 border border-white/12 text-xs text-[#F5EDF2]"
        >
          {statusLabel}
        </div>
      </div>

      <footer className="text-center text-xs text-[#C7A8B9]">
        <span>{t.brand}</span>
        <span aria-hidden="true"> · </span>
        <span>{t.authUbuntuEdition}</span>
        <span aria-hidden="true"> · </span>
        <span>EUR</span>
      </footer>
    </div>
  );
}
