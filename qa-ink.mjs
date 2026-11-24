export default async function run(page, ui) {
  // start in light mode
  await page.evaluate(() => localStorage.removeItem("dawak_dark_mode"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".navbar", { timeout: 20000 });
  await page.waitForTimeout(1200);

  const snap = await ui.snapshot();
  const toggle = snap.match(/@(e\d+) button "[^"]*الوضع الليلي"/);
  if (!toggle) return { error: "no toggle", snap: snap.slice(0, 1200) };

  const hasVT = await page.evaluate(
    () => typeof document.startViewTransition === "function",
  );
  await ui.click("@" + toggle[1]);

  const frames = [];
  // sample the root view-transition pseudo element during the sweep
  for (const t of [60, 140, 240, 360, 520]) {
    await page.waitForTimeout(t === 60 ? 60 : 80);
    const info = await page.evaluate(() => {
      const anims = document.getAnimations();
      const vt = anims.find((a) => {
        const t = a.effect && a.effect.pseudoElement;
        return t && t.includes("view-transition-new");
      });
      if (!vt) return { pseudo: null };
      const eff = vt.effect;
      return {
        pseudo: eff.pseudoElement,
        duration: eff.getTiming().duration,
        easing: eff.getTiming().easing,
        clip: getComputedStyle(
          document.documentElement,
          "::view-transition-new(root)",
        ).clipPath,
      };
    });
    frames.push({ t, ...info });
  }

  return {
    hasVT,
    frames,
    classes: await page.evaluate(() => document.documentElement.className),
  };
}
