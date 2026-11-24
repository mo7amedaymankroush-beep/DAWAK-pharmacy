import { useState } from "react";
import { Megaphone, Send, Building2 } from "lucide-react";
import { openWhatsAppMessage } from "./WhatsAppSupport";
import { useToast } from "./ToastProvider";
import "./AdvertiseBanner.css";

const AD_PACKAGES = ["بانر رئيسي", "قسم العروض", "باقة كاملة"];
   
export function AdvertiseModal({ onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    brand: "",
    phone: "",
    package: AD_PACKAGES[0],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;

    if (!form.brand.trim()) {
      setError("من فضلك اكتب اسم الشركة أو الماركة.");
      return;
    }
    if (form.phone.trim().length < 8) {
      setError("من فضلك اكتب رقم موبايل صحيح.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      // حفظ طلب الإعلان محليًا (يمكن ربطه بالباك إند لاحقًا)
      try {
        const stored = JSON.parse(localStorage.getItem("dawak-ad-requests") || "[]");
        stored.push({ ...form, createdAt: Date.now() });
        localStorage.setItem("dawak-ad-requests", JSON.stringify(stored));
      } catch {
        /* التخزين غير متاح — نتجاهل */
      }

      toast("تم استلام طلبك بنجاح! سيتواصل معك فريق التسويق في دواك خلال 24 ساعة.");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dw-overlay" onClick={onClose}>
      <div
        className="dw-modal ad-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-modal-title"
      >
        <button className="ad-modal-close" onClick={onClose} aria-label="إغلاق">
          ×
        </button>

        <header className="ad-modal-head">
          <span className="ad-modal-icon" aria-hidden="true">
            <Megaphone size={18} />
          </span>
          <div>
            <h3 id="ad-modal-title">طلب إعلان للشركات والماركات</h3>
            <p>سيتواصل معك فريق التسويق خلال 24 ساعة</p>
          </div>
        </header>

        <form className="ad-form" onSubmit={submit}>
          <label>
            اسم الشركة أو الماركة
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="مثال: شركة فارما للدواء"
              maxLength={60}
            />
          </label>

          <label>
            رقم الموبايل / واتساب
            <input
              type="tel"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="01012345678"
              maxLength={15}
            />
          </label>

          <label>
            نوع الإعلان
            <select
              value={form.package}
              onChange={(e) => setForm({ ...form, package: e.target.value })}
            >
              {AD_PACKAGES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          {error && <p className="dw-error">{error}</p>}

          <button type="submit" className="ad-submit-btn" disabled={busy}>
            <Send size={15} />
            {busy ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdvertiseBanner() {
  const [showModal, setShowModal] = useState(false);

  function openAdModal() {
    setShowModal(true);
  }

  function handleCardKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAdModal();
    }
  }

  function openWhatsApp(e) {
    // نمنع فتح نافذة التسجيل عند الضغط على زر واتساب
    e.stopPropagation();
    openWhatsAppMessage(
      "مرحباً فريق دواك، نرغب في الاستفسار عن باقات الإعلانات وعرض منتجات شركتنا على منصة دواك.",
    );
  }

  return (
    <>
      <section
        className="ad-banner"
        aria-labelledby="ad-banner-title"
        role="button"
        tabIndex={0}
        onClick={openAdModal}
        onKeyDown={handleCardKeyDown}
      >
        <div className="ad-banner-copy">
          <span className="ad-banner-badge">شركاء النجاح والماركات ✨</span>
          <h2 className="ad-banner-title" id="ad-banner-title">
            أعلن عن منتجاتك وشركتك على دواك 📢
          </h2>
          <p className="ad-banner-text">
            وصل بمنتجاتك الطبية ومستحضرات التجميل لآلاف العملاء يومياً.
          </p>
        </div>

        <div className="ad-banner-actions">
          <button
            type="button"
            className="ad-btn ad-btn--primary"
            onClick={(e) => {
              e.stopPropagation();
              openAdModal();
            }}
          >
            <Building2 size={17} />
            أعلن الآن
          </button>

          <button
            type="button"
            className="ad-btn ad-btn--whatsapp"
            onClick={openWhatsApp}
          >
            واتساب
          </button>
        </div>
      </section>

      {showModal && <AdvertiseModal onClose={() => setShowModal(false)} />}
    </>
  );
}
