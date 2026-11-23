import { useState } from "react";
import {
  Lightbulb,
  BellRing,
  ShoppingCart,
  MessageCircle,
  Smartphone,
  ShieldAlert,
} from "lucide-react";
import { createReservation } from "../api/mockApi";
import { useToast } from "./ToastProvider";
import { isAlertActive, saveStockAlert } from "../utils/stockAlerts";
import money from "../utils/money";
import "./ReserveModal.css";

export default function ReserveModal({
  drug,
  pharmacy,
  alternatives = [],
  onClose,
  customerPhone = "",
  onAddAlternative,
  onBooked,
}) {
  const toast = useToast();
  const isOutOfStock = drug.inStock === false;
  const availableAlternatives = alternatives.filter(
    (item) => item.inStock !== false && item.id !== drug.id,
  );

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  // حالة قسم تنبيه التوفر
  const [phone, setPhone] = useState(customerPhone || "");
  const [method, setMethod] = useState("whatsapp");
  const [alertDone, setAlertDone] = useState(() => isAlertActive(drug.id));
  const [alertError, setAlertError] = useState("");

  async function submit() {
    if (busy) return;

    setError("");

    if (drug.requiresPrescription && !file) {
      setError("من فضلك ارفع صورة الروشتة أولاً.");
      return;
    }

    setBusy(true);

    try {
      const reservation = await createReservation({
        drugId: drug.id,
        pharmacyId: pharmacy?.id ?? null,
        prescriptionImage: file,
      });

      setDone(reservation);
      onBooked?.(reservation, drug);
      toast(
        reservation?.type === "waitlist"
          ? `تم تسجيل ${drug.name} في قائمة انتظار التوفر 🔔`
          : `تم حجز ${drug.name} بنجاح`
      );
    } catch (e) {
      setError(e.message || "حصل خطأ أثناء الحجز، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  function activateAlert() {
    const trimmed = phone.trim();
    if (trimmed.length < 8) {
      setAlertError("من فضلك اكتب رقم موبايل صحيح");
      return;
    }

    saveStockAlert({ drug, phone: trimmed, method });
    setAlertDone(true);
    setAlertError("");
    toast(`تم تفعيل تنبيه التوفر لـ ${drug.name} 🔔`);
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
        {done ? (
          <>
            <h3 id="reserve-title">تم تسجيل طلبك بنجاح</h3>

            <p>
              {done.type === "waitlist"
                ? "تم تسجيل طلبك في قائمة الانتظار. ميزة إرسال إشعار عند التوفر تحتاج ربطًا بالباك إند."
                : "تم حفظ الحجز، وهو صالح لمدة 24 ساعة."}
            </p>

            <button onClick={onClose}>تمام</button>
          </>
        ) : (
          <>
            <h3 id="reserve-title">
              {pharmacy
                ? "تأكيد الحجز"
                : isOutOfStock
                  ? "دواء غير متوفر حاليًا"
                  : "طلب الدواء عند توفره"}
            </h3>

            <p>
              <b>{drug.name}</b>
              {pharmacy && ` · ${pharmacy.name}`}
            </p>

            {/* ===== القسم الأول: البدائل المتوفرة بنفس المادة الفعالة ===== */}
            {isOutOfStock && (
              <section className="reserve-alternatives">
                <h4>
                  <Lightbulb size={15} /> البدائل المتوفرة بنفس المادة الفعالة
                </h4>

                {availableAlternatives.length > 0 ? (
                  <>
                    <p className="reserve-alt-note">
                      <ShieldAlert size={13} />
                      نفس المادة الفعالة — يُؤكد الصيدلي ملاءمتها قبل التوصيل
                    </p>

                    <ul className="reserve-alt-list">
                      {availableAlternatives.map((alternative) => (
                        <li key={alternative.id}>
                          <div className="reserve-alt-info">
                            <strong>{alternative.name}</strong>
                            <span>
                              {alternative.brand} ·{" "}
                              {alternative.activeIngredient}
                            </span>
                          </div>
                          <span className="reserve-alt-price">
                            {money(alternative.price)}
                          </span>
                          <button
                            type="button"
                            className="reserve-alt-add"
                            onClick={() => onAddAlternative?.(alternative)}
                          >
                            <ShoppingCart size={14} />
                            إضافة البديل للعربة 🛒
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="reserve-alt-empty">
                    لا تتوفر بدائل بنفس المادة الفعالة حاليًا
                  </p>
                )}
              </section>
            )}

            {/* نموذج الحجز التقليدي (للأدوية المتوفرة أو عند اختيار صيدلية) */}
            {(!isOutOfStock || pharmacy) && drug.requiresPrescription && (
              <label className="dw-file">
                ارفع صورة الروشتة (مطلوبة)
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setError("");
                  }}
                  disabled={busy}
                />
                {file && <small>{file.name}</small>}
              </label>
            )}

            {error && <p className="dw-error">{error}</p>}

            {/* ===== القسم الثاني: تنبيه التوفر ===== */}
            {isOutOfStock && (
              <section className="reserve-alert">
                <h4>
                  <BellRing size={15} /> 🔔 بلّغني أول ما يتوفر
                </h4>

                {alertDone ? (
                  <p className="reserve-alert-success" role="status">
                    تم تسجيل تنبيهك! هنبعتلك رسالة على{" "}
                    {method === "whatsapp" ? "واتساب" : "SMS"} أول ما الدواء
                    يتوفر في أقرب صيدلية ✅
                  </p>
                ) : (
                  <>
                    <label className="reserve-alert-phone">
                      رقم الموبايل / واتساب
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => {
                          setPhone(event.target.value);
                          setAlertError("");
                        }}
                        placeholder="مثال: 01012345678"
                        maxLength={20}
                      />
                    </label>

                    <div
                      className="reserve-alert-methods"
                      role="radiogroup"
                      aria-label="وسيلة التنبيه"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={method === "whatsapp"}
                        className={method === "whatsapp" ? "is-active" : ""}
                        onClick={() => setMethod("whatsapp")}
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
                      >
                        <Smartphone size={14} />
                        رسالة SMS
                      </button>
                    </div>

                    {alertError && <p className="dw-error">{alertError}</p>}

                    <button
                      type="button"
                      className="reserve-alert-submit"
                      onClick={activateAlert}
                    >
                      <BellRing size={15} />
                      تفعيل تنبيه التوفر 🔔
                    </button>
                  </>
                )}
              </section>
            )}

            <div className="dw-actions">
              {(!isOutOfStock || pharmacy) && (
                <button onClick={submit} disabled={busy}>
                  {busy ? "جاري التأكيد..." : "تأكيد"}
                </button>
              )}

              <button className="dw-ghost" onClick={onClose} disabled={busy}>
                إغلاق
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
