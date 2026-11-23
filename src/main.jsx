// نموذج Vite: يجب أن يكون أول سطر تعليقًا واحدًا حتى تُطبَّق تحويلات JSX و React Refresh
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

function mount() {
  const container = document.getElementById("root");
  if (!container) return;
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

mount();

// تأثير الموجة على الأزرار ذات الكلاس dynamic-btn
document.querySelectorAll(".dynamic-btn").forEach((button) => {
  button.addEventListener("click", function (e) {
    const x = e.clientX - e.target.getBoundingClientRect().left;
    const y = e.clientY - e.target.getBoundingClientRect().top;

    const ripple = document.createElement("span");
    ripple.classList.add("ripple");
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});
