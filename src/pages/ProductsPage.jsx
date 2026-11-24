import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  PackageCheck,
  RotateCcw,
  SlidersHorizontal,
  X,
  Search,
  Pill,
  Sparkles,
  HeartPulse,
  Stethoscope,
  Bandage,
  BadgePercent,
  TrendingUp,
  ShoppingBasket,
  Leaf,
  Droplets,
  Star,
  CheckCircle2,
  Tag,
  LayoutGrid,
} from "lucide-react";

import ProductCard from "../components/ProductCard";
import { useToast } from "../components/ToastProvider";
import { allCategories, drugs } from "../data/drugs";
import { getAvailableProductIds } from "../api/pharmaciesApi";
import money from "../utils/money";
import "./ProductsPage.css";

const PRICE_STEP = 5;

const SIZE_BUCKETS = [
  { id: "small", label: "حتى 50", min: 0, max: 50 },
  { id: "medium", label: "51 – 200", min: 51, max: 200 },
  { id: "large", label: "201 – 500", min: 201, max: 500 },
  { id: "xlarge", label: "أكثر من 500", min: 501, max: Infinity },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "الأكثر صلة" },
  { value: "price-asc", label: "السعر من الأقل للأعلى" },
  { value: "price-desc", label: "السعر من الأعلى للأقل" },
  { value: "available", label: "المتاح فقط" },
];

const categoryIcons = {
  "الأدوية": Pill,
  "عناية بالبشرة": Sparkles,
  "الفيتامينات": HeartPulse,
  "أجهزة طبية": Stethoscope,
  "إسعافات أولية": Bandage,
  "العروض": BadgePercent,
  "المنتجات الأكثر طلباً": TrendingUp,
  "الأساسيات اليومية": ShoppingBasket,
  "المكملات الغذائية": Leaf,
  "منتجات العناية بالشعر": Droplets,
  "منتجات البشرة الأكثر مبيعاً": Star,
};

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[ً-ْ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();

// تحويل الحروف اللاتينية الشائعة إلى مقارئها العربية للبحث الحر بين اللغتين
const ARABIC_FOLD = /[\u0621-\u064A]/g;
const foldLatin = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/kh/g, "خ")
    .replace(/th/g, "ث")
    .replace(/sh/g, "ش")
    .replace(/ph/g, "ف")
    .replace(/dh/g, "ذ")
    .replace(/gh/g, "غ")
    .replace(/ch/g, "ش")
    .replace(/[3']/g, "ع")
    .replace(/[2']/g, "ء")
    .replace(/7/g, "ح")
    .replace(/q/g, "ق")
    .replace(/[a]/g, "ا")
    .replace(/[b]/g, "ب")
    .replace(/[t]/g, "ت")
    .replace(/[j]/g, "ج")
    .replace(/[h]/g, "ه")
    .replace(/[d]/g, "د")
    .replace(/[r]/g, "ر")
    .replace(/[z]/g, "ز")
    .replace(/[s]/g, "س")
    .replace(/[y]/g, "ي")
    .replace(/[f]/g, "ف")
    .replace(/[n]/g, "ن")
    .replace(/[m]/g, "م")
    .replace(/[l]/g, "ل")
    .replace(/[w]/g, "و")
    .replace(/[i]/g, "ي")
    .replace(/[o]/g, "و")
    .replace(/[p]/g, "ب")
    .replace(/[v]/g, "ف");

// هل النص عربي؟ (لتطبيق التحويل اللاتيني فقط على الاستعلام غير العربي)
const hasArabic = (text) => new RegExp(ARABIC_FOLD).test(String(text ?? ""));

// الاستعلام: عربي => مطابقة مباشرة، لاتيني => مطابقة بالاسم العربي وباللاتيني معًا
const matchesQuery = (fields, queryNormalized) => {
  const queryIsArabic = hasArabic(queryNormalized);
  const folded = queryIsArabic ? queryNormalized : foldLatin(queryNormalized);
  return fields.some((field) => {
    const foldedField = normalize(field);
    return (
      foldedField.includes(queryNormalized) ||
      (!queryIsArabic && foldLatin(foldedField).includes(folded))
    );
  });
};

function FilterOption({ label, count, checked, onChange }) {
  const disabled = count === 0 && !checked;

  return (
    <label className={`shop-option${checked ? " is-checked" : ""}${disabled ? " is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="shop-option-mark" aria-hidden="true">
        <Check size={12} />
      </span>
      <span className="shop-option-label">{label}</span>
      <span className="shop-option-count">{count}</span>
    </label>
  );
}

export default function ProductsPage({
  initialQuery = "",
  initialCategories = [],
  autoFocusSearch = false,
  focusSearchTicket = 0,
  onQueryChange,
  onAddToCart,
  onBookProduct,
  onQuickOrder,
  onOpenProduct,
}) {
  const availableIds = useMemo(() => getAvailableProductIds(), []);
  const resultsRef = useRef(null);
  const searchInputRef = useRef(null);
  const showToast = useToast();

  // توست واضح فورًا عند الإضافة أو الحجز، مع تمرير الطلب لـ App كذلك
  const handleAdd = (product) => {
    onAddToCart?.(product);
    showToast(`تم إضافة ${product?.name || "المنتج"} للعربة`);
  };

  const handleBook = (product, alternativesList) => {
    const pending = onBookProduct?.(product, alternativesList);
    if (product && product.inStock === false) {
      showToast(`تم تسجيل طلب التنبيه عند توفر ${product.name}`);
    } else {
      showToast(`تم فتح حجز ${product?.name || "المنتج"}`);
    }
    return pending;
  };

  // استعادة التركيز لحقل البحث فور الفتح عند القدوم من بحث الهيرو
  // مع وضع المؤشر في نهاية النص المكتوب
  useEffect(() => {
    if (!autoFocusSearch) return;

    const input = searchInputRef.current;
    if (!input) return;

    const focusTimer = window.setTimeout(() => {
      input.focus({ preventScroll: true });
      const end = (input.value || "").length;
      input.setSelectionRange(end, end);
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [autoFocusSearch, focusSearchTicket]);

  const priceBounds = useMemo(() => {
    const prices = drugs.map((product) => product.price);
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
  }, []);

  const [query, setQuery] = useState(initialQuery);
  const [categories, setCategories] = useState(initialCategories);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [priceRange, setPriceRange] = useState(priceBounds);
  const [sortBy, setSortBy] = useState("relevance");
  const [quickFilter, setQuickFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function updateQuery(value) {
    setQuery(value);
    onQueryChange?.(value);
  }

  const queryNormalized = normalize(query);

  const queryMatched = useMemo(() => {
    if (!queryNormalized) return drugs;

    return drugs.filter((product) =>
      matchesQuery(
        [product.name, product.brand, product.activeIngredient, product.subCategory],
        queryNormalized,
      ),
    );
  }, [queryNormalized]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    queryMatched.forEach((product) => {
      counts.set(product.category, (counts.get(product.category) || 0) + 1);
    });
    return counts;
  }, [queryMatched]);

  const categoryScoped = useMemo(
    () => queryMatched.filter((product) => categories.length === 0 || categories.includes(product.category)),
    [queryMatched, categories],
  );

  const facets = useMemo(() => {
    const countBy = (pick) => {
      const counts = new Map();
      categoryScoped.forEach((product) => {
        const value = pick(product);
        if (!value || value === "غير منطبق") return;
        counts.set(value, (counts.get(value) || 0) + 1);
      });
      return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    };

    return {
      brand: countBy((product) => product.brand),
    };
  }, [categoryScoped]);

  const filtered = useMemo(
    () =>
      categoryScoped.filter((product) => {
        if (subCategories.length && !subCategories.includes(product.subCategory)) return false;
        if (brands.length && !brands.includes(product.brand)) return false;
        if (types.length && !types.includes(product.skinOrHairType)) return false;

        if (product.price < priceRange[0] || product.price > priceRange[1]) return false;
        if (sortBy === "available" && !availableIds.has(product.id)) return false;

        if (quickFilter === "available" && !availableIds.has(product.id)) return false;
        if (quickFilter === "offers" && product.category !== "العروض" && !product.offerTag) return false;

        return true;
      }),
    [categoryScoped, subCategories, brands, types, sizes, priceRange, sortBy, availableIds, quickFilter],
  );

  const sorted = useMemo(() => {
    if (sortBy === "price-asc") return [...filtered].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [filtered, sortBy]);

  // منتج التفاصيل يُفتح الآن كصفحة كاملة مستقلة عبر App (ProductDetailsPage)

  const toggleValue = (setter) => (value) =>
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  const appliedChips = [
    ...categories.map((value) => ({ key: `cat-${value}`, label: value, clear: () => toggleValue(setCategories)(value) })),
    ...brands.map((value) => ({ key: `brand-${value}`, label: value, clear: () => toggleValue(setBrands)(value) })),
    ...(priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]
      ? [{
        key: "price",
        label: `${money(priceRange[0])} – ${money(priceRange[1])}`,
        clear: () => setPriceRange(priceBounds),
      }]
      : []),
    ...(query ? [{ key: "query", label: `بحث: ${query}`, clear: () => updateQuery("") }] : []),
    ...(quickFilter === "available" ? [{ key: "qf-av", label: "المتوفر حالياً", clear: () => setQuickFilter("all") }] : []),
    ...(quickFilter === "offers" ? [{ key: "qf-off", label: "العروض", clear: () => setQuickFilter("all") }] : []),
  ];

  const facetCount = appliedChips.length;

  function clearFacets() {
    setSubCategories([]);
    setBrands([]);
    setTypes([]);
    setSizes([]);
    setPriceRange(priceBounds);
    setQuickFilter("all");
    setCategories([]);
  }

  const [minPrice, maxPrice] = priceRange;
  const priceSpan = priceBounds[1] - priceBounds[0] || 1;
  const minPercent = ((minPrice - priceBounds[0]) / priceSpan) * 100;
  const maxPercent = ((maxPrice - priceBounds[0]) / priceSpan) * 100;

  return (
    <main className="shop-dashboard-layout" id="products">

      {/* Sidebar (Dashboard Navigation & Filters) */}
      <aside
        className={`shop-sidebar${filtersOpen ? " is-open" : ""}`}
        aria-label="لوحة تحكم الأقسام والفلاتر"
      >
        <div className="shop-sidebar-brand">
          <div className="shop-sidebar-brand-icon"><LayoutGrid size={22} /></div>
          <div>
            <strong>لوحة المنتجات</strong>
            <span>DAWAK Pharmacy</span>
          </div>
          <button
            type="button"
            className="shop-drawer-close"
            onClick={() => setFiltersOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X size={16} />
          </button>
        </div>

        {/* فلاتر سريعة */}
        <div className="shop-quick-filters">
          <span className="shop-sidebar-subtitle">فلاتر سريعة</span>
          <div className="shop-quick-buttons">
            <button
              type="button"
              className={`shop-quick-btn${quickFilter === "all" ? " active" : ""}`}
              onClick={() => setQuickFilter("all")}
            >
              الكل
            </button>
            <button
              type="button"
              className={`shop-quick-btn${quickFilter === "available" ? " active" : ""}`}
              onClick={() => setQuickFilter("available")}
            >
              <CheckCircle2 size={14} /> المتوفر حالياً
            </button>
            <button
              type="button"
              className={`shop-quick-btn${quickFilter === "offers" ? " active" : ""}`}
              onClick={() => setQuickFilter("offers")}
            >
              <Tag size={14} /> العروض
            </button>
          </div>
        </div>

        <div className="shop-sidebar-head">
          <span className="shop-sidebar-subtitle">الأقسام والتصنيفات</span>
          {facetCount > 0 && (
            <button type="button" className="shop-clear-btn" onClick={clearFacets}>
              <RotateCcw size={13} />
              مسح
            </button>
          )}
        </div>

        {/* قائمة الأقسام مع أيقونات */}
        <div className="shop-dashboard-categories">
          {allCategories.map((name) => {
            const IconComponent = categoryIcons[name] || Pill;
            const isSelected = categories.includes(name);
            const count = categoryCounts.get(name) || 0;
            return (
              <button
                key={name}
                type="button"
                className={`shop-category-item${isSelected ? " active" : ""}`}
                onClick={() => toggleValue(setCategories)(name)}
              >
                <span className="shop-category-icon"><IconComponent size={18} /></span>
                <span className="shop-category-label">{name}</span>
                <span className="shop-category-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* قائمة الماركات الظاهرة */}
        <div className="shop-sidebar-section">
          <span className="shop-sidebar-subtitle">الماركات</span>
          <div className="shop-options shop-options--scroll shop-dashboard-list">
            {facets.brand.map(([value, count]) => (
              <FilterOption
                key={value}
                label={value}
                count={count}
                checked={brands.includes(value)}
                onChange={() => toggleValue(setBrands)(value)}
              />
            ))}
          </div>
        </div>

        {/* قائمة السعر الظاهرة */}
        <div className="shop-sidebar-section">
          <span className="shop-sidebar-subtitle">نطاق السعر</span>
          <div className="shop-price shop-dashboard-price-box">
            <div className="shop-price-values">
              <span>{money(minPrice)}</span>
              <span>{money(maxPrice)}</span>
            </div>
            <div className="shop-range">
              <span className="shop-range-track" aria-hidden="true" />
              <span
                className="shop-range-fill"
                aria-hidden="true"
                style={{ insetInlineStart: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
              />
              <input
                type="range"
                min={priceBounds[0]}
                max={priceBounds[1]}
                step={PRICE_STEP}
                value={minPrice}
                aria-label="أقل سعر"
                onChange={(event) => setPriceRange([
                  Math.min(Number(event.target.value), maxPrice - PRICE_STEP),
                  maxPrice,
                ])}
              />
              <input
                type="range"
                min={priceBounds[0]}
                max={priceBounds[1]}
                step={PRICE_STEP}
                value={maxPrice}
                aria-label="أعلى سعر"
                onChange={(event) => setPriceRange([
                  minPrice,
                  Math.max(Number(event.target.value), minPrice + PRICE_STEP),
                ])}
              />
            </div>
          </div>
        </div>

        <div className="shop-sidebar-foot">
          <button type="button" className="shop-primary-btn" onClick={() => setFiltersOpen(false)}>
            عرض النتائج ({sorted.length})
          </button>
        </div>
      </aside>

      {filtersOpen && (
        <button
          type="button"
          className="shop-drawer-scrim"
          aria-label="إغلاق القائمة"
          onClick={() => setFiltersOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="shop-main-area" ref={resultsRef}>

        {/* Header Bar */}
        <header className="shop-header-bar">
          <div className="shop-header-title-group">
            <h1>إدارة وعرض المنتجات</h1>
            <p>إجمالي المنتجات المطابقة: <strong>{sorted.length} منتج</strong></p>
          </div>

          <div className="shop-header-actions">
            <div className="shop-header-search">
              <Search size={16} />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="بحث سريع في المنتجات..."
                aria-label="بحث سريع"
              />
            </div>

            <label className="shop-sort">
              <span>ترتيب:</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="shop-filters-toggle"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} />
              الفلاتر
              {facetCount > 0 && <span className="shop-filters-count">{facetCount}</span>}
            </button>
          </div>
        </header>

        {appliedChips.length > 0 && (
          <div className="shop-chips">
            {appliedChips.map((chip) => (
              <span className="shop-chip" key={chip.key}>
                {chip.label}
                <button type="button" onClick={chip.clear} aria-label={`إزالة ${chip.label}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {/* زر واضح لإلغاء التصفية وعرض جميع المنتجات مرة أخرى */}
            <button type="button" className="shop-clear-btn shop-clear-btn--show-all" onClick={clearFacets}>
              <RotateCcw size={13} />
              عرض جميع المنتجات
            </button>
          </div>
        )}

        {/* Grid of all products without pagination */}
        {sorted.length > 0 ? (
          <div className="shop-grid">
            {sorted.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={false}
                onOpen={onOpenProduct}
                onAdd={handleAdd}
                onBook={handleBook}
                onShowAlternatives={(p, list) => handleBook(p, list)}
              />
            ))}
          </div>
        ) : (
          <div className="shop-empty">
            <PackageCheck size={34} />
            <h2>لا توجد منتجات مطابقة</h2>
            <p>جرب تغيير الفلاتر أو البحث بكلمات أخرى.</p>
            <button type="button" className="shop-secondary-btn" onClick={clearFacets}>
              مسح الفلاتر
            </button>
          </div>
        )}

      </div>

      {/* تفاصيل المنتج تُعرض الآن في صفحة كاملة مستقلة (ProductDetailsPage) — تمت إزالة النافذة المنبثقة من صفحة المنتجات */}

    </main>
  );
}
