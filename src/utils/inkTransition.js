import { flushSync } from "react-dom";

// مدة حركة سكب الحبر (بالثواني) — مطابقة لقيمة CSS
export const INK_TRANSITION_DURATION = 650;

// منحنى الحركة الناعم المطابق لـ CSS
export const INK_TRANSITION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

// مدة الانتقال البديل (Fallback) للمتصفحات التي لا تدعم View Transitions
const FALLBACK_FADE_MS = 400;

/**
 * تشغيل انتقال الثيم بتأثير سكب الحبر (Ink Spill Effect).
 * نقطة بداية الانتشار ثابتة دائمًا عند أعلى الزاوية اليمنى للشاشة (100% 0)
 * والحركة تعمل عبر clip-path: circle(0 -> 150vmax) خلال 0.65s.
 *
 * @param {Function} applyTheme تغيير حالة الثيم (React setState)
 */
export function runInkTransition(applyTheme) {
  const html = document.documentElement;

  // الموقع ونصف القطر محسوبان بالكامل في CSS (circle ... at 100% 0)
  html.style.setProperty("--ink-duration", `${INK_TRANSITION_DURATION}ms`);
  html.style.setProperty("--ink-easing", INK_TRANSITION_EASING);

  // Fallback سلس: انتقال على background-color و color
  if (typeof document.startViewTransition !== "function") {
    html.classList.add("theme-fading");
    applyTheme();
    window.setTimeout(() => {
      html.classList.remove("theme-fading");
    }, FALLBACK_FADE_MS);
    return null;
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
  };

  transition.finished.then(cleanup).catch(cleanup);

  return transition;
}
