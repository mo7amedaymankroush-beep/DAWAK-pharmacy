// تسميات الحالات مشتركة بين صفحة الحجوزات وصفحات الطلبات
export const ORDER_STATUS_LABELS = {
  pending: "تم استلام الطلب",
  pharmacy_accepted: "تم تأكيد الطلب",
  preparing: "قيد التجهيز",
  ready_for_pickup: "جاهز لخروج المندوب",
  picked_up: "خرج الطلب مع المندوب",
  out_for_delivery: "الطلب في الطريق",
  delivered: "تم التوصيل",
  unavailable: "تعذر توفير أحد المنتجات",
  rejected: "تعذر توفير أحد المنتجات",
  cancelled: "تم إلغاء الطلب",
};

export const ORDER_EXCEPTION_STATUSES = ["cancelled", "unavailable", "rejected"];

export const ORDER_ACTIVE_STATUSES = [
  "pending",
  "pharmacy_accepted",
  "preparing",
  "ready_for_pickup",
  "picked_up",
  "out_for_delivery",
];

export const RESERVATION_STATUS_LABELS = {
  pending: "معلّق",
  confirmed: "مؤكد",
  collected: "تم الاستلام",
  cancelled: "ملغي",
  expired: "منتهي",
};

// لون الشارة: كهرماني للانتظار، أخضر للمكتمل، أزرق للحركة، رمادي للمغلق
export function orderStatusTone(status) {
  if (ORDER_EXCEPTION_STATUSES.includes(status)) return "red";
  if (status === "delivered") return "green";
  if (ORDER_ACTIVE_STATUSES.includes(status)) return "blue";
  return "muted";
}

export function reservationStatusTone(status) {
  if (status === "pending") return "amber";
  if (status === "confirmed" || status === "collected") return "green";
  if (status === "cancelled") return "red";
  return "muted";
}
