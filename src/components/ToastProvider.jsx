import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * ToastProvider — يوفر دالة showToast لأي مكوّن داخل التطبيق،
 * ويعرض الإشعار نفسه في منتصف الشاشة داخل بطاقة بيضاء أنيقة
 * مع أيقونة صح خضراء، ويختفي تلقائيًا بعد 2.5 ثانية.
 */
const ToastContext = createContext(null);

// مدة ظهور الإشعار
export const TOAST_DURATION = 2500;

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);
  // نعطي كل إشعار مفتاحًا جديدًا لتُعاد حركة الظهور حتى لو تكرر نفس النص
  const [toastKey, setToastKey] = useState(0);
  const timer = useRef(0);

  const showToast = useCallback((msg) => {
    if (!msg) return;
    window.clearTimeout(timer.current);
    setMessage(String(msg));
    setToastKey((key) => key + 1);
    timer.current = window.setTimeout(() => setMessage(null), TOAST_DURATION);
  }, []);

  // نجعل التنبيه متاحًا لأي مكان في التطبيق (App + الصفحات)
  useEffect(() => {
    window.showToast = showToast;
    return () => {
      if (window.showToast === showToast) delete window.showToast;
      window.clearTimeout(timer.current);
    };
  }, [showToast]);

  // نفس شكل قيمة App السابقة (دالة مباشرة) حتى يعمل أي كود
  // يعتمد على ToastContext مباشرة أو على useToast بدون تغيير.
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && (
        <div
          key={toastKey}
          className="toast"
          role="status"
          aria-live="polite"
          dir="rtl"
          data-tone="success"
        >
          <div className="toast-card">
            <span className="toast-check" aria-hidden="true">
              <CheckCircle2 size={30} strokeWidth={2.4} />
            </span>
            <p className="toast-message">{message}</p>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/** يرجّع showToast من المزوّد، وإلا دالة آمنة تعتمد على window.showToast. */
export function useToast() {
  const context = useContext(ToastContext);
  const fallback = useCallback((message) => {
    if (
      typeof window !== "undefined" &&
      typeof window.showToast === "function"
    ) {
      window.showToast(message);
    }
  }, []);
  if (!context) return fallback;
  return typeof context === "function" ? context : fallback;
}

export default ToastContext;
