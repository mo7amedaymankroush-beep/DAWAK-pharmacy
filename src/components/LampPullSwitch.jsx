'use client';

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { INK_TRANSITION_DURATION, INK_TRANSITION_EASING } from "../utils/inkTransition";
import "./LampPullSwitch.css";

export default function LampPullSwitch({ theme, onToggle }) {
  const [pullY, setPullY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const movedRef = useRef(false);

  // تبديل الثيم بتأثير سكب الحبر: النقطة هي الزاوية اليمنى العليا للشاشة
  const handleToggle = () => {
    if (!onToggle) return;

    const html = document.documentElement;
    const x = window.innerWidth;
    const y = 0;

    html.style.setProperty("--ink-x", `${x}px`);
    html.style.setProperty("--ink-y", `${y}px`);
    html.style.setProperty("--ink-radius", `${Math.hypot(x, window.innerHeight)}px`);
    html.style.setProperty("--ink-duration", `${INK_TRANSITION_DURATION}ms`);
    html.style.setProperty("--ink-easing", INK_TRANSITION_EASING);

    // Fallback مباشر للمتصفحات التي لا تدعم View Transitions
    if (typeof document.startViewTransition !== "function") {
      onToggle();
      return;
    }

    html.classList.add("ink-transitioning");

    const transition = document.startViewTransition(() => {
      // تحديث الـ DOM فورًا قبل بدء الحركة
      flushSync(onToggle);
    });

    const cleanup = () => {
      html.classList.remove("ink-transitioning");
      html.style.removeProperty("--ink-radius");
    };

    transition.finished.then(cleanup).catch(cleanup);
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    movedRef.current = false;
    setDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const delta = Math.max(0, Math.min(60, e.clientY - startYRef.current));
    if (delta > 5) movedRef.current = true;
    setPullY(delta);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    const shouldToggle = pullY >= 24 || !movedRef.current;
    setDragging(false);
    setPullY(0);
    if (shouldToggle) handleToggle();
  };

  return (
    <div className="lamp-switch-wrap" title={theme === "dark" ? "اسحب لإضاءة الموقع" : "اسحب للوضع الليلي"}>
      <div
        className={`lamp-cord ${dragging ? "is-dragging" : ""}`}
        style={{ height: `${44 + pullY}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="button"
        tabIndex={0}
        aria-label="تبديل الوضع الليلي والنهاري"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleToggle(); }}
      >
        <span className="lamp-line" />
        <span className={`lamp-bulb ${theme === "light" ? "is-on" : "is-off"}`} />
      </div>
    </div>
  );
}

