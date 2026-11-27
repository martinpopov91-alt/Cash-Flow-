import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  AuthFlowStatus,
  BudgetGroup,
  BudgetLineItem,
  Language,
  MonthlyBudget,
  SideLogDirection,
  SideLogEntry,
  ThemeMode,
  TransactionEntry,
  UserSettings,
} from '../types/budget';
import { SEED_MONTH_KEY, createSeedMayItems } from '../data/seedTemplate';
import { cloneMonthItemsWithoutCarryover, round2 } from '../lib/calculations';

export function useBudgetData() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthFlowStatus>('checking');

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [monthsMap, setMonthsMap] = useState<Record<string, MonthlyBudget>>({});
  const [monthsLoaded, setMonthsLoaded] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(SEED_MONTH_KEY);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [sideLogs, setSideLogs] = useState<SideLogEntry[]>([]);
  const [sideLogsLoading, setSideLogsLoading] = useState(false);
  const [localLanguage, setLocalLanguage] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cf_lang') : null;
    return saved === 'bg' ? 'bg' : 'en';
  });
  const [localTheme, setLocalTheme] = useState<ThemeMode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cf_theme') : null;
    return saved === 'dark' ? 'dark' : 'light';
  });

  const seedingRef = useRef(false);

  // Sync dark class onto <html>
  const activeTheme: ThemeMode = settings?.theme ?? localTheme;
  const activeLanguage: Language = settings?.language ?? localLanguage;

  useEffect(() => {
    const root = document.documentElement;
    if (activeTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('cf_theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem('cf_lang', activeLanguage);
  }, [activeLanguage]);

  // Initial Firestore connection check
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setSettings(null);
        setMonthsMap({});
        setMonthsLoaded(false);
        setTransactions([]);
        setSideLogs([]);
        setAuthStatus((prev) =>
          prev === 'error' || prev === 'cancelled' ? prev : 'idle'
        );
      } else {
        setAuthError(null);
        setAuthStatus('verifying');
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap UserSettings + Seed May 2026 on first sign-in
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;

    async function bootstrapUser(u: User) {
      if (seedingRef.current) return;
      seedingRef.current = true;
      const userPath = `users/${u.uid}`;
      const userRef = doc(db, 'users', u.uid);

      try {
        const snap = await getDoc(userRef);
        if (cancelled) return;

        if (!snap.exists()) {
          const initialSettings: UserSettings = {
            uid: u.uid,
            language: localLanguage,
            theme: localTheme,
            currency: 'EUR',
            defaultSeeded: false,
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, initialSettings);
          if (cancelled) return;

          const mayPath = `users/${u.uid}/months/${SEED_MONTH_KEY}`;
          const mayRef = doc(db, 'users', u.uid, 'months', SEED_MONTH_KEY);
          try {
            await setDoc(mayRef, {
              ownerId: u.uid,
              monthKey: SEED_MONTH_KEY,
              year: 2026,
              month: 5,
              items: createSeedMayItems(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, mayPath);
          }

          await updateDoc(userRef, {
            defaultSeeded: true,
            updatedAt: serverTimestamp(),
          });
        } else {
          const data = snap.data() as UserSettings;
          if (!data.defaultSeeded) {
            const mayRef = doc(db, 'users', u.uid, 'months', SEED_MONTH_KEY);
            const maySnap = await getDoc(mayRef);
            if (!maySnap.exists()) {
              await setDoc(mayRef, {
                ownerId: u.uid,
                monthKey: SEED_MONTH_KEY,
                year: 2026,
                month: 5,
                items: createSeedMayItems(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            await updateDoc(userRef, {
              defaultSeeded: true,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      } finally {
        seedingRef.current = false;
      }
    }

    bootstrapUser(user);

    const userUnsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as UserSettings);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
    );

    const monthsPath = `users/${user.uid}/months`;
    const monthsQuery = query(
      collection(db, 'users', user.uid, 'months'),
      where('ownerId', '==', user.uid)
    );
    const monthsUnsub = onSnapshot(
      monthsQuery,
      (snapshot) => {
        const nextMap: Record<string, MonthlyBudget> = {};
        snapshot.forEach((d) => {
          const data = d.data() as MonthlyBudget;
          nextMap[data.monthKey || d.id] = {
            ...data,
            monthKey: data.monthKey || d.id,
          };
        });
        setMonthsMap(nextMap);
        setMonthsLoaded(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, monthsPath);
      }
    );

    const sideLogsPath = `users/${user.uid}/sideLogs`;
    const sideLogsQuery = query(
      collection(db, 'users', user.uid, 'sideLogs'),
      where('ownerId', '==', user.uid)
    );
    setSideLogsLoading(true);
    const sideLogsUnsub = onSnapshot(
      sideLogsQuery,
      (snapshot) => {
        const list: SideLogEntry[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as Omit<SideLogEntry, 'id'>), id: d.id });
        });
        list.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.id.localeCompare(a.id);
        });
        setSideLogs(list);
        setSideLogsLoading(false);
      },
      (err) => {
        setSideLogsLoading(false);
        handleFirestoreError(err, OperationType.LIST, sideLogsPath);
      }
    );

    return () => {
      cancelled = true;
      userUnsub();
      monthsUnsub();
      sideLogsUnsub();
    };
  }, [authReady, user]);

  // Subscribe to transactions for selected month when that month exists
  const currentMonth = monthsMap[selectedMonthKey] ?? null;
  const currentMonthExists = Boolean(currentMonth);

  useEffect(() => {
    if (!authReady || !user || !currentMonthExists) {
      setTransactions([]);
      setTxLoading(false);
      return;
    }

    setTxLoading(true);
    const txPath = `users/${user.uid}/months/${selectedMonthKey}/transactions`;
    const txQuery = query(
      collection(db, 'users', user.uid, 'months', selectedMonthKey, 'transactions'),
      where('ownerId', '==', user.uid)
    );

    const unsub = onSnapshot(
      txQuery,
      (snapshot) => {
        const list: TransactionEntry[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as Omit<TransactionEntry, 'id'>), id: d.id });
        });
        list.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return b.id.localeCompare(a.id);
        });
        setTransactions(list);
        setTxLoading(false);
      },
      (err) => {
        setTxLoading(false);
        handleFirestoreError(err, OperationType.LIST, txPath);
      }
    );

    return () => unsub();
  }, [authReady, user, selectedMonthKey, currentMonthExists]);

  const sortedMonths = useMemo(() => {
    return Object.values(monthsMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [monthsMap]);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthStatus('opening_popup');
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthStatus('verifying');
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        msg.includes('auth/popup-closed-by-user')
      ) {
        setAuthStatus('cancelled');
      } else {
        setAuthStatus('error');
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const clearAuthFeedback = useCallback(() => {
    setAuthError(null);
    setAuthStatus('idle');
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setAuthError(null);
    setAuthStatus('idle');
  }, []);

  const setLanguage = useCallback(
    async (lang: Language) => {
      setLocalLanguage(lang);
      if (!user) return;
      const path = `users/${user.uid}`;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          language: lang,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const toggleTheme = useCallback(async () => {
    const nextTheme: ThemeMode = activeTheme === 'dark' ? 'light' : 'dark';
    setLocalTheme(nextTheme);
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        theme: nextTheme,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }, [activeTheme, user]);

  const createMonth = useCallback(
    async (targetMonthKey: string, useTemplateFallback = false) => {
      if (!user) return;
      const [yStr, mStr] = targetMonthKey.split('-');
      const year = Number(yStr);
      const month = Number(mStr);

      // Find closest previous month (or latest available month) to copy recurring items without carryover
      const priorMonths = sortedMonths.filter((m) => m.monthKey < targetMonthKey);
      const sourceMonth =
        priorMonths.length > 0
          ? priorMonths[priorMonths.length - 1]
          : sortedMonths[sortedMonths.length - 1];

      const items =
        !useTemplateFallback && sourceMonth
          ? cloneMonthItemsWithoutCarryover(sourceMonth.items)
          : createSeedMayItems().map((item) => ({
              ...item,
              budgetAmount: item.key === 'prev_month' ? 0 : item.budgetAmount,
              actualAmount: 0,
            }));

      const path = `users/${user.uid}/months/${targetMonthKey}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'months', targetMonthKey), {
          ownerId: user.uid,
          monthKey: targetMonthKey,
          year,
          month,
          items: items.slice(0, 100),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [sortedMonths, user]
  );

  const updateLineItem = useCallback(
    async (monthKey: string, itemId: string, updates: Partial<BudgetLineItem>) => {
      if (!user) return;
      const target = monthsMap[monthKey];
      if (!target) return;

      const updatedItems = target.items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          ...updates,
          budgetAmount:
            updates.budgetAmount !== undefined
              ? round2(Math.max(0, updates.budgetAmount))
              : item.budgetAmount,
          actualAmount:
            updates.actualAmount !== undefined
              ? round2(Math.max(0, updates.actualAmount))
              : item.actualAmount,
        };
      });

      const path = `users/${user.uid}/months/${monthKey}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'months', monthKey), {
          items: updatedItems,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [monthsMap, user]
  );

  const addLineItem = useCallback(
    async (
      monthKey: string,
      payload: {
        group: BudgetGroup;
        labelEn: string;
        labelBg: string;
        dueDate: string;
        budgetAmount: number;
        isRecurring: boolean;
        categoryId?: string;
        subcategoryId?: string;
      }
    ) => {
      if (!user) return;
      const target = monthsMap[monthKey];
      if (!target || target.items.length >= 100) return;

      const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const newItem: BudgetLineItem = {
        id,
        group: payload.group,
        key: id,
        labelEn: payload.labelEn.trim().slice(0, 80),
        labelBg: (payload.labelBg.trim() || payload.labelEn.trim()).slice(0, 80),
        dueDate: payload.dueDate.trim().slice(0, 20),
        budgetAmount: round2(Math.max(0, payload.budgetAmount)),
        actualAmount: 0,
        isRecurring: payload.isRecurring,
        highlightType: payload.group === 'savings' ? 'vault' : 'none',
        ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
        ...(payload.subcategoryId ? { subcategoryId: payload.subcategoryId } : {}),
      };

      const path = `users/${user.uid}/months/${monthKey}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'months', monthKey), {
          items: [...target.items, newItem],
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [monthsMap, user]
  );

  const deleteLineItem = useCallback(
    async (monthKey: string, itemId: string) => {
      if (!user) return;
      const target = monthsMap[monthKey];
      if (!target) return;

      const filtered = target.items.filter((i) => i.id !== itemId);
      const path = `users/${user.uid}/months/${monthKey}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'months', monthKey), {
          items: filtered,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [monthsMap, user]
  );

  const logTransaction = useCallback(
    async (
      monthKey: string,
      payload: {
        lineItemId?: string;
        group: BudgetGroup;
        amount: number;
        note: string;
        date: string;
        categoryId?: string;
        subcategoryId?: string;
        subcategoryNameEn?: string;
        subcategoryNameBg?: string;
        newItem?: {
          labelEn: string;
          labelBg: string;
          categoryId: string;
          subcategoryId?: string;
        };
      }
    ) => {
      if (!user) return;
      const target = monthsMap[monthKey];
      if (!target) return;

      const safeAmount = round2(Math.max(0, Math.min(payload.amount, 10_000_000)));
      if (safeAmount <= 0) return;

      const safeId = (val?: string) =>
        val && /^[a-zA-Z0-9_-]{1,64}$/.test(val) ? val : undefined;

      const selectedCategoryId = safeId(payload.categoryId || payload.newItem?.categoryId);
      const selectedSubcategoryId = safeId(
        payload.subcategoryId || payload.newItem?.subcategoryId
      );

      let resolvedLineItemId = payload.lineItemId || '';
      let resolvedCategoryId = selectedCategoryId;
      let resolvedSubcategoryId = selectedSubcategoryId;
      let resolvedSubNameEn = (payload.subcategoryNameEn || payload.newItem?.labelEn || '')
        .trim()
        .slice(0, 100);
      let resolvedSubNameBg = (payload.subcategoryNameBg || payload.newItem?.labelBg || '')
        .trim()
        .slice(0, 100);
      let updatedItems = target.items;

      const existingItem = resolvedLineItemId
        ? target.items.find((i) => i.id === resolvedLineItemId)
        : undefined;

      if (existingItem) {
        resolvedCategoryId = resolvedCategoryId || safeId(existingItem.categoryId);
        resolvedSubcategoryId = resolvedSubcategoryId || safeId(existingItem.subcategoryId);
        if (!resolvedSubNameEn) resolvedSubNameEn = existingItem.labelEn.slice(0, 100);
        if (!resolvedSubNameBg) resolvedSubNameBg = existingItem.labelBg.slice(0, 100);

        updatedItems = target.items.map((item) => {
          if (item.id !== resolvedLineItemId) return item;
          return {
            ...item,
            actualAmount: round2(item.actualAmount + safeAmount),
            ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
            ...(selectedSubcategoryId ? { subcategoryId: selectedSubcategoryId } : {}),
          };
        });
      } else if (payload.newItem && target.items.length < 100) {
        resolvedLineItemId = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const createdItem: BudgetLineItem = {
          id: resolvedLineItemId,
          group: payload.group,
          key: resolvedLineItemId,
          labelEn: payload.newItem.labelEn.trim().slice(0, 80),
          labelBg: (payload.newItem.labelBg.trim() || payload.newItem.labelEn.trim()).slice(
            0,
            80
          ),
          dueDate: '',
          budgetAmount: 0,
          actualAmount: safeAmount,
          isRecurring: false,
          highlightType: payload.group === 'savings' ? 'vault' : 'none',
          categoryId: payload.newItem.categoryId,
          ...(payload.newItem.subcategoryId
            ? { subcategoryId: payload.newItem.subcategoryId }
            : {}),
        };
        updatedItems = [...target.items, createdItem];
      } else {
        return;
      }

      const txId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const txRef = doc(db, 'users', user.uid, 'months', monthKey, 'transactions', txId);
      const monthRef = doc(db, 'users', user.uid, 'months', monthKey);

      const batch = writeBatch(db);
      batch.set(txRef, {
        ownerId: user.uid,
        monthKey,
        lineItemId: resolvedLineItemId,
        group: payload.group,
        amount: safeAmount,
        note: payload.note.trim().slice(0, 200),
        date: payload.date,
        ...(resolvedCategoryId ? { categoryId: resolvedCategoryId } : {}),
        ...(resolvedSubcategoryId ? { subcategoryId: resolvedSubcategoryId } : {}),
        ...(resolvedSubNameEn ? { subcategoryNameEn: resolvedSubNameEn } : {}),
        ...(resolvedSubNameBg ? { subcategoryNameBg: resolvedSubNameBg } : {}),
        createdAt: serverTimestamp(),
      });
      batch.update(monthRef, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `users/${user.uid}/months/${monthKey}/transactions/${txId}`
        );
      }
    },
    [monthsMap, user]
  );

  const deleteTransaction = useCallback(
    async (monthKey: string, tx: TransactionEntry) => {
      if (!user) return;
      const target = monthsMap[monthKey];
      if (!target) return;

      const txRef = doc(db, 'users', user.uid, 'months', monthKey, 'transactions', tx.id);
      const monthRef = doc(db, 'users', user.uid, 'months', monthKey);

      const updatedItems = target.items.map((item) =>
        item.id === tx.lineItemId
          ? { ...item, actualAmount: round2(Math.max(0, item.actualAmount - tx.amount)) }
          : item
      );

      const batch = writeBatch(db);
      batch.delete(txRef);
      batch.update(monthRef, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `users/${user.uid}/months/${monthKey}/transactions/${tx.id}`
        );
      }
    },
    [monthsMap, user]
  );

  const addSideLog = useCallback(
    async (payload: {
      direction: SideLogDirection;
      title: string;
      amount: number;
      date: string;
      note: string;
    }) => {
      if (!user) return;
      const safeAmount = round2(Math.max(0, Math.min(payload.amount, 10_000_000)));
      const safeTitle = payload.title.trim().slice(0, 120);
      if (safeAmount <= 0 || !safeTitle) return;

      const logId = `side_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const path = `users/${user.uid}/sideLogs/${logId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'sideLogs', logId), {
          ownerId: user.uid,
          direction: payload.direction,
          title: safeTitle,
          amount: safeAmount,
          date: payload.date,
          note: payload.note.trim().slice(0, 250),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [user]
  );

  const updateSideLog = useCallback(
    async (
      logId: string,
      payload: {
        direction: SideLogDirection;
        title: string;
        amount: number;
        date: string;
        note: string;
      }
    ) => {
      if (!user) return;
      const safeAmount = round2(Math.max(0, Math.min(payload.amount, 10_000_000)));
      const safeTitle = payload.title.trim().slice(0, 120);
      if (safeAmount <= 0 || !safeTitle) return;

      const path = `users/${user.uid}/sideLogs/${logId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'sideLogs', logId), {
          direction: payload.direction,
          title: safeTitle,
          amount: safeAmount,
          date: payload.date,
          note: payload.note.trim().slice(0, 250),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user]
  );

  const deleteSideLog = useCallback(
    async (logId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/sideLogs/${logId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'sideLogs', logId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  return {
    user,
    authReady,
    authLoading,
    authError,
    authStatus,
    signInWithGoogle,
    clearAuthFeedback,
    signOut,
    settings,
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
    txLoading,
    sideLogs,
    sideLogsLoading,
    createMonth,
    updateLineItem,
    addLineItem,
    deleteLineItem,
    logTransaction,
    deleteTransaction,
    addSideLog,
    updateSideLog,
    deleteSideLog,
  };
}
