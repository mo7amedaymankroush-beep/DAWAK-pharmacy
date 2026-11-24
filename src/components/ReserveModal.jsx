import { useState } from "react";
import {
  BellRing,
  MessageCircle,
  Smartphone,
  LogIn,
  PackageX,
  CheckCircle2,
} from "lucide-react";
import { createProductReservation } from "../api/mockApi";
import { getSessionPhone } from "../api/sessionApi";
import { useToast } from "./ToastProvider";
import money from "../utils/money";
import "./ReserveModal.css";

export default function ReserveModal({
  drug,
  alternatives = [],
  onClose,
  customerPhone = "",
  onOpenLogin,
  onBooked,
}) {
  const toast = useToast();
  const loggedInPhone = getSessionPhone() || customerPhone || "";

  // البدائل المتوفرة فعليًا — القسم يظهر فقط عند وجود بدائل حقيقية
  const availableAlternatives = (alternatives || []).filter(
    (item) => item.inStock !== false && item.id !== drug.id,
  );

  const [phone, setPhone] = useState(loggedInPhone);
  const [method, setMethod] = useState("whatsapp");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // الحجز بعد التأكيد

  async function confirmReservation() {
    if (busy) return;

    const trimmed = phone.trim();
    if (trimmed.length < 8) {
      setError("من فضلك اكتب رقم موبايل صحيح.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const reservation = await createProductReservation({
        drugId: drug.id,
        phone: trimmed,
        alertMethod: method,
      });

      setDone(reservation);
      toast(`تم تأكيد حجز ${drug.name} ✅ · يمكنك متابعته من «حجوزاتي»`);
      onBooked?.(reservation, drug);
    } catch (e) {
      setError(e.message || "حصل خطأ أثناء الحجز، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dw-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="dw-modal reserve-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserve-title"
      >
        <button className="reserve-close" onClick={onClose} aria-label="إغلاق">
          ×
        </button>

        {/* ===== بيانات المنتج في الأعلى ===== */}
        <header className="reserve-product">
          <h3 id="reserve-title">احجز المنتج</h3>
          <div className="reserve-product-card">
            <strong className="reserve-product-name">{drug.name}</strong>
            <span className="reserve-product-price">{money(drug.price)}</span>
          </div>
          {drug.inStock === false && (
            <p className="reserve-outofstock">
              <PackageX size={13} /> المنتج غير متوفر حاليًا — سيتم تنبيهك فور
              توفره
            </p>
          )}
        </header>

        {/* ===== البدائل (تظهر فقط عند وجود بدائل فعلية) ===== */}
        {availableAlternatives.length > 0 && (
          <section className="reserve-alternatives">
            <h4>البدائل المتوفرة بنفس المادة الفعالة</h4>
            <ul className="reserve-alt-list">
              {availableAlternatives.map((alternative) => (
                <li key={alternative.id}>
                  <span className="reserve-alt-name">{alternative.name}</span>
                  <span className="reserve-alt-price">
                    {money(alternative.price)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {done ? (
          /* ===== شاشة النجاح ===== */
          <section className="reserve-success">
            <CheckCircle2 size={34} className="reserve-success-icon" />
            <strong>تم استلام طلب حجزك بنجاح!</strong>
            <p>
              حجزك لـ <b>{drug.name}</b> قيد الانتظار الآن، ومتابعته متاحة من
              صفحة «حجوزاتي».
            </p>

            {done.customerPhone ? (
              <div className="reserve-success-note reserve-success-note--ok">
                الحجز مرتبط بحسابك ويظهر تلقائيًا في صفحة «حجوزاتي».
              </div>
            ) : (
              <div className="reserve-success-note reserve-success-note--guest">
                <p>
                  تم استلام طلب حجزك! سجّل الدخول أو أنشئ حسابًا الآن لحفظ
                  حجوزاتك ومتابعتها بسهولة والحصول على تجربة أفضل.
                </p>
                <button
                  type="button"
                  className="reserve-login-btn"
                  onClick={() => {
                    onClose();
                    onOpenLogin?.();
                  }}
                >
                  <LogIn size={15} />
                  تسجيل الدخول
                </button>
              </div>
            )}

            <button className="reserve-confirm-btn" onClick={onClose}>
              تمام
            </button>
          </section>
        ) : (
          /* ===== نموذج الحجز ===== */
          <section className="reserve-form">
            <label className="reserve-phone-field">
              رقم الموبايل
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError("");
                }}
                placeholder="01012345678"
                maxLength={15}
                disabled={busy}
              />
            </label>

            <div
              className="reserve-methods"
              role="radiogroup"
              aria-label="طريقة التنبيه"
            >
              <span className="reserve-methods-label">طريقة التنبيه</span>
              <div className="reserve-methods-buttons">
                <button
                  type="button"
                  role="radio"
                  aria-checked={method === "whatsapp"}
                  className={method === "whatsapp" ? "is-active" : ""}
                  onClick={() => setMethod("whatsapp")}
                  disabled={busy}
                >
                  <MessageCircle size={14} />
                  واتساب
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={method === "sms"}
                  className={method === "sms" ? "is-active" : ""}
                  onClick={() => setMethod("sms")}
                  disabled={busy}
                >
                  <Smartphone size={14} />
                  SMS
                </button>
              </div>
            </div>

            {error && <p className="dw-error">{error}</p>}

            <button
              type="button"
              className="reserve-confirm-btn"
              onClick={confirmReservation}
              disabled={busy}
            >
              {busy ? "جاري التأكيد..." : "تأكيد الحجز"}
            </button>

            <p className="reserve-hint">
              <BellRing size={12} />
              هنبلغك أول ما يبقى المنتج متوفرًا في أقرب صيدلية.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
