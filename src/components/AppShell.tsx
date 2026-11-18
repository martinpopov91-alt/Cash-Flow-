import { ReactNode } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  PiggyBank,
  Plus,
  Sun,
  Table2,
  Terminal,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ActiveTab, Language, ThemeMode } from '../types/budget';
import { TRANSLATIONS, formatMonthTitle } from '../i18n/translations';
import { shiftMonthKey } from '../lib/calculations';

interface AppShellProps {
  user: User;
  lang: Language;
  theme: ThemeMode;
  activeTab: ActiveTab;
  selectedMonthKey: string;
  trackedMonthsCount: number;
  hasCurrentMonth: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectMonth: (monthKey: string) => void;
  onOpenMonthPicker: () => void;
  onOpenQuickEntry: () => void;
  onToggleLanguage: (lang: Language) => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

export function AppShell({
  user,
  lang,
  theme,
  activeTab,
  selectedMonthKey,
  trackedMonthsCount,
  hasCurrentMonth,
  onSelectTab,
  onSelectMonth,
  onOpenMonthPicker,
  onOpenQuickEntry,
  onToggleLanguage,
  onToggleTheme,
  onSignOut,
  children,
}: AppShellProps) {
  const t = TRANSLATIONS[lang];

  const navItems: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: t.navOverview, icon: LayoutDashboard },
    { id: 'ledger', label: t.navLedger, icon: Table2 },
    { id: 'vaults', label: t.navVaults, icon: PiggyBank },
    { id: 'trends', label: t.navTrends, icon: BarChart3 },
  ];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label ?? t.brand;

  return (
    <div className="min-h-screen bg-[#F5F3F1] text-[#2B2929] dark:bg-[#1B1B1B] dark:text-[#EEEEEC] flex flex-col">
      {/* GNOME Top System Panel (pinned across top on Desktop & Mobile) */}
      <header className="sticky top-0 z-30 bg-[#1D1D1D] text-[#EEEEEC] border-b border-black/40 h-12 px-3 sm:px-5 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Active Activity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Terminal className="w-4 h-4 text-[#E95420]" />
            <span className="font-display text-sm font-bold tracking-tight whitespace-nowrap">
              {t.brand}
            </span>
          </div>
          <span className="hidden lg:inline text-[#77767B]" aria-hidden="true">
            /
          </span>
          <h1 className="hidden lg:block font-display text-xs font-medium text-[#C0BFBC] whitespace-nowrap truncate">
            {activeNavLabel}
          </h1>
        </div>

        {/* Zone 2: Center Month Navigator */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonthKey, -1))}
            className="min-h-[34px] min-w-[34px] rounded-md flex items-center justify-center hover:bg-[#2F2F2F] text-[#C0BFBC] hover:text-white transition-colors cursor-pointer"
            aria-label={t.previousMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenMonthPicker}
            className="min-h-[34px] px-3 py-1 rounded-md bg-[#2A2A2A] hover:bg-[#353535] border border-[#3E3E3E] text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#E95420]" />
            <span>{formatMonthTitle(selectedMonthKey, lang)}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMonth(shiftMonthKey(selectedMonthKey, 1))}
            className="min-h-[34px] min-w-[34px] rounded-md flex items-center justify-center hover:bg-[#2F2F2F] text-[#C0BFBC] hover:text-white transition-colors cursor-pointer"
            aria-label={t.nextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zone 3: System Tray Controls + Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleLanguage(lang === 'en' ? 'bg' : 'en')}
            className="min-h-[32px] px-2.5 rounded-md bg-[#2A2A2A] hover:bg-[#353535] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            aria-label={t.languageLabel}
          >
            <Globe className="w-3.5 h-3.5 text-[#E95420] hidden sm:inline" />
            <span>{lang.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[32px] min-w-[32px] rounded-md bg-[#2A2A2A] hover:bg-[#353535] flex items-center justify-center transition-colors cursor-pointer"
            aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
            title={theme === 'dark' ? t.lightMode : t.darkMode}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#F5A623]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#EEEEEC]" />
            )}
          </button>

          {hasCurrentMonth && (
            <button
              type="button"
              onClick={onOpenQuickEntry}
              className="hidden lg:flex min-h-[32px] px-3 py-1 rounded-md bg-[#E95420] hover:bg-[#D34615] text-white text-xs font-medium items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.quickEntry}</span>
            </button>
          )}
        </div>
      </header>

      {/* Workspace Body: Ubuntu Left Dock + Main Window Area */}
      <div className="flex-1 flex min-w-0">
        {/* Ubuntu Left Dock (Desktop lg+) */}
        <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:top-12 lg:bottom-0 lg:left-0 bg-[#231421] dark:bg-[#191218] text-[#EEEEEC] border-r border-black/30 z-20">
          <nav className="flex-1 px-2.5 py-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white/12 text-white'
                      : 'text-[#C0BFBC] hover:bg-white/8 hover:text-white'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#E95420]"
                    />
                  )}
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-[#E95420] text-white'
                        : 'bg-white/8 text-[#DEDDDA]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Dock Footer: Sync Info + User Account */}
          <div className="p-3.5 border-t border-white/10 space-y-3">
            <div className="px-1 flex items-center justify-between text-[11px] text-[#B8B0B6]">
              <span>
                {trackedMonthsCount} {t.monthsTracked}
              </span>
              <span>{t.syncedStatus}</span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-white/6 rounded-xl p-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#E95420] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-[11px] text-[#B8B0B6] truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#C0BFBC] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title={t.signOut}
                aria-label={t.signOut}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Scrollable Content Viewport (full width) */}
        <main className="flex-1 lg:pl-60 w-full min-w-0">
          <div className="w-full px-4 sm:px-6 py-5 pb-24 lg:pb-8">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Ubuntu Dock (compact <= 64px, keeping total sticky <= 15% VH) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1D1D1D]/95 text-[#EEEEEC] backdrop-blur-md border-t border-black/40 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          <button
            type="button"
            onClick={() => onSelectTab('overview')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'overview' ? 'text-[#E95420]' : 'text-[#C0BFBC]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium truncate max-w-full px-1">
              {t.navOverview}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('ledger')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'ledger' ? 'text-[#E95420]' : 'text-[#C0BFBC]'
            }`}
          >
            <Table2 className="w-5 h-5" />
            <span className="text-[10px] font-medium truncate max-w-full px-1">
              {lang === 'bg' ? 'Таблица' : 'Sheet'}
            </span>
          </button>

          {/* Center Thumb-Zone Ubuntu Orange Action */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              disabled={!hasCurrentMonth}
              onClick={onOpenQuickEntry}
              className="w-11 h-11 rounded-xl bg-[#E95420] hover:bg-[#D34615] text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform disabled:opacity-40"
              aria-label={t.quickEntry}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('vaults')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'vaults' ? 'text-[#E95420]' : 'text-[#C0BFBC]'
            }`}
          >
            <PiggyBank className="w-5 h-5" />
            <span className="text-[10px] font-medium truncate max-w-full px-1">
              {lang === 'bg' ? 'Трезори' : 'Vaults'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('trends')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'trends' ? 'text-[#E95420]' : 'text-[#C0BFBC]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-medium truncate max-w-full px-1">
              {lang === 'bg' ? 'Тенденции' : 'Trends'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
