import { useEffect, useState, useCallback } from "react";
import { Pill, Store, CalendarClock, MapPin, XCircle, CheckCircle } from "lucide-react";
import { getMyBookings } from "../api/bookingsApi";
import { cancelReservation } from "../api/mockApi";
import { getSessionPhone, subscribeSession } from "../api/sessionApi";
import money from "../utils/money";

export function MyReservations() {
  const [phone, setPhone] = useState(() => getSessionPhone());
  const [data, setData] = useState({ orders: [], reservations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentPhone = getSessionPhone() || phone;
      const res = await getMyBookings(currentPhone);
      setData(res);
      setError("");
    } catch {
      setError("تعذر تحميل الحجوزات والطلبات.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    // تحديث فوري عند إنشاء/ربط حجز جديد من نافذة الحجز في نفس التاب
    const handleReservationsUpdated = () => loadData();
    // تحديث عند تسجيل الدخول/الخروج (تغيّر الجلسة)
    const unsubscribeSession = subscribeSession(() => loadData());
    window.addEventListener("storage", handleStorage);
    window.addEventListener("dawak:reservations-updated", handleReservationsUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("dawak:reservations-updated", handleReservationsUpdated);
      unsubscribeSession();
    };
  }, [loadData]);

  const handleCancel = async (id) => {
    try {
      await cancelReservation(id);
      loadData();
    } catch {
      alert("تعذر إلغاء الحجز.");
    }
  };

  return (
    <div className="my-reservations-page" dir="rtl" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
        <CalendarClock size={32} color="var(--accent)" />
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>حجوزاتي وطلباتي</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>متابعة حجوزات الأدوية وطلبات التوصيل المسجلة على رقمك ({phone || "الزائر"})</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>جاري تحميل السجلات...</div>
      ) : error ? (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* الحجوزات */}
          <section>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pill size={20} /> حجز الأدوية ({data.reservations.length})
            </h2>
            {data.reservations.length === 0 ? (
              <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                لا توجد حجوزات أدوية نشطة حالياً.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {data.reservations.map((item) => (
                  <div key={item.id} style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>{item.product?.name || item.drugName}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>السعر: {money(item.price)} | الحالة: <span style={{ fontWeight: 'bold', color: item.status === 'pending' ? '#d97706' : item.status === 'cancelled' ? '#dc2626' : '#10b981' }}>{item.status === 'pending' ? 'قيد الانتظار' : item.status === 'cancelled' ? 'ملغي' : item.status === 'confirmed' ? 'مؤكد' : item.status === 'expired' ? 'منتهي' : item.status}</span></p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>تاريخ الحجز: {new Date(item.createdAt).toLocaleString('ar-EG')}</p>
                    </div>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <XCircle size={16} /> إلغاء الحجز
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* الطلبات */}
          <section>
            <h2 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={20} /> طلبات التوصيل والسلة ({data.orders.length})
            </h2>
            {data.orders.length === 0 ? (
              <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                لا توجد طلبات توصيل مسجلة.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {data.orders.map((order) => (
                  <div key={order.id} style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>طلب رقم #{order.id}</strong>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{money(order.total)}</span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '14px' }}>الصيدلية: {order.pharmacy?.name}</p>
                    <p style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-secondary)' }}>العنوان: {order.deliveryAddress}</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {order.items?.map((i, idx) => (
                        <span key={idx} style={{ background: 'var(--background)', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border)' }}>
                          {i.name} ({i.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default MyReservations;
