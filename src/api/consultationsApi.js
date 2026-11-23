// استشارات الشات بوت المحفوظة محليًا — تظهر فورًا في لوحة الصيدلي
const CONSULTATION_STORAGE_KEY = "pharmacy_consultations";
const CONSULTATION_EVENT = "dawak-consultations-change";

export const consultationStatuses = {
  new: "استشارة جديدة",
  seen: "تم الاطلاع",
  answered: "تم الرد",
};

export function readConsultations() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(CONSULTATION_STORAGE_KEY) || "[]",
    );
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeConsultations(list) {
  try {
    localStorage.setItem(CONSULTATION_STORAGE_KEY, JSON.stringify(list));
  } catch {
    throw new Error("تعذر حفظ الاستشارة في هذا المتصفح.");
  }
  window.dispatchEvent(new CustomEvent(CONSULTATION_EVENT, { detail: list }));
}

/**
 * حفظ استشارة جديدة قادمة من الشات بوت.
 * @param {{ symptomGroupId, symptomLabel, symptoms, audience, history, phone }} consultation
 */
export function saveConsultation(consultation) {
  const list = readConsultations();
  const id =
    list.reduce((maxId, entry) => Math.max(maxId, Number(entry.id) || 0), 0) +
    1;

  const record = {
    id,
    source: "chatbot",
    status: "new",
    createdAt: Date.now(),
    symptomGroupId: consultation.symptomGroupId || "other",
    symptomLabel: consultation.symptomLabel || "شكوى أخرى",
    symptoms: (consultation.symptoms || "").trim(),
    audience: consultation.audience || "adult",
    history: (consultation.history || "").trim(),
    phone: consultation.phone || "",
    customerName: consultation.customerName || "",
  };

  writeConsultations([record, ...list]);
  return record;
}

export function updateConsultationStatus(id, status) {
  const list = readConsultations().map((entry) =>
    entry.id === id ? { ...entry, status } : entry,
  );
  writeConsultations(list);
  return list;
}

export function removeConsultation(id) {
  const list = readConsultations().filter((entry) => entry.id !== id);
  writeConsultations(list);
  return list;
}

// إشعار الواجهة بالتغيير داخل التبويب نفسه وفي التبويبات الأخرى
export function subscribeConsultations(listener) {
  const handleCustom = (event) => listener(event.detail ?? readConsultations());
  const handleStorage = (event) => {
    if (event.key === CONSULTATION_STORAGE_KEY) listener(readConsultations());
  };

  window.addEventListener(CONSULTATION_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CONSULTATION_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

/** يحول الاستشارة إلى نص مرتب يُقرأ في واتساب أو في لوحة الصيدلي. */
export function formatConsultationMessage(consultation, audienceLabel) {
  return [
    "🏥 استشارة جديدة من تطبيق دواك",
    `🔹 نوع الشكوى: ${consultation.symptomLabel}`,
    `🔸 الأعراض ومدة الاستمرار: ${consultation.symptoms || "غير محدد"}`,
    `👤 الفئة: ${audienceLabel || consultation.audience}`,
    `⚠️ حساسية/أمراض مزمنة: ${consultation.history || "لا يوجد"}`,
    consultation.phone ? `📞 رقم التواصل: ${consultation.phone}` : "",
    `🕒 ${new Date(consultation.createdAt).toLocaleString("ar-EG")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
