import { flushSync } from "react-dom";

// مدة حركة سكب الحبر (بالملي ثانية) — تُستخدم أيضًا لتحديث كلاس html
export const INK_TRANSITION_DURATION = 750;

// منحنى الحركة الناعم المطابق لـ CSS
export const INK_TRANSITION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * تشغيل انتقال الثيم بتأثير سكب الحبر (Ink Spill Effect).
 * نقطة بداية الانتشار هي الزاوية اليمنى العليا للشاشة (innerWidth, 0)
 * ويتسع نصف القطر حتى يغطي كامل قطر الشاشة.
 *
 * @param {Function} applyTheme تغيير حالة الثيم (React setState)
 */
export function runInkTransition(applyTheme) {
  const html = document.documentElement;

  // نقطة الانطلاق: الزاوية اليمنى العليا
  const x = window.innerWidth;
  const y = 0;

  // نصف القطر الذي يغطي كل نقاط الشاشة انطلاقًا من الزاوية اليمنى العليا
  const radius = Math.hypot(x, window.innerHeight);

  html.style.setProperty("--ink-x", `${x}px`);
  html.style.setProperty("--ink-y", `${y}px`);
  html.style.setProperty("--ink-radius", `${radius}px`);
  html.style.setProperty("--ink-duration", `${INK_TRANSITION_DURATION}ms`);
  html.style.setProperty("--ink-easing", INK_TRANSITION_EASING);

  // Fallback مباشر للمتصفحات التي لا تدعم View Transitions
  if (typeof document.startViewTransition !== "function") {
    applyTheme();
    return;
  }

  // تعطيل أي transition على background-color أثناء الحركة لمنع التداخل
  html.classList.add("ink-transitioning");

  const transition = document.startViewTransition(() => {
    // تحديث الـ DOM فورًا قبل بدء حركة الـ animation
    flushSync(() => {
      applyTheme();
    });
  });

  const cleanup = () => {
    html.classList.remove("ink-transitioning");
    html.style.removeProperty("--ink-radius");
  };

  transition.finished.then(cleanup).catch(cleanup);

  return transition;
}
