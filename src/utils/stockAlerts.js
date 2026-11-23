// تنبيهات توفر الأدوية — تُحفظ في localStorage تحت dawak-stock-alerts
const STORAGE_KEY = "dawak-stock-alerts";

export function readStockAlerts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isAlertActive(drugId) {
  return readStockAlerts().some((alert) => alert.drugId === drugId);
}

// method: "whatsapp" | "sms"
export function saveStockAlert({ drug, phone, method = "whatsapp" }) {
  const alerts = readStockAlerts().filter((alert) => alert.drugId !== drug.id);
  alerts.push({
    drugId: drug.id,
    drugName: drug.name,
    phone,
    method,
    createdAt: Date.now(),
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    /* التخزين غير متاح */
  }
  return alerts;
}

export function removeStockAlert(drugId) {
  const alerts = readStockAlerts().filter((alert) => alert.drugId !== drugId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    /* التخزين غير متاح */
  }
  return alerts;
}
