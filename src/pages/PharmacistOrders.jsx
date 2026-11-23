import { useEffect, useState, useCallback } from "react";
import { Store, PackageCheck, CheckCircle2, Clock, Phone, MapPin } from "lucide-react";
import { getOrders, updateOrderStatus } from "../api/ordersApi";
import { getActiveRegisteredPharmacy } from "../api/pharmacyRegistry";
import money from "../utils/money";

export function PharmacistOrders() {
  const [adminToken, setAdminToken] = useState("demo-admin-token");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activePharmacy = getActiveRegisteredPharmacy();

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getOrders(adminToken);
      setOrders(res.orders || []);
      setError("");
    } catch {
      setError("تعذر تحميل طلبات الصيدلية.");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadOrders();
    const interval = window.setInterval(loadOrders, 5000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      await updateOrderStatus(orderId, nextStatus, adminToken);
      loadOrders();
    } catch (err) {
      alert(err.message || "تعذر تحديث حالة الطلب.");
    }
  };

  return (
    <div className="pharmacist-orders-page" dir="rtl" style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Store size={32} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>لوحة تحكم الصيدلي</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              الصيدلية النشطة: <strong>{activePharmacy?.name || "صيدلية دواك المركزية (افتراضية)"}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={loadOrders}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🔄 تحديث الطلبات
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>جاري تحميل الطلبات...</div>
      ) : error ? (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px' }}>{error}</div>
      ) : orders.length === 0 ? (
        <div style={{ background: 'var(--surface)', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          لا توجد طلبات جديدة حالياً في هذه الصيدلية.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ background: 'var(--surface)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>طلب رقم #{order.id}</span>
                  <span style={{ margin: '0 10px', fontSize: '13px', padding: '3px 8px', borderRadius: '6px', background: 'var(--background)', border: '1px solid var(--border)' }}>
                    المصدر: {order.orderSource || "سلة الشراء"}
                  </span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>{money(order.total)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '16px', fontSize: '14px' }}>
                <div>
                  <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)' }}>اسم العميل:</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{order.customer?.name || "عميل دواك"}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)' }}>رقم الهاتف:</p>
                  <p style={{ margin: 0, fontWeight: 'bold', direction: 'ltr', textAlign: 'right' }}>{order.customer?.phone || "غير مسجل"}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)' }}>عنوان التوصيل:</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{order.deliveryAddress || order.customer?.address || "غير مسجل"}</p>
                </div>
              </div>

              <div style={{ background: 'var(--background)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>المنتجات المطلوبة:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {order.items?.map((item, idx) => (
                    <span key={idx} style={{ background: 'var(--surface)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border)' }}>
                      {item.name} × {item.quantity} ({money(item.lineTotal || item.unitPrice * item.quantity)})
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>حالة الطلب الحالية:</span>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--accent)', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                    {order.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleStatusChange(order.id, "pharmacy_accepted")}
                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    قبول الطلب ✅
                  </button>
                  <button
                    onClick={() => handleStatusChange(order.id, "preparing")}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    جاري التجهيز 📦
                  </button>
                  <button
                    onClick={() => handleStatusChange(order.id, "out_for_delivery")}
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    خرج للتوصيل 🛵
                  </button>
                  <button
                    onClick={() => handleStatusChange(order.id, "delivered")}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    تم التوصيل ✔
                  </button>
                  <button
                    onClick={() => handleStatusChange(order.id, "cancelled")}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    إلغاء ❌
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PharmacistOrders;
