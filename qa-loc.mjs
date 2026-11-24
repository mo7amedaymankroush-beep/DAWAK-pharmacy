export default async function run(page, ui) {
  const out = {};
  const evalCss = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);

  // open the location card
  const snap = await ui.snapshot();
  const cta = snap.match(/@(e\d+) button "[^"]*تحديد الموقع"/);
  out.cta = cta ? cta[0] : null;
  if (!cta) return { error: "no cta", snap };
  await ui.click("@" + cta[1]);
  await page.waitForTimeout(900);

  out.choiceCard = await evalCss(".loc-card");
  out.choiceVisible = await page.evaluate(
    () =>
      document.querySelector(".loc-section-title, .loc-modal h2")?.innerText,
  );
  await page.screenshot({ path: "shot-choice.png" });

  const snap2 = await ui.snapshot();
  const manual = snap2.match(/@(e\d+) button "[^"]*تحديد يدوي/);
  if (!manual) return { error: "no manual button", snap2 };
  await ui.click("@" + manual[1]);
  await page.waitForTimeout(700);

  out.manualCard = await evalCss(".loc-card");
  await page.screenshot({ path: "shot-manual.png" });

  const selects = await page.evaluate(() =>
    [...document.querySelectorAll(".loc-modal select")].map((s) => s.value),
  );
  out.selects = selects;
  return out;
}
