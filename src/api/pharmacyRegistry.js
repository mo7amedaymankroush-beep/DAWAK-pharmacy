// سجل الصيدليات المسجّلة عبر نموذج الانضمام (يُحفظ في localStorage)
import { drugs } from "../data/drugs";

const PHARMACY_KEY = "dawak-registered-pharmacies";
const DRUG_KEY = "dawak-pharmacist-drugs";

const readJson = (key, fallback) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("تعذر حفظ البيانات في هذا المتصفح.");
  }
};

/** كل الصيدليات المسجّلة عبر نموذج الانضمام */
export function getRegisteredPharmacies() {
  const list = readJson(PHARMACY_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** أول صيدلية مسجّلة — تُستخدم لتحديد هوية لوحة تحكم الصيدلي */
export function getActiveRegisteredPharmacy() {
  return getRegisteredPharmacies()[0] || null;
}

/**
 * إضافة صيدلية جديدة بعد التحقق من الحقول الإلزامية.
 * تُعيد السجل المحفوظ مع معرف رقمي جديد.
 */
export function registerPharmacy(form) {
  const required = [
    "name",
    "ownerName",
    "license",
    "governorate",
    "area",
    "address",
  ];
  const missing = required.filter(
    (field) => !String(form?.[field] ?? "").trim(),
  );
  if (missing.length) {
    throw new Error("أكمل الحقول الإلزامية أولًا.");
  }

  const list = getRegisteredPharmacies();
  const nextId =
    list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 1000) + 1;

  const pharmacy = {
    id: nextId,
    name: String(form.name).trim(),
    ownerName: String(form.ownerName).trim(),
    license: String(form.license).trim(),
    governorate: String(form.governorate).trim(),
    city: String(form.city || form.area).trim(),
    area: String(form.area).trim(),
    address: String(form.address).trim(),
    phone: String(form.phone || "").trim(),
    whatsapp: String(form.whatsapp || "").trim(),
    openingMode: form.openingMode === "24h" ? "24h" : "custom",
    openingHours:
      form.openingMode === "24h"
        ? { open: "00:00", close: "23:59", allDay: true }
        : { open: form.openTime || "09:00", close: form.closeTime || "23:00" },
    delivery: {
      available: Boolean(form.deliveryAvailable),
      fee: form.deliveryAvailable ? Number(form.deliveryFee) || 30 : 0,
      estimatedMinutes: form.deliveryAvailable
        ? Number(form.deliveryMinutes) || 90
        : 0,
    },
    latitude: null,
    longitude: null,
    isActive: true,
    isRegistered: true,
    rating: 5,
    demo: true,
    registeredAt: Date.now(),
  };

  writeJson(PHARMACY_KEY, [pharmacy, ...list]);
  return pharmacy;
}

/** حالة التعديل على الأدوية (توافر / سعر) التي يضبطها الصيدلي */
export function getDrugOverrides() {
  const map = readJson(DRUG_KEY, {});
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}

/**
 * قائمة أدوية لوحة الصيدلي = أدوية الكتالوج مدموجة مع تعديلات الصيدلي.
 * كل عنصر: { id, name, category, price, quantity, isAvailable, isCustom }
 */
export function getPharmacistDrugs() {
  const overrides = getDrugOverrides();
  const catalog = drugs.map((drug) => {
    const override = overrides[drug.id] || {};
    const quantity = Number.isFinite(override.quantity)
      ? override.quantity
      : 12;
    return {
      id: drug.id,
      name: drug.name,
      category: drug.category,
      detail: drug.detail,
      basePrice: drug.price,
      price: Number.isFinite(override.price) ? override.price : drug.price,
      quantity,
      isAvailable:
        typeof override.isAvailable === "boolean"
          ? override.isAvailable
          : quantity > 0,
      isCustom: false,
    };
  });

  const custom = Object.entries(overrides)
    .filter(([key, value]) => key.startsWith("custom-") && value && value.name)
    .map(([key, value]) => ({
      id: key,
      name: value.name,
      category: value.category || "منتجات الصيدلية",
      detail: value.detail || "",
      basePrice: Number(value.price) || 0,
      price: Number(value.price) || 0,
      quantity: Number(value.quantity) || 0,
      isAvailable: value.isAvailable !== false && Number(value.quantity) > 0,
      isCustom: true,
    }));

  return [...custom, ...catalog];
}

/** تحديث سعر/توافر/كمية دواء موجود */
export function updatePharmacistDrug(id, patch) {
  const overrides = getDrugOverrides();
  const current = overrides[id] || {};
  writeJson(DRUG_KEY, {
    ...overrides,
    [id]: { ...current, ...patch },
  });
}

/** إضافة دواء جديد خاص بالصيدلية */
export function addPharmacistDrug({ name, category, price, quantity }) {
  if (!String(name || "").trim()) throw new Error("اكتب اسم الدواء.");
  if (!Number.isFinite(Number(price)) || Number(price) < 0)
    throw new Error("أدخل سعرًا صالحًا.");

  const overrides = getDrugOverrides();
  const id = `custom-${Date.now()}`;
  writeJson(DRUG_KEY, {
    ...overrides,
    [id]: {
      name: String(name).trim(),
      category: String(category || "منتجات الصيدلية").trim(),
      detail: "أُضيف من لوحة الصيدلي",
      price: Number(price),
      quantity: Number(quantity) || 0,
      isAvailable: Number(quantity) > 0,
    },
  });
  return id;
}
