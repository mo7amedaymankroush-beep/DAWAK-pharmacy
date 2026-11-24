export default async function run(page, ui) {
  const out = {};
  const bg = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    }, sel);

  // ---- LIGHT MODE snapshot ----
  out.light = {
    theme: await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    ),
    body: await bg("body"),
    card: await bg(".product-card"),
  };
  await page.screenshot({ path: "shot-light.png" });

  // ---- toggle to dark via the nav button ----
  const snap = await ui.snapshot();
  const toggle = snap.match(/@(e\d+) button "[^"]*الوضع الليلي"/);
  out.toggleRef = toggle ? toggle[0] : null;
  if (!toggle) return { error: "toggle not found", snap: snap.slice(0, 1500) };

  const hasVT = await page.evaluate(
    () => typeof document.startViewTransition === "function",
  );
  out.startViewTransition = hasVT;

  await ui.click("@" + toggle[1]);
  // capture the ink spill mid-animation
  await page.waitForTimeout(220);
  await page.screenshot({ path: "shot-ink-mid.png" });

  await page.waitForTimeout(1200);
  out.dark = {
    theme: await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    ),
    body: await bg("body"),
    appShell: await bg(".app-shell"),
    navbar: await bg(".navbar"),
    card: await bg(".product-card"),
    heading: await bg(".hero h1"),
    cartBtn: await bg(".cart-button"),
  };
  out.cssVars = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      mainBg: cs.getPropertyValue("--main-bg").trim(),
      darkCard: cs.getPropertyValue("--dark-card").trim(),
      text: cs.getPropertyValue("--dark-text").trim(),
      accent: cs.getPropertyValue("--accent-coral").trim(),
    };
  });
  await page.screenshot({ path: "shot-dark.png" });

  // ---- toggle back to light ----
  const snap2 = await ui.snapshot();
  const back = snap2.match(/@(e\d+) button "[^"]*الوضع النهاري"/);
  await ui.click("@" + (back ? back[1] : toggle[1]));
  await page.waitForTimeout(1400);
  out.backToLight = {
    theme: await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    ),
    body: await bg("body"),
    leftoverClasses: await page.evaluate(
      () => document.documentElement.className,
    ),
  };
  await page.screenshot({ path: "shot-light-back.png" });
  return out;
}
