import { useMemo, useState } from "react";
import {
  X,
  Search,
  CalendarDays,
  BellRing,
  Pill,
  Percent,
  Trash2,
  PauseCircle,
  PlayCircle,
  ShoppingCart,
  Pencil,
  Save,
  Repeat,
  ClipboardList,
  Plus,
  RotateCcw,
} from "lucide-react";
import { drugs } from "../data/drugs";
import "./MonthlyPrescriptionModal.css";

// Use phone-dependent storage key to isolate data per customer
// Key format: dawak_monthly_${phone} - will be set dynamically
let STORAGE_KEY = "dawak-monthly-rx";

// نسبة خصم الروشتة الشهرية وأيام التوصيل المتاحة
const MONTHLY_DISCOUNT = 0.05;
const DELIVERY_DAYS = [5, 10, 15, 20, 25, 30];

export function setMonthlyRxStorageKey(phone) {
  // Create isolated key per phone number
  STORAGE_KEY = `dawak-monthly-${phone || "guest"}`;
}

/** مفتاح التخزين المعتمد على رقم الهاتف */
function storageKeyFor(phone) {
  return `dawak-monthly-${phone || "guest"}`;
}

/** قراءة روشتة واحدة محفوظة (الشكل القديم) — للأوافقية فقط */
export function readMonthlyRx(phone) {
  // If no phone (user logged out), return null to reset count to 0
  if (!phone) return null;
  try {
    const key = `dawak-monthly-${phone}`;
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** قراءة سجل الروشتات الشهرية المحفوظة (قائمة) — يعمل للزائر أيضًا بمفتاح guest */
export function readMonthlyRxList(phone) {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(storageKeyFor(phone)) || "[]",
    );
    if (Array.isArray(parsed)) return parsed;
    // الشكل القديم: روشتة واحدة ككائن
    if (parsed && Array.isArray(parsed.items)) return [parsed];
    return [];
  } catch {
    return [];
  }
}

/** حفظ قائمة السجل كاملة */
function saveMonthlyRxList(list, phone) {
  try {
    localStorage.setItem(storageKeyFor(phone), JSON.stringify(list));
  } catch {
    /* التخزين غير متاح */
  }
}

/** إضافة/تحديث روشتة في السجل (بنفس اليوم والأدوية تستبدل القديمة) */
export function upsertMonthlyRx(rx, phone) {
  const list = readMonthlyRxList(phone);
  const stamp = Date.now();
  const entry = {
    ...rx,
    id: rx.id || `rx-${stamp}`,
    createdAt: rx.createdAt || stamp,
    updatedAt: stamp,
  };
  const index = list.findIndex(
    (item) => item.id === entry.id ||
      (item.deliveryDay === entry.deliveryDay &&
        JSON.stringify(item.items) === JSON.stringify(entry.items)),
  );
  if (index >= 0) list[index] = { ...list[index], ...entry };
  else list.unshift(entry);
  saveMonthlyRxList(list, phone);
  return entry;
}

/** حذف روشتة من السجل */
export function deleteMonthlyRx(id, phone) {
  saveMonthlyRxList(
    readMonthlyRxList(phone).filter((item) => item.id !== id),
    phone,
  );
}

export default function MonthlyPrescriptionModal({
  onClose,
  onNotice,
  onAddMonthlyToCart,
  onRxCountChange,
  phone = "",
}) {
  const [history, setHistory] = useState(() => readMonthlyRxList(phone));
  // التبويب النشط: السجل افتراضيًا عند وجود روشتات محفوظة، وإلا نموذج الإضافة
  const [tab, setTab] = useState(() =>
    readMonthlyRxList(phone).length ? "history" : "new",
  );
  const [items, setItems] = useState([]);
  const [deliveryDay, setDeliveryDay] = useState(15);
  const [remindBefore, setRemindBefore] = useState(true);
  const [paused, setPaused] = useState(false);
  const [manualName, setManualName] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [unsavedHint, setUnsavedHint] = useState(false);

  const suggestions = useMemo(() => {
    const term = search.trim();
    if (!term) return [];
    return drugs
      .filter((product) =>
        [product.name, product.brand, product.activeIngredient].some((field) =>
          String(field || "").includes(term),
        ),
      )
      .slice(0, 5);
  }, [search]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = Number((subtotal * MONTHLY_DISCOUNT).toFixed(2));
  const total = Number((subtotal - discount).toFixed(2));

  const hasUnsavedChanges =
    items.length > 0 || search.trim() !== "" || manualName.trim() !== "";

  // إغلاق ذكي: الضغط خارج النافذة يغلق فورًا إذا كانت فارغة تمامًا،
  // وإلا يعرض تنبيهًا لطيفًا بالاهتزاز دون إغلاق
  function handleBackdropClick() {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }

    setUnsavedHint(true);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
    window.setTimeout(() => setUnsavedHint(false), 3000);
  }

  function addDrug(product) {
    setError("");
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
    setSearch("");
  }

  function addManual() {
    const name = manualName.trim();
    if (!name) {
      setError("اكتب اسم الدواء أولًا");
      return;
    }
    setError("");
    setItems((current) => [
      ...current,
      { id: `manual-${Date.now()}`, name, price: 0, quantity: 1, manual: true },
    ]);
    setManualName("");
  }

  function changeQuantity(id, delta) {
    setItems((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  /** تحديث السجل + إبلاغ التطبيق بعدد الروشتات المحفوظة */
  function commitHistory(nextList) {
    saveMonthlyRxList(nextList, phone);
    setHistory(nextList);
    onRxCountChange?.(nextList.length);
  }

  function handleSave({ silent = false } = {}) {
    if (!items.length) {
      setError("أضف دواء واحد على الأقل للاشتراك الشهري");
      return;
    }

    upsertMonthlyRx({ items, deliveryDay, remindBefore, paused }, phone);
    const nextList = readMonthlyRxList(phone);
    commitHistory(nextList);
    setItems([]);
    setSearch("");
    setManualName("");
    if (!silent) {
      onNotice?.("تم حفظ روشتتك الشهرية بنجاح 💚");
      setTab("history");
    }
  }

  /** إعادة طلب روشتة محفوظة من السجل */
  function reorder(rx) {
    onAddMonthlyToCart?.(rx.items);
    onNotice?.(rx.items.length ? "تم إضافة أدوية الروشتة للعربة" : "الروشتة فارغة");
  }

  function handleDelete(id) {
    deleteMonthlyRx(id, phone);
    const nextList = readMonthlyRxList(phone);
    commitHistory(nextList);
    onNotice?.("تم حذف الروشتة من السجل");
  }

  return (
    <div
      className="mpx-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mpx-title"
      onClick={handleBackdropClick}
    >
      <div className={`mpx-modal${shake ? " is-shaking" : ""}`} onClick={(event) => event.stopPropagation()}>
        <header className="mpx-head">
          <span className="mpx-head-icon">
            <Repeat size={20} />
          </span>
          <div>
            <h2 id="mpx-title">الروشتة الشهرية</h2>
            <p>سجّل أدويتك مرة واحدة.. ونوصلهالك كل شهر بخصم 5%</p>
          </div>
          <button
            type="button"
            className="mpx-close"
            onClick={onClose}
            aria-label="إغلاق النافذة"
          >
            <X size={17} />
          </button>
        </header>

        {/* التبويبات: السجل / إضافة روشتة جديدة */}
        <div className="mpx-tabs" role="tablist" aria-label="الروشتة الشهرية">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "history"}
            className={`mpx-tab${tab === "history" ? " is-active" : ""}`}
            onClick={() => setTab("history")}
          >
            <ClipboardList size={15} />
            سجل روشتاتي السابقة 📋
            {history.length > 0 && <em className="mpx-tab-count">{history.length}</em>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "new"}
            className={`mpx-tab${tab === "new" ? " is-active" : ""}`}
            onClick={() => setTab("new")}
          >
            <Plus size={15} />
            إضافة روشتة جديدة
          </button>
        </div>

        {tab === "history" ? (
          /* ------- تبويب السجل ------- */
          <section className="mpx-section mpx-history">
            {history.length === 0 ? (
              <div className="mpx-empty">
                <ClipboardList size={22} />
                <p>لا توجد روشتات شهرية محفوظة بعد.</p>
                <button type="button" onClick={() => setTab("new")}>
                  <Plus size={15} />
                  إنشاء أول روشتة
                </button>
              </div>
            ) : (
              <ul className="mpx-history-list">
                {history.map((rx) => {
                  const rxSubtotal = rx.items.reduce(
                    (sum, item) => sum + (item.price || 0) * item.quantity,
                    0,
                  );
                  const rxTotal = Number(
                    (rxSubtotal * (1 - MONTHLY_DISCOUNT)).toFixed(2),
                  );
                  return (
                    <li key={rx.id} className="mpx-history-item">
                      <div className="mpx-history-info">
                        <h4>
                          <CalendarDays size={13} />
                          يوم {rx.deliveryDay} من كل شهر
                          {rx.paused ? " · موقوفة" : ""}
                        </h4>
                        <p>
                          {rx.items.length} دواء{" "}
                          {rx.items.length <= 2 &&
                            `· ${rx.items.map((item) => item.name).join("، ")}`}
                        </p>
                        <small>
                          أُنشئت {new Date(rx.createdAt).toLocaleDateString("ar-EG")} ·
                          الإجمالي بعد خصم 5%: {rxTotal.toLocaleString("ar-EG")} ج.م
                        </small>
                      </div>
                      <div className="mpx-history-actions">
                        <button
                          type="button"
                          className="mpx-history-reorder"
                          onClick={() => reorder(rx)}
                        >
                          <RotateCcw size={14} />
                          إعادة طلب الآن
                        </button>
                        <button
                          type="button"
                          className="mpx-history-delete"
                          aria-label="حذف الروشتة"
                          onClick={() => handleDelete(rx.id)}
                        >
                          <Trash2 size={14} />
                          حذف
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          /* ------- تبويب إضافة روشتة جديدة ------- */
          <>
            {/* اختيار الأدوية */}
            <section className="mpx-section">
          <h3>
            <Pill size={15} />
            أدويتك الشهرية
          </h3>

          <div className="mpx-search">
            <Search size={15} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن دواء من منتجات الموقع..."
              aria-label="بحث في الأدوية"
            />
          </div>

          {suggestions.length > 0 && (
            <div className="mpx-suggestions">
              {suggestions.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => addDrug(product)}
                >
                  <strong>{product.name}</strong>
                  <span>{product.price} ج.م</span>
                </button>
              ))}
            </div>
          )}

          <div className="mpx-manual">
            <input
              type="text"
              value={manualName}
              onChange={(event) => setManualName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addManual();
                }
              }}
              placeholder="أو اكتب اسم دواء غير متوفر يدويًا..."
              aria-label="اسم دواء يدوي"
              maxLength={80}
            />
            <button type="button" onClick={addManual}>
              إضافة
            </button>
          </div>

          {items.length > 0 && (
            <ul className="mpx-items">
              {items.map((item) => (
                <li key={item.id}>
                  <span className="mpx-item-name">
                    {item.name}
                    {item.manual ? " (يدوي)" : ""}
                  </span>
                  <span className="mpx-item-price">
                    {item.price ? `${item.price} ج.م` : "سعر عند المراجعة"}
                  </span>
                  <div className="mpx-qty">
                    <button
                      type="button"
                      aria-label="تقليل"
                      onClick={() => changeQuantity(item.id, -1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="زيادة"
                      onClick={() => changeQuantity(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="mpx-remove"
                    aria-label={`حذف ${item.name}`}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* الجدولة */}
        <section className="mpx-section">
          <h3>
            <CalendarDays size={15} />
            موعد التوصيل الشهري
          </h3>

          <div className="mpx-days">
            {DELIVERY_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`mpx-day${deliveryDay === day ? " is-active" : ""}`}
                onClick={() => setDeliveryDay(day)}
              >
                يوم {day}
              </button>
            ))}
          </div>

          <label className="mpx-remind">
            <input
              type="checkbox"
              checked={remindBefore}
              onChange={(event) => setRemindBefore(event.target.checked)}
            />
            <span className="mpx-remind-mark">
              <BellRing size={12} />
            </span>
            تذكيري قبل الموعد بيومين
          </label>
        </section>

        {/* الملخص والخصم */}
        <section className="mpx-summary">
          <div>
            <span>إجمالي الأدوية</span>
            <strong>
              {total ? `${subtotal.toLocaleString("ar-EG")} ج.م` : "—"}
            </strong>
          </div>
          <div className="mpx-summary-discount">
            <span>
              <Percent size={13} /> خصم الروشتة الشهرية (5%)
            </span>
            <strong>- {discount.toLocaleString("ar-EG")} ج.م</strong>
          </div>
          <div className="mpx-summary-total">
            <span>الإجمالي الشهري</span>
            <strong>
              {total ? `${total.toLocaleString("ar-EG")} ج.م` : "—"}
            </strong>
          </div>
        </section>

        {error && (
          <p className="mpx-error" role="alert">
            {error}
          </p>
        )}

        {unsavedHint && (
          <p className="mpx-unsaved" role="status">
            لديك تعديلات غير محفوظة — اضغط على زر ✕ للإغلاق
          </p>
        )}

        <footer className="mpx-actions">
          <button
            type="button"
            className="mpx-save"
            onClick={() => handleSave()}
          >
            <Save size={15} />
            حفظ الروشتة
          </button>

          <button type="button" className="mpx-order" onClick={() => handleSave({ silent: true })}>
            <ShoppingCart size={15} />
            اطلب روشتتي الشهرية الآن (بخصم 5%)
          </button>
        </footer>
          </>
        )}
      </div>
    </div>
  );
}
