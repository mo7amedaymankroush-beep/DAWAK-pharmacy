import { useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardList, LogOut, UserRound } from "lucide-react";
import { formatPhone } from "../api/sessionApi";
import "./account-menu.css";

// زر الحساب بعد تسجيل الدخول: يعرض الرقم، ويفتح لوحة صغيرة فيها الحجوزات وتسجيل الخروج
export default function AccountMenu({ phone, onOpenBookings, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={wrapperRef}>
      <button
        type="button"
        className="account-button dynamic-btn account-button--signed"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`حسابك ${formatPhone(phone)}`}
        onClick={() => setOpen((current) => !current)}
      >
        <UserRound size={17} />
        <span className="account-label">مسجّل</span>
        <ChevronDown size={14} className={`account-caret${open ? " is-open" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="account-menu-panel" role="menu" aria-label="حسابك">
          <p className="account-menu-number" dir="ltr">{formatPhone(phone)}</p>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenBookings();
            }}
          >
            حجوزاتي
            <ClipboardList size={15} aria-hidden="true" />
          </button>

          <button
            type="button"
            role="menuitem"
            className="account-menu-logout"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            تسجيل الخروج
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
