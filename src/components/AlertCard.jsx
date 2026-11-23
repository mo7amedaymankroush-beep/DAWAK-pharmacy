import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import "./alert-card.css";

const ALERT_DURATION = 2500;

const toneIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

// بطاقة إشعار في منتصف الشاشة مع تعتيم خلفها، تُغلق بزر «حسناً» أو تلقائيًا بعد 2.5 ثانية
export default function AlertCard({ message, tone = "success", onClose, duration = ALERT_DURATION }) {
  const closeRef = useRef(null);
  // نحفظ دالة الإغلاق في مرجع حتى لا يُعاد ضبط مؤقّت الـ 2.5 ثانية مع كل إعادة رسم
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => onCloseRef.current?.(), duration);
    return () => window.clearTimeout(timer);
  }, [message, tone, duration]);

  useEffect(() => {
    if (!message) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };

    window.addEventListener("keydown", closeOnEscape);
    closeRef.current?.focus();

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [message]);

  if (!message) return null;

  const Icon = toneIcons[tone] || CheckCircle2;

  return (
    <div
      className="alert-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`alert-card alert-card--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-alert-message"
        dir="rtl"
      >
        <span className="alert-card-icon" aria-hidden="true">
          <Icon size={34} strokeWidth={2.3} />
        </span>

        <p className="alert-card-message" id="app-alert-message">{message}</p>

        <button ref={closeRef} type="button" className="alert-card-close" onClick={onClose}>
          حسناً
        </button>
      </section>
    </div>
  );
}
