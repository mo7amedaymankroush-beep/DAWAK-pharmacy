import { getCustomerOrders } from "./ordersApi";
import { getMyReservations } from "./mockApi";
import { normalizePhone } from "./sessionApi";

// سجلات العميل مرتبطة برقم هاتفه: طلبات السلة/الطلب السريع + حجوزات الأدوية
export async function getMyBookings(phone) {
  const targetPhone = normalizePhone(phone);

  if (!targetPhone) {
    return { orders: [], reservations: [] };
  }

  const [orders, reservations] = await Promise.all([
    getCustomerOrders().catch(() => []),
    getMyReservations().catch(() => []),
  ]);

  return {
    orders: orders.filter((order) => normalizePhone(order.customer?.phone) === targetPhone),
    reservations: reservations.filter((reservation) => normalizePhone(reservation.customerPhone) === targetPhone),
  };
}
