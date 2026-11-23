import { createContext, useCallback, useContext } from "react";

/**
 * ToastProvider — يوفر دالة showToast لأي مكوّن داخل التطبيق.
 * يُستخدم بدل أي تنبيه محلي جديد، ويظهر نفس شكل الـ toast المستخدم في App.
 */
const ToastContext = createContext(null);

export function ToastProvider({ value, children }) {
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/** يرجّع showToast من المزوّد، وإلا دالة آمنة تعتمد على window.showToast. */
export function useToast() {
  const context = useContext(ToastContext);
  const fallback = useCallback((message) => {
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(message);
    }
  }, []);
  return context || fallback;
}

export default ToastContext;
