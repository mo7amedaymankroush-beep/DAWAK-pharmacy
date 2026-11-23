import { useEffect, useState, useCallback } from "react";
import { Store, ArrowRight, ShieldCheck, Phone, CheckCircle2 } from "lucide-react";
import { registerPharmacy } from "../api/pharmacyRegistry";

export default function PharmacyRegister({ onGoPharmacist, onGoHome }) {
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    license: "",
    governorate: "القاهرة",
    city: "القاهرة",
    area: "مدينة نصر",
    address: "",
    phone: "",
    whatsapp: "",
    openingMode: "24h",
    openTime: "09:00",
    closeTime: "23:00",
    deliveryAvailable: true,
    deliveryFee: 30,
    deliveryMinutes: 90,
  });
  const [error, setError] = useState("");
  const [successPharmacy, setSuccessPharmacy] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = registerPharmacy(form);
      setSuccessPharmacy(res);
    } catch (err) {
      setError(err.message || "حدث خطأ أثناء التسجيل.");
    }
  };

  if (successPharmacy) {
    return (
      <div className="pharmacies-page" dir="rtl" style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'var(--surface)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 20px' }} />
          <h2>تم تسجيل صيدليتك بنجاح!</h2>
          <p style={{ margin: '15px 0', color: 'var(--text-secondary)' }}>تمت إضافة صيدليتك ({successPharmacy.name}) إلى شبكة صيدليات دواك بنجاح وأصبحت جاهزة لاستقبال الطلبات.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '25px' }}>
            <button
              onClick={onGoPharmacist}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              الانتقال لوحة تحكم الصيدلي 🩺
            </button>
            <button
              onClick={onGoHome}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}
            >
              الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pharmacies-page" dir="rtl" style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto' }}>
      <button onClick={onGoHome} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '20px' }}>
        <ArrowRight size={16} /> العودة للرئيسية
      </button>
      <div style={{ background: 'var(--surface)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <Store color="var(--accent)" /> انضم إلى شبكة صيدليات دواك
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>سجّل صيدليتك لتستقبل طلبات وحجوزات العملاء في منطقتك مباشرة.</p>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>اسم الصيدلية *</label>
            <input
              type="text"
              required
              placeholder="مثال: صيدلية الشفاء"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>اسم الصيدلي / المسؤول *</label>
              <input
                type="text"
                required
                placeholder="اسم الصيدلي المسؤول"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>رقم ترخيص الصيدلية *</label>
              <input
                type="text"
                required
                placeholder="رقم الترخيص"
                value={form.license}
                onChange={(e) => setForm({ ...form, license: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>المحافظة *</label>
              <input
                type="text"
                required
                placeholder="القاهرة، الجيزة..."
                value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>المنطقة / الحي *</label>
              <input
                type="text"
                required
                placeholder="مثال: المعادي، الدقي"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>العنوان بالتفصيل *</label>
            <input
              type="text"
              required
              placeholder="اسم الشارع، رقم العمارة، أقرب علامة مميزة"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>رقم هاتف الصيدلية *</label>
              <input
                type="tel"
                required
                placeholder="02XXXXXXXX أو 010XXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>رقم الواتساب</label>
              <input
                type="tel"
                placeholder="010XXXXXXXX"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <button
            type="submit"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
          >
            تأكيد تسجيل الصيدلية الان
          </button>
        </form>
      </div>
    </div>
  );
}
