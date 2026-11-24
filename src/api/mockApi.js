import { drugs } from "../data/drugs";
import { pharmacies } from "../data/pharmacies";
import { getPharmaciesForProduct } from "./pharmaciesApi";
import { getSessionPhone, normalizePhone } from "./sessionApi";

const delay = (ms = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// توحيد الحروف العربية لتسهيل البحث
const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();

// حالات الحجز
export const STATUS_LABELS = {
  pending: "معلّق",
  confirmed: "مؤكد",
  collected: "تم الاستلام",
  cancelled: "ملغي",
  expired: "منتهي",
};

function readReservations() {
  try {
    const stored = JSON.parse(localStorage.getItem("dawak-reservations") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

let reservations = readReservations();
let nextReservationId = reservations.reduce(
  (nextId, reservation) => Math.max(nextId, Number(reservation.id) + 1 || 1),
  1,
);

function saveReservations() {
  try {
    localStorage.setItem("dawak-reservations", JSON.stringify(reservations));
  } catch {
    // Keep the mock API usable if browser storage is unavailable.
  }
}

// البحث عن بيانات المخزون والصيدليات
async function availabilityOf(drugId, includeUnavailable = false) {
  return getPharmaciesForProduct(drugId, {}, { includeUnavailable });
}

// GET /drugs/search?q=
// البحث بالاسم أو المادة الفعالة
export async function searchDrugs(q) {
  await delay(150);

  const query = normalize(q);

  if (!query) return [];

  const seen = new Set();

  return drugs
    .filter(
      (drug) =>
        normalize(drug.name).includes(query) ||
        normalize(drug.activeIngredient).includes(query)
    )
    // المنتج نفسه قد يظهر في أكثر من قسم (مثل العروض والأكثر طلبًا)
    // فنعرض الاقتراح مرة واحدة فقط
    .filter((drug) => {
      const key = [drug.name, drug.brand, drug.strength, drug.form]
        .map(normalize)
        .join("|");

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

// GET /drugs/:id/availability
// معرفة الصيدليات المتوفر بها الدواء
export async function getAvailability(drugId) {
  await delay();

  const drug = drugs.find(
    (item) => item.id === drugId
  );

  if (!drug) {
    throw new Error("الدواء غير موجود");
  }

  const pharmaciesList = await availabilityOf(drugId);

  return {
    drug,
    available: pharmaciesList.length > 0,
    pharmacies: pharmaciesList,
  };
}

// GET /drugs/:id/alternatives
// البدائل يجب أن تتطابق في المادة الفعالة والتركيز والشكل
export async function getAlternatives(drugId) {
  await delay();

  const drug = drugs.find(
    (item) => item.id === drugId
  );

  if (!drug) {
    throw new Error("الدواء غير موجود");
  }

  // بعض الأدوية لا يسمح باقتراح بدائل تلقائية لها
  if (drug.noAutoSubstitute) {
    return {
      allowed: false,
      alternatives: [],
    };
  }

  const alternatives = await Promise.all(drugs
    .filter(
      (item) =>
        item.id !== drug.id &&
        !item.noAutoSubstitute &&
        item.activeIngredient === drug.activeIngredient &&
        item.strength === drug.strength &&
        item.form === drug.form
    )
    .map(async (item) => ({
      ...item,
      pharmacies: await availabilityOf(item.id),
    })))
    .filter(
      (item) => item.pharmacies.length > 0
    );

  return {
    allowed: true,
    alternatives,
  };
}

// POST /reservations
// إنشاء حجز أو طلب انتظار
export async function createReservation({
  drugId,
  pharmacyId,
  prescriptionImage,
}) {
  await delay();

  const drug = drugs.find(
    (item) => item.id === drugId
  );

  if (!drug) {
    throw new Error("الدواء غير موجود");
  }

  // التأكد من الروشتة عند الحاجة
  if (
    drug.requiresPrescription &&
    !prescriptionImage
  ) {
    throw new Error("ارفع صورة الروشتة قبل الحجز");
  }

  // Capture the pharmacy and inventory values used for this reservation.
  const pharmacy = pharmacyId
    ? pharmacies.find((item) => item.id === pharmacyId)
    : null;

  if (pharmacyId) {
    if (!pharmacy) {
      throw new Error("الصيدلية غير موجودة");
    }
  }

  const inventoryItem = pharmacyId
    ? (await availabilityOf(drugId, true)).find((item) => item.id === pharmacyId)
    : null;
  const inStock = Boolean(inventoryItem?.isAvailable);

  const now = Date.now();

  const reservation = {
    id: nextReservationId++,
    drugId,
    drugName: drug.name,
    // رقم الجلسة يربط الحجز بصفحة "حجوزاتي" الخاصة بالعميل
    customerPhone: getSessionPhone() || null,
    pharmacyId: pharmacyId || null,
    product: {
      name: drug.name,
      detail: drug.detail,
      category: drug.category,
      activeIngredient: drug.activeIngredient,
      strength: drug.strength,
      form: drug.form,
      description: drug.description,
    },
    pharmacy: pharmacy ? {
      name: pharmacy.name,
      address: pharmacy.address,
      governorate: pharmacy.governorate,
      city: pharmacy.city,
      area: pharmacy.area,
    } : null,
    price: inventoryItem?.price ?? drug.price,
    quantityAtReservation: inventoryItem?.quantity ?? 0,

    type: inStock
      ? "reserve"
      : "waitlist",

    status: "pending",

    createdAt: now,

    expiresAt:
      now + 24 * 60 * 60 * 1000,
  };

  reservations.push(reservation);
  saveReservations();

  return reservation;
}

// POST /reservations (حجز منتج غير متوفر من الكتالوج — يظهر في صفحة «حجوزاتي»)
export async function createProductBooking(product) {
  await delay(200);

  const drug = drugs.find(
    (item) => item.id === Number(product?.id)
  );

  if (!drug) {
    throw new Error("المنتج غير موجود.");
  }

  const customerPhone = getSessionPhone();

  if (!customerPhone) {
    throw new Error("سجّل دخولك برقم الموبايل الأول.");
  }

  const alreadyBooked = reservations.some(
    (item) =>
      item.drugId === drug.id &&
      item.customerPhone === customerPhone &&
      item.status === "pending"
  );

  if (alreadyBooked) {
    throw new Error(`${drug.name} محجوز بالفعل في حجوزاتك.`);
  }

  const now = Date.now();

  const booking = {
    id: nextReservationId++,
    drugId: drug.id,
    drugName: drug.name,
    customerPhone,
    pharmacyId: null,
    product: {
      name: drug.name,
      detail: drug.detail,
      category: drug.category,
      activeIngredient: drug.activeIngredient,
      strength: drug.strength,
      form: drug.form,
      description: drug.description,
    },
    pharmacy: null,
    price: drug.price,
    quantityAtReservation: 0,
    type: "waitlist",
    status: "pending",
    source: "catalog",
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  };

  reservations.push(booking);
  saveReservations();

  return booking;
}

// POST /reservations — حجز منتج غير متوفر من نافذة الحجز
// يعمل للمستخدم المسجّل والزائر (يُربط الحجز بالحساب عند تسجيل الدخول لاحقًا)
export async function createProductReservation({
  drugId,
  phone,
  alertMethod = "whatsapp",
}) {
  await delay();

  const drug = drugs.find((item) => item.id === Number(drugId));

  if (!drug) throw new Error("المنتج غير موجود.");

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error("اكتب رقم موبايل صحيح أولًا.");
  }

  const now = Date.now();

  const reservation = {
    id: nextReservationId++,
    drugId: drug.id,
    drugName: drug.name,
    // رقم الجلسة إن كان مسجّلًا، وإلا يبقى الحجز زائرًا ويُربط عند تسجيل الدخول
    customerPhone: getSessionPhone() || null,
    guestPhone: getSessionPhone() ? null : normalizedPhone,
    alertPhone: normalizedPhone,
    alertMethod,
    pharmacyId: null,
    product: {
      name: drug.name,
      detail: drug.detail,
      category: drug.category,
      activeIngredient: drug.activeIngredient,
      strength: drug.strength,
      form: drug.form,
      description: drug.description,
    },
    pharmacy: null,
    price: drug.price,
    quantityAtReservation: 0,
    type: "waitlist",
    status: "pending",
    source: "reserve-modal",
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  };

  reservations.push(reservation);
  saveReservations();

  // إشعار صفحات مفتوحة (مثل «حجوزاتي») لتحديث القائمة فورًا
  try {
    window.dispatchEvent(new CustomEvent("dawak:reservations-updated"));
  } catch {
    /* تجاهل */
  }

  return reservation;
}

// ربط الحجوزات التي تمت كزائر بحساب المستخدم بعد تسجيل الدخول
export function linkGuestReservations(phone) {
  const targetPhone = normalizePhone(phone);
  if (!targetPhone) return 0;

  let linkedCount = 0;

  reservations = reservations.map((reservation) => {
    const belongsToGuest =
      !reservation.customerPhone &&
      (reservation.guestPhone
        ? normalizePhone(reservation.guestPhone) === targetPhone
        : normalizePhone(reservation.alertPhone) === targetPhone);

    if (!belongsToGuest) return reservation;

    linkedCount += 1;
    return {
      ...reservation,
      customerPhone: targetPhone,
      guestPhone: null,
      updatedAt: Date.now(),
    };
  });

  if (linkedCount) {
    saveReservations();
    try {
      window.dispatchEvent(new CustomEvent("dawak:reservations-updated"));
    } catch {
      /* تجاهل */
    }
  }

  return linkedCount;
}

// GET /reservations/me
// عرض حجوزات المستخدم
export async function getMyReservations() {
  await delay();

  const now = Date.now();

  reservations = reservations.map((reservation) =>
    reservation.status === "pending" &&
    reservation.expiresAt < now
      ? {
          ...reservation,
          status: "expired",
        }
      : reservation
  );
  saveReservations();

  return [...reservations].reverse();
}

// PATCH /reservations/:id/cancel
// إلغاء الحجز
export async function cancelReservation(id) {
  await delay();

  reservations = reservations.map((reservation) =>
    reservation.id === id &&
    reservation.status === "pending"
      ? {
          ...reservation,
          status: "cancelled",
          updatedAt: Date.now(),
        }
      : reservation
  );
  saveReservations();

  return reservations.find(
    (reservation) => reservation.id === id
  );
}
// ============================================================================
// طلبات تجريبية (Demo Orders) — لوحة تحكم الصيدلي
// تُبنى من أدوية الكتالوج الفعلية حتى تتطابق البنود والأسعار مع باقي التطبيق.
// ============================================================================

const DEMO_ORDERS_KEY = "dawak-demo-orders";

const DEMO_BLUEPRINTS = [
  {
    id: "demo-1001",
    customerName: "منى عبد الرحمن",
    customerPhone: "01012345678",
    address: "القاهرة - مدينة نصر - الحي السابع - شارع مصطفى النحاس، عمارة 12",
    orderSource: "cart",
    status: "pending",
    minutesAgo: 12,
    items: [0, 1],
    prescription: null,
  },
  {
    id: "demo-1002",
    customerName: "أحمد سيد فتحي",
    customerPhone: "01198765432",
    address: "الجيزة - الدقي - ميدان المساحة - برج النيل، الدور 4",
    orderSource: "quick_order",
    status: "preparing",
    minutesAgo: 95,
    items: [3],
    prescription: {
      name: "روشتة-د.حسن-أكتوبر.jpg",
      // صورة SVG مضمّنة (data URI) تصلح للمعاينة في نافذة الروشتة
      dataUrl:
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="780">' +
            '<rect width="600" height="780" fill="#ffffff"/>' +
            '<rect x="24" y="24" width="552" height="732" fill="none" stroke="#1F3D2B" stroke-width="3"/>' +
            '<text x="300" y="96" font-family="serif" font-size="30" text-anchor="middle" fill="#1F3D2B">Dr. Hassan Clinic</text>' +
            '<text x="300" y="130" font-family="serif" font-size="16" text-anchor="middle" fill="#5b6b62">Cairo - Egypt · Rx</text>' +
            '<path d="M48 150 H552" stroke="#8B5CF6" stroke-width="2"/>' +
            '<text x="60" y="196" font-family="serif" font-size="19" fill="#111">1. Augmentin 1g - tab - 1 x 2 / 7 days</text>' +
            '<text x="60" y="236" font-family="serif" font-size="19" fill="#111">2. Panadol Extra - tab - 1 x 3 / 5 days</text>' +
            '<text x="60" y="276" font-family="serif" font-size="19" fill="#111">3. Vitamin D3 50000 IU - cap - weekly</text>' +
            '<path d="M48 320 H552" stroke="#c8d4cd" stroke-width="1"/>' +
            '<text x="60" y="360" font-family="serif" font-size="16" fill="#5b6b62">Signature: __________</text>' +
            '<text x="300" y="560" font-family="serif" font-size="13" text-anchor="middle" fill="#9aa8a1">صورة تجريبية للروشتة - DAWAK Demo</text>' +
            "</svg>",
        ),
    },
  },
  {
    id: "demo-1003",
    customerName: "سارة إبراهيم",
    customerPhone: "01234567890",
    address: "الإسكندرية - سموحة - شارع فوزي معاذ - عمارة 8",
    orderSource: "pharmacy_direct",
    status: "out_for_delivery",
    minutesAgo: 220,
    items: [2, 4],
    prescription: null,
  },
];

function buildDemoOrder(blueprint, pharmacy) {
  const createdAt = Date.now() - blueprint.minutesAgo * 60 * 1000;
  const picked = blueprint.items
    .map((index) => drugs[index])
    .filter(Boolean);

  const items = picked.map((drug) => ({
    productId: drug.id,
    name: drug.name,
    quantity: 1,
    unitPrice: drug.price,
    lineTotal: drug.price,
  }));

  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const deliveryFee = 30;

  return {
    id: blueprint.id,
    orderId: blueprint.id,
    customer: {
      name: blueprint.customerName,
      phone: blueprint.customerPhone,
      address: blueprint.address,
    },
    pharmacyId: pharmacy.id,
    pharmacy: { id: pharmacy.id, name: pharmacy.name, address: pharmacy.address },
    items,
    orderSource: blueprint.orderSource,
    prescription: blueprint.prescription,
    deliveryAddress: blueprint.address,
    deliveryFee,
    subtotal,
    discount: 0,
    total: Number((subtotal + deliveryFee).toFixed(2)),
    status: blueprint.status,
    statusHistory: [{ status: blueprint.status, at: createdAt }],
    inventoryDeducted: false,
    createdAt,
    isDemo: true,
  };
}

/**
 * يضمن وجود الطلبات التجريبية في تخزين الطلبات ويُعيدها.
 * إن كان التخزين يحتوي طلبات حقيقية يُدمجها مع التجريبية بدون تكرار.
 */
export function getDemoOrders(pharmacy = { id: 1, name: "صيدلية دواك التجريبية", address: "القاهرة - مدينة نصر" }) {
  const demos = DEMO_BLUEPRINTS.map((blueprint) => buildDemoOrder(blueprint, pharmacy));
  try {
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(demos.map((order) => order.id)));
  } catch {
    /* التخزين غير متاح — تُعرض الطلبات من الذاكرة */
  }
  return demos;
}

export { DEMO_BLUEPRINTS };
