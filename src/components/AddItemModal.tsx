import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { BudgetGroup, CategorySubitem, Language, MainCategory } from '../types/budget';
import { TRANSLATIONS, getGroupTitle } from '../i18n/translations';
import {
  MAIN_CATEGORIES,
  getMainCategoryName,
  mapCategoryGroupToLedgerGroup,
} from '../data/categories';
import { parseNumberInput } from '../lib/calculations';

interface AddItemModalProps {
  isOpen: boolean;
  initialGroup: BudgetGroup;
  lang: Language;
  onAdd: (payload: {
    group: BudgetGroup;
    labelEn: string;
    labelBg: string;
    dueDate: string;
    budgetAmount: number;
    isRecurring: boolean;
    categoryId?: string;
    subcategoryId?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function AddItemModal({
  isOpen,
  initialGroup,
  lang,
  onAdd,
  onClose,
}: AddItemModalProps) {
  const t = TRANSLATIONS[lang];
  const [group, setGroup] = useState<BudgetGroup>(initialGroup);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [taxonomySearch, setTaxonomySearch] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [labelBg, setLabelBg] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGroup(initialGroup);
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setTaxonomySearch('');
    setLabelEn('');
    setLabelBg('');
    setDueDate('');
    setBudgetStr('');
    setIsRecurring(true);
  }, [isOpen, initialGroup]);

  const selectedCategory = useMemo(
    () => MAIN_CATEGORIES.find((c) => c.id === selectedCategoryId) || null,
    [selectedCategoryId]
  );

  // Order categories so matching section categories appear first
  const orderedCategories = useMemo(() => {
    return [...MAIN_CATEGORIES].sort((a, b) => {
      const aMatch = mapCategoryGroupToLedgerGroup(a.group) === group ? 0 : 1;
      const bMatch = mapCategoryGroupToLedgerGroup(b.group) === group ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [group]);

  // Search results across all 11 categories & 75 subcategories in EN + BG
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

  if (!isOpen) return null;

  const canSave = (labelEn.trim().length > 0 || labelBg.trim().length > 0) && !saving;

  function applySubcategory(cat: MainCategory, sub: CategorySubitem) {
    setSelectedCategoryId(cat.id);
    setSelectedSubcategoryId(sub.id);
    setGroup(mapCategoryGroupToLedgerGroup(cat.group));
    setLabelEn(sub.name);
    setLabelBg(sub.nameBg);
    setTaxonomySearch('');
  }

  function handleMainCategoryChange(nextCatId: string) {
    setSelectedCategoryId(nextCatId);
    setSelectedSubcategoryId('');
    if (!nextCatId) return;
    const cat = MAIN_CATEGORIES.find((c) => c.id === nextCatId);
    if (cat) {
      setGroup(mapCategoryGroupToLedgerGroup(cat.group));
    }
  }

  function handleSubcategoryChange(nextSubId: string) {
    setSelectedSubcategoryId(nextSubId);
    if (!selectedCategory || !nextSubId) return;
    const sub = selectedCategory.subcategories.find((s) => s.id === nextSubId);
    if (sub) {
      setLabelEn(sub.name);
      setLabelBg(sub.nameBg);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onAdd({
        group,
        labelEn: labelEn.trim() || labelBg.trim(),
        labelBg: labelBg.trim() || labelEn.trim(),
        dueDate: group === 'bills' ? dueDate.trim() : '',
        budgetAmount: parseNumberInput(budgetStr),
        isRecurring,
        categoryId: selectedCategoryId || undefined,
        subcategoryId: selectedSubcategoryId || undefined,
      });
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
        <div className="bg-[#F7F6F5] dark:bg-[#242424] border-b border-[#DEDAD6] dark:border-[#3D3D3D] px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-display text-sm font-bold">{t.addItemTitle}</h3>
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
          {/* Quick Taxonomy Search */}
          <div>
            <div className="relative">
              <Search className="w-4 h-4 text-[#77767B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={taxonomySearch}
                onChange={(e) => setTaxonomySearch(e.target.value)}
                placeholder={t.searchCategoriesPlaceholder}
                className="w-full min-h-[42px] pl-9 pr-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-[#F7F6F5] dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>

            {searchMatches.length > 0 && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] divide-y divide-[#ECE9E6] dark:divide-[#2F2F2F]">
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
                        {lang === 'bg' ? subcategory.nameBg : subcategory.name}
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

          {/* Cascading Main Category & Subcategory */}
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
                  <option value="">{t.customCategoryOption}</option>
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
                    {lang === 'bg' ? sub.nameBg : sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section Override */}
          <div>
            <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5">
              {t.entryType}
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as BudgetGroup)}
              className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
            >
              {(['income', 'bills', 'variable', 'savings'] as BudgetGroup[]).map((g) => (
                <option key={g} value={g}>
                  {getGroupTitle(g, lang)}
                </option>
              ))}
            </select>
          </div>

          {/* Editable EN & BG Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5">
                {t.itemLabelEn}
              </label>
              <input
                type="text"
                maxLength={80}
                value={labelEn}
                onChange={(e) => setLabelEn(e.target.value)}
                placeholder="e.g. Fuel"
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5">
                {t.itemLabelBg}
              </label>
              <input
                type="text"
                maxLength={80}
                value={labelBg}
                onChange={(e) => setLabelBg(e.target.value)}
                placeholder="напр. Гориво"
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5">
                {t.itemBudget}
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={budgetStr}
                onChange={(e) => setBudgetStr(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
              />
            </div>

            {group === 'bills' && (
              <div>
                <label className="block text-xs font-medium text-[#5E5C64] dark:text-[#C0BFBC] mb-1.5">
                  {t.itemDueDate}
                </label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="e.g. 15th"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] bg-white dark:bg-[#1B1B1B] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#E95420]"
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 py-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded accent-[#E95420]"
            />
            <span className="text-xs text-[#2B2929] dark:text-[#DEDDDA]">{t.itemRecurring}</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-[#DEDAD6] dark:border-[#3D3D3D] text-sm font-medium hover:bg-[#F5F3F1] dark:hover:bg-[#383838] cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[#E95420] hover:bg-[#D34615] text-white text-sm font-medium disabled:opacity-40 cursor-pointer"
            >
              {saving ? t.saving : t.saveItem}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
