import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Phone, ShieldCheck, X } from "lucide-react";
import { normalizePhone, validateEgyptianPhone } from "../api/sessionApi";
import ReflectiveCard from "./ReflectiveCard";
import "./phone-login.css";

const SLOT_COUNT = 11;

export default function PhoneLoginModal({ reason = "", onClose, onSuccess }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const digits = normalizePhone(value);
  const validation = validateEgyptianPhone(value);
  const isFilled = digits.length === SLOT_COUNT;
  const slotIsWrong = isFilled && !validation.valid;

  function handleChange(event) {
    const nextValue = event.target.value.replace(/[^\d\u0660-\u0669\u06F0-\u06F9\s+-]/g, "");
    setValue(nextValue);
    if (error) setError("");
  }

  function submit(event) {
    event.preventDefault();

    const check = validateEgyptianPhone(value);
    if (!check.valid) {
      setError(check.error);
      inputRef.current?.focus();
      return;
    }

    onSuccess(check.phone);
  }

  return (
    <div
      className="phone-login-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <ReflectiveCard
        theme="dark"
        tint="#10b981"
        webcam={false}
        width={420}
        height={470}
      >
        <section
          className="phone-login"
          role="dialog"
          aria-modal="true"
          aria-labelledby="phone-login-title"
          aria-describedby="phone-login-note"
          dir="rtl"
        >
          <button
            ref={closeRef}
            type="button"
            className="phone-login-close"
            aria-label="إغلاق نافذة تسجيل الدخول"
            onClick={onClose}
          >
            <X size={18} />
          </button>

          <h2 id="phone-login-title">دخول برقم الموبايل</h2>
          <p className="phone-login-sub">
            {reason || "هنربط حجوزاتك وطلباتك بالرقم اللي هتدخله."}
          </p>

          <form onSubmit={submit} noValidate>
            <label className="phone-login-label" htmlFor="phone-login-input">
              رقم الموبايل
            </label>

            <div
              className={`phone-login-field${validation.valid ? " is-valid" : ""}${slotIsWrong ? " is-invalid" : ""}`}
            >
              <Phone size={16} aria-hidden="true" />
              <input
                id="phone-login-input"
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                maxLength={17}
                placeholder="01012345678"
                value={value}
                onChange={handleChange}
                aria-invalid={Boolean(error)}
                aria-describedby="phone-login-hint phone-login-note"
              />
            </div>

            <div className="phone-login-slots" dir="ltr" aria-hidden="true">
              {Array.from({ length: SLOT_COUNT }, (_, index) => (
                <span
                  key={index}
                  className={`phone-login-slot${digits[index] ? " is-filled" : ""}${slotIsWrong && digits[index] ? " is-wrong" : ""}`}
                >
                  {digits[index] ?? ""}
                </span>
              ))}
            </div>

            {error ? (
              <p className="phone-login-error" role="alert">
                {error}
              </p>
            ) : (
              <p className="phone-login-hint" id="phone-login-hint">
                {slotIsWrong
                  ? "الرقم لازم يبدأ بـ 010 أو 011 أو 012 أو 015."
                  : "11 رقم، مثال: 01012345678"}
              </p>
            )}

            <button
              className="phone-login-submit"
              type="submit"
              disabled={!digits.length}
            >
              تسجيل الدخول / متابعة
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          </form>

          <p className="phone-login-note" id="phone-login-note">
            <ShieldCheck size={15} aria-hidden="true" />
            الرقم بيتحفظ على الجهاز ده، ومفيش كود تحقق في النسخة التجريبية.
          </p>
        </section>
      </ReflectiveCard>
    </div>
  );
}
