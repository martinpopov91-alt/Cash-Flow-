import { useState } from 'react';
import { ActiveTab, BudgetGroup } from './types/budget';
import { useBudgetData } from './hooks/useBudgetData';
import { TRANSLATIONS } from './i18n/translations';
import { AuthScreen } from './components/AuthScreen';
import { AppShell } from './components/AppShell';
import { DashboardView } from './components/DashboardView';
import { LedgerView } from './components/LedgerView';
import { VaultsView } from './components/VaultsView';
import { TrendsView } from './components/TrendsView';
import { EmptyMonthState } from './components/EmptyMonthState';
import { MonthPickerModal } from './components/MonthPickerModal';
import { QuickEntrySheet } from './components/QuickEntrySheet';
import { AddItemModal } from './components/AddItemModal';

export default function App() {
  const {
    user,
    authReady,
    authLoading,
    authError,
    signInWithGoogle,
    signOut,
    activeLanguage,
    activeTheme,
    setLanguage,
    toggleTheme,
    monthsMap,
    sortedMonths,
    monthsLoaded,
    selectedMonthKey,
    setSelectedMonthKey,
    currentMonth,
    transactions,
    createMonth,
    updateLineItem,
    addLineItem,
    deleteLineItem,
    logTransaction,
    deleteTransaction,
  } = useBudgetData();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryGroup, setQuickEntryGroup] = useState<BudgetGroup>('variable');
  const [quickEntryItemId, setQuickEntryItemId] = useState<string | undefined>(undefined);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemGroup, setAddItemGroup] = useState<BudgetGroup>('variable');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = TRANSLATIONS[activeLanguage];

  function notify(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }

  function openQuickEntry(group: BudgetGroup = 'variable', itemId?: string) {
    setQuickEntryGroup(group);
    setQuickEntryItemId(itemId);
    setQuickEntryOpen(true);
  }

  function openAddItem(group: BudgetGroup = 'variable') {
    setAddItemGroup(group);
    setAddItemOpen(true);
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#1B1B1B] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#E95420] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        lang={activeLanguage}
        theme={activeTheme}
        loading={authLoading}
        error={authError}
        onSignIn={signInWithGoogle}
        onToggleLanguage={setLanguage}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <AppShell
      user={user}
      lang={activeLanguage}
      theme={activeTheme}
      activeTab={activeTab}
      selectedMonthKey={selectedMonthKey}
      trackedMonthsCount={sortedMonths.length}
      hasCurrentMonth={Boolean(currentMonth)}
      onSelectTab={setActiveTab}
      onSelectMonth={setSelectedMonthKey}
      onOpenMonthPicker={() => setMonthPickerOpen(true)}
      onOpenQuickEntry={() => openQuickEntry('variable')}
      onToggleLanguage={setLanguage}
      onToggleTheme={toggleTheme}
      onSignOut={signOut}
    >
      {!monthsLoaded ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-28 rounded-xl bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D]"
              />
            ))}
          </div>
          <div className="h-72 rounded-xl bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D]" />
        </div>
      ) : activeTab === 'trends' ? (
        <TrendsView
          allMonths={sortedMonths}
          currentMonth={currentMonth}
          transactions={transactions}
          lang={activeLanguage}
          onSelectMonth={(key) => {
            setSelectedMonthKey(key);
            setActiveTab('overview');
          }}
          onNotify={notify}
        />
      ) : !currentMonth ? (
        <EmptyMonthState
          monthKey={selectedMonthKey}
          lang={activeLanguage}
          hasAnyMonths={sortedMonths.length > 0}
          onInitializeFromRecurring={async () => {
            await createMonth(selectedMonthKey, false);
            notify(t.toastMonthCreated);
          }}
          onInitializeFromTemplate={async () => {
            await createMonth(selectedMonthKey, true);
            notify(t.toastMonthCreated);
          }}
        />
      ) : activeTab === 'overview' ? (
        <DashboardView
          month={currentMonth}
          transactions={transactions}
          lang={activeLanguage}
          onQuickEntry={openQuickEntry}
          onDeleteTransaction={async (tx) => {
            await deleteTransaction(currentMonth.monthKey, tx);
            notify(t.toastEntryRemoved);
          }}
          onOpenLedger={() => setActiveTab('ledger')}
        />
      ) : activeTab === 'ledger' ? (
        <LedgerView
          month={currentMonth}
          lang={activeLanguage}
          onUpdateItem={(itemId, updates) =>
            updateLineItem(currentMonth.monthKey, itemId, updates)
          }
          onDeleteItem={(itemId) => deleteLineItem(currentMonth.monthKey, itemId)}
          onOpenAddItem={openAddItem}
          onQuickEntry={openQuickEntry}
        />
      ) : (
        <VaultsView
          currentMonth={currentMonth}
          allMonths={sortedMonths}
          lang={activeLanguage}
          onQuickDeposit={(group, itemId) => openQuickEntry(group, itemId)}
          onAddVault={() => openAddItem('savings')}
        />
      )}

      <MonthPickerModal
        isOpen={monthPickerOpen}
        selectedMonthKey={selectedMonthKey}
        monthsMap={monthsMap}
        lang={activeLanguage}
        onSelectMonth={setSelectedMonthKey}
        onClose={() => setMonthPickerOpen(false)}
      />

      {currentMonth && (
        <>
          <QuickEntrySheet
            isOpen={quickEntryOpen}
            monthKey={currentMonth.monthKey}
            items={currentMonth.items}
            lang={activeLanguage}
            initialGroup={quickEntryGroup}
            initialItemId={quickEntryItemId}
            onSave={async (payload) => {
              await logTransaction(currentMonth.monthKey, payload);
              notify(t.toastEntrySaved);
            }}
            onClose={() => setQuickEntryOpen(false)}
          />

          <AddItemModal
            isOpen={addItemOpen}
            initialGroup={addItemGroup}
            lang={activeLanguage}
            onAdd={async (payload) => {
              await addLineItem(currentMonth.monthKey, payload);
              notify(t.toastItemAdded);
            }}
            onClose={() => setAddItemOpen(false)}
          />
        </>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 px-4 py-2.5 rounded-lg bg-[#1D1D1D] text-white border border-[#3D3D3D] text-xs font-medium shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </AppShell>
  );
}
