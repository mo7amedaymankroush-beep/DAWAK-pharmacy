'use client';

import { useRef, useState } from "react";
import { runInkTransition } from "../utils/inkTransition";
import "./LampPullSwitch.css";

export default function LampPullSwitch({ theme, onToggle }) {
  const [pullY, setPullY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const movedRef = useRef(false);

  // تبديل الثيم بتأثير سكب الحبر من أعلى الزاوية اليمنى (مشترك في utils/inkTransition)
  const handleToggle = () => {
    if (!onToggle) return;
    runInkTransition(onToggle);
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

