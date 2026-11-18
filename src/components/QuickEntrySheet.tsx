import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import {
  BudgetGroup,
  BudgetLineItem,
  CategorySubitem,
  Language,
  MainCategory,
} from '../types/budget';
import { TRANSLATIONS, getGroupTitle, getItemLabel } from '../i18n/translations';
import {
  MAIN_CATEGORIES,
  findSubcategoryById,
  getMainCategoryName,
  getSubcategoryName,
  mapCategoryGroupToLedgerGroup,
  resolveItemMainCategory,
} from '../data/categories';
import { formatEUR, getDefaultDateForMonth, parseNumberInput } from '../lib/calculations';

interface QuickEntrySheetProps {
  isOpen: boolean;
  monthKey: string;
  items: BudgetLineItem[];
  lang: Language;
  initialGroup?: BudgetGroup;
  initialItemId?: string;
  onSave: (payload: {
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
  }) => Promise<void>;
  onClose: () => void;
}

const GROUPS: BudgetGroup[] = ['variable', 'bills', 'savings', 'income'];

export function QuickEntrySheet({
  isOpen,
  monthKey,
  items,
  lang,
  initialGroup = 'variable',
  initialItemId,
  onSave,
  onClose,
}: QuickEntrySheetProps) {
  const t = TRANSLATIONS[lang];
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const [pickerMode, setPickerMode] = useState<'existing' | 'taxonomy'>(
    initialItemId ? 'existing' : 'taxonomy'
  );
  const [group, setGroup] = useState<BudgetGroup>(initialGroup);
  const [lineItemId, setLineItemId] = useState<string>(initialItemId || '');

  // Cascading taxonomy picker state (matching AddItemModal)
  const [taxonomySearch, setTaxonomySearch] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  const [amountStr, setAmountStr] = useState<string>('');
  const [date, setDate] = useState<string>(() => getDefaultDateForMonth(monthKey));
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const filteredItems = useMemo(
    () => items.filter((item) => item.group === group),
    [items, group]
  );

  const selectedExistingItem = useMemo(
    () => filteredItems.find((i) => i.id === lineItemId) || null,
    [filteredItems, lineItemId]
  );

  const selectedExistingTaxonomy = useMemo(() => {
    if (!selectedExistingItem) return null;
    const cat = resolveItemMainCategory(selectedExistingItem);
    const subMatch = findSubcategoryById(selectedExistingItem.subcategoryId);
    return {
      category: subMatch?.category || cat,
      subcategory: subMatch?.subcategory || null,
    };
  }, [selectedExistingItem]);

  const selectedCategory = useMemo(
    () => MAIN_CATEGORIES.find((c) => c.id === selectedCategoryId) || null,
    [selectedCategoryId]
  );

  const selectedSubcategory = useMemo(
    () =>
      selectedCategory?.subcategories.find((s) => s.id === selectedSubcategoryId) || null,
    [selectedCategory, selectedSubcategoryId]
  );

  const orderedCategories = useMemo(() => {
    return [...MAIN_CATEGORIES].sort((a, b) => {
      const aMatch = mapCategoryGroupToLedgerGroup(a.group) === group ? 0 : 1;
      const bMatch = mapCategoryGroupToLedgerGroup(b.group) === group ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [group]);

  const searchMatches = useMemo(() => {
    const q = taxonomySearch.trim().toLowerCase();
    if (!q) return [];
    const results: { category: MainCategory; subcategory: CategorySubitem }[] = [];
    for (const cat of MAIN_CATEGORIES) {
      const catMatch =
        cat.name.toLowerCase().includes(q) || cat.nameBg.toLowerCase().includes(q);
      for (const sub of cat.subcategories) {
        const subMatch =
          sub.name.toLowerCase().includes(q) || sub.nameBg.toLowerCase().includes(q);
        if (catMatch || subMatch) {
          results.push({ category: cat, subcategory: sub });
        }
      }
    }
    return results.slice(0, 12);
  }, [taxonomySearch]);

  // Check if selected taxonomy subcategory matches an item in the current month
  const matchedExistingFromTaxonomy = useMemo(() => {
    if (!selectedSubcategory) return null;
    return (
      items.find(
        (i) =>
          i.subcategoryId === selectedSubcategory.id ||
          i.labelEn.toLowerCase() === selectedSubcategory.name.toLowerCase() ||
          i.labelBg.toLowerCase() === selectedSubcategory.nameBg.toLowerCase()
      ) || null
    );
  }, [items, selectedSubcategory]);

  useEffect(() => {
    if (!isOpen) return;
    setPickerMode(initialItemId ? 'existing' : 'taxonomy');
    setGroup(initialGroup);
    setDate(getDefaultDateForMonth(monthKey));
    setAmountStr('');
    setNote('');
    setTaxonomySearch('');

    if (initialItemId) {
      const target = items.find((i) => i.id === initialItemId);
      if (target) {
        const cat = resolveItemMainCategory(target);
        setSelectedCategoryId(cat.id);
        setSelectedSubcategoryId(target.subcategoryId || '');
      } else {
        setSelectedCategoryId('');
        setSelectedSubcategoryId('');
      }
    } else {
      setSelectedCategoryId('');
      setSelectedSubcategoryId('');
    }
  }, [isOpen, initialGroup, initialItemId, monthKey, items]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialItemId && filteredItems.some((i) => i.id === initialItemId)) {
      setLineItemId(initialItemId);
    } else if (filteredItems.length > 0 && !filteredItems.some((i) => i.id === lineItemId)) {
      setLineItemId(filteredItems[0].id);
    } else if (filteredItems.length === 0) {
      setLineItemId('');
    }
  }, [isOpen, filteredItems, initialItemId, lineItemId]);

  if (!isOpen) return null;

  function applySubcategory(cat: MainCategory, sub: CategorySubitem) {
    setPickerMode('taxonomy');
    setSelectedCategoryId(cat.id);
    setSelectedSubcategoryId(sub.id);
    setGroup(mapCategoryGroupToLedgerGroup(cat.group));
    setTaxonomySearch('');
    requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });
  }

  function handleMainCategoryChange(nextCatId: string) {
    setSelectedCategoryId(nextCatId);
    if (!nextCatId) {
      setSelectedSubcategoryId('');
      return;
    }
    const cat = MAIN_CATEGORIES.find((c) => c.id === nextCatId);
    if (cat) {
      setGroup(mapCategoryGroupToLedgerGroup(cat.group));
      if (cat.subcategories.length === 1) {
        setSelectedSubcategoryId(cat.subcategories[0].id);
      } else {
        setSelectedSubcategoryId('');
      }
    } else {
      setSelectedSubcategoryId('');
    }
  }

  function handleSubcategoryChange(nextSubId: string) {
    setSelectedSubcategoryId(nextSubId);
    if (nextSubId) {
      requestAnimationFrame(() => {
        amountInputRef.current?.focus();
      });
    }
  }

  const parsedAmount = parseNumberInput(amountStr);
  const canSubmit =
    parsedAmount > 0 &&
    !saving &&
    (pickerMode === 'existing'
      ? Boolean(selectedExistingItem)
      : Boolean(selectedCategory && selectedSubcategory));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (pickerMode === 'existing' && selectedExistingItem) {
        const resolvedCat = selectedExistingTaxonomy?.category;
        const resolvedSub = selectedExistingTaxonomy?.subcategory;
        await onSave({
          lineItemId: selectedExistingItem.id,
          group,
          amount: parsedAmount,
          note,
          date,
          categoryId: resolvedCat?.id,
          subcategoryId: resolvedSub?.id || selectedExistingItem.subcategoryId,
          subcategoryNameEn: resolvedSub?.name || selectedExistingItem.labelEn,
          subcategoryNameBg: resolvedSub?.nameBg || selectedExistingItem.labelBg,
        });
      } else if (selectedCategory && selectedSubcategory) {
        if (matchedExistingFromTaxonomy) {
          await onSave({
            lineItemId: matchedExistingFromTaxonomy.id,
            group,
            amount: parsedAmount,
            note,
            date,
            categoryId: selectedCategory.id,
            subcategoryId: selectedSubcategory.id,
            subcategoryNameEn: selectedSubcategory.name,
            subcategoryNameBg: selectedSubcategory.nameBg,
          });
        } else {
          await onSave({
            group,
            amount: parsedAmount,
            note,
            date,
            categoryId: selectedCategory.id,
            subcategoryId: selectedSubcategory.id,
            subcategoryNameEn: selectedSubcategory.name,
            subcategoryNameBg: selectedSubcategory.nameBg,
            newItem: {
              labelEn: selectedSubcategory.name,
              labelBg: selectedSubcategory.nameBg,
              categoryId: selectedCategory.id,
              subcategoryId: selectedSubcategory.id,
            },
          });
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-[#2C2C2C] border border-[#DEDAD6] dark:border-[#3D3D3D] rounded-t-2xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
          <div>
            <h3 className="font-display text-sm font-bold">{t.quickEntryTitle}</h3>
            <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996]">
              {t.quickEntrySubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[34px] min-w-[34px] rounded-lg flex items-center justify-center text-[#5E5C64] hover:bg-[#EAE6E1] dark:hover:bg-[#383838] cursor-pointer"
            aria-label={t.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick EN/BG Taxonomy Search */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 text-[#77767B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={taxonomySearch}
                onChange={(e) => setTaxonomySearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchMatches.length > 0) {
                    e.preventDefault();
                    applySubcategory(searchMatches[0].category, searchMatches[0].subcategory);
                  }
                }}
                placeholder={t.searchCategoriesPlaceholder}
                className="w-full min-h-[42px] pl-9 pr-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-[#F7F6F5] dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>

            {searchMatches.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] divide-y divide-[#ECE9E6] dark:divide-[#2F2F2F]">
                {searchMatches.map(({ category, subcategory }) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => applySubcategory(category, subcategory)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#F5F3F1] dark:hover:bg-[#2C2C2C] flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium truncate">
                        {getSubcategoryName(subcategory, lang)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#5E5C64] dark:text-[#9A9996] shrink-0">
                      {getMainCategoryName(category, lang)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode Toggle: All Categories (Cascading) vs Month Lines */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F5F3F1] dark:bg-[#1B1B1B]">
            <button
              type="button"
              onClick={() => setPickerMode('taxonomy')}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                pickerMode === 'taxonomy'
                  ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                  : 'text-[#5E5C64] dark:text-[#9A9996]'
              }`}
            >
              {t.quickEntryModeTaxonomy}
            </button>
            <button
              type="button"
              onClick={() => setPickerMode('existing')}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                pickerMode === 'existing'
                  ? 'bg-white dark:bg-[#383838] text-[#2B2929] dark:text-white shadow-xs'
                  : 'text-[#5E5C64] dark:text-[#9A9996]'
              }`}
            >
              {t.quickEntryModeExisting}
            </button>
          </div>

          {pickerMode === 'taxonomy' ? (
            <div className="space-y-3">
              {/* Cascading Main Category & Subcategory (mirrors AddItemModal) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5">
                    {t.mainCategoryLabel}
                  </label>
                  <div className="relative flex items-center">
                    {selectedCategory && (
                      <span
                        className="w-2.5 h-2.5 rounded-xs absolute left-3 pointer-events-none"
                        style={{ backgroundColor: selectedCategory.color }}
                      />
                    )}
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => handleMainCategoryChange(e.target.value)}
                      className={`w-full min-h-[44px] pr-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420] ${
                        selectedCategory ? 'pl-8' : 'pl-3'
                      }`}
                    >
                      <option value="">{t.mainCategoryLabel}...</option>
                      {orderedCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {getMainCategoryName(cat, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5">
                    {t.subcategoryLabel}
                  </label>
                  <select
                    value={selectedSubcategoryId}
                    disabled={!selectedCategory}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420] disabled:opacity-50"
                  >
                    <option value="">{t.selectSubcategoryPrompt}</option>
                    {(selectedCategory?.subcategories || []).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {getSubcategoryName(sub, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chosen Taxonomy Breadcrumb & Target Row Status */}
              {selectedCategory && selectedSubcategory && (
                <div className="rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-[#F7F6F5] dark:bg-[#1F1F1F] px-3.5 py-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    <span className="text-[#5E5C64] dark:text-[#9A9996] truncate">
                      {getMainCategoryName(selectedCategory, lang)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#77767B] shrink-0" />
                    <span className="text-[#2B2929] dark:text-white truncate">
                      {getSubcategoryName(selectedSubcategory, lang)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5E5C64] dark:text-[#9A9996] font-mono tabular-nums">
                    {matchedExistingFromTaxonomy
                      ? `${t.quickEntryMatchedExisting}: ${getItemLabel(matchedExistingFromTaxonomy, lang)} (${formatEUR(matchedExistingFromTaxonomy.actualAmount, lang)} / ${formatEUR(matchedExistingFromTaxonomy.budgetAmount, lang)})`
                      : `${t.quickEntryWillCreate}: ${getSubcategoryName(selectedSubcategory, lang)}`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="qe-category"
                className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC]"
              >
                {t.entryCategory}
              </label>
              <select
                id="qe-category"
                value={lineItemId}
                onChange={(e) => setLineItemId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              >
                {filteredItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getItemLabel(item, lang)}
                  </option>
                ))}
              </select>

              {selectedExistingItem && selectedExistingTaxonomy && (
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#5E5C64] dark:text-[#9A9996] px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-xs shrink-0"
                      style={{ backgroundColor: selectedExistingTaxonomy.category.color }}
                    />
                    <span className="truncate">
                      {getMainCategoryName(selectedExistingTaxonomy.category, lang)}
                      {selectedExistingTaxonomy.subcategory
                        ? ` → ${getSubcategoryName(selectedExistingTaxonomy.subcategory, lang)}`
                        : ''}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums shrink-0">
                    {formatEUR(selectedExistingItem.actualAmount, lang)} /{' '}
                    {formatEUR(selectedExistingItem.budgetAmount, lang)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section Tabs (Auto-mapped from Main Category with manual override) */}
          <div>
            <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-2">
              {t.entryType}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-[#F5F3F1] dark:bg-[#1B1B1B]">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors truncate cursor-pointer ${
                    group === g
                      ? 'bg-[#E95420] text-white'
                      : 'text-[#5E5C64] dark:text-[#9A9996] hover:text-[#2B2929] dark:hover:text-white'
                  }`}
                >
                  {getGroupTitle(g, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="qe-amount"
                className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5"
              >
                {t.entryAmount}
              </label>
              <input
                ref={amountInputRef}
                id="qe-amount"
                type="text"
                inputMode="decimal"
                autoFocus={Boolean(initialItemId)}
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>

            <div>
              <label
                htmlFor="qe-date"
                className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5"
              >
                {t.entryDate}
              </label>
              <input
                id="qe-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label
              htmlFor="qe-note"
              className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5"
            >
              {t.entryNote}
            </label>
            <input
              id="qe-note"
              type="text"
              maxLength={180}
              placeholder={t.entryNotePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] text-sm font-medium hover:bg-[#F5F3F1] dark:hover:bg-[#383838] transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer"
            >
              {saving ? t.saving : t.saveEntry}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
