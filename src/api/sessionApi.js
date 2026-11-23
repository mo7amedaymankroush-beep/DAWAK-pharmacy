// جلسة العميل المرتبطة برقم الموبايل المصري — تُحفظ في localStorage وتبقى بعد تحديث الصفحة
const SESSION_STORAGE_KEY = "dawak-session";
const SESSION_EVENT = "dawak-session-change";
const EGYPTIAN_MOBILE_PATTERN = /^01[0125]\d{8}$/;

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toLatinDigits(value) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));
}

// يقبل 01012345678 و +201012345678 و 00201012345678
export function normalizePhone(value) {
  let digits = toLatinDigits(value).replace(/\D/g, "");

  if (digits.startsWith("0020")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("20") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith("1")) {
    digits = `0${digits}`;
  }

  return digits;
}

export function validateEgyptianPhone(value) {
  const phone = normalizePhone(value);

  if (!phone) {
    return { valid: false, phone, error: "اكتب رقم الموبايل الأول." };
  }

  if (!EGYPTIAN_MOBILE_PATTERN.test(phone)) {
    return {
      valid: false,
      phone,
      error: "رقم الموبايل المصري 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.",
    };
  }

  return { valid: true, phone, error: "" };
}

// صياغة للعرض: 0101 234 5678
export function formatPhone(phone) {
  const digits = normalizePhone(phone);
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function readSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
    const check = validateEgyptianPhone(stored?.phone);
    if (!check.valid) return null;

    return {
      phone: check.phone,
      loggedInAt: Number(stored?.loggedInAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

function announce(session) {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
}

export function saveSession(phone) {
  const check = validateEgyptianPhone(phone);
  if (!check.valid) throw new Error(check.error);

  const session = { phone: check.phone, loggedInAt: Date.now() };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    throw new Error("تعذر حفظ الجلسة في هذا المتصفح.");
  }

  announce(session);
  return session;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // تجاهل حال عدم توفر التخزين المحلي
  }

  announce(null);
}

export function getSessionPhone() {
  return readSession()?.phone || "";
}

// يستمع لتغيّر الجلسة داخل التبويب نفسه وفي التبويبات الأخرى
export function subscribeSession(listener) {
  const handleCustom = (event) => listener(event.detail ?? readSession());
  const handleStorage = (event) => {
    if (event.key === SESSION_STORAGE_KEY) listener(readSession());
  };

  window.addEventListener(SESSION_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SESSION_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}
