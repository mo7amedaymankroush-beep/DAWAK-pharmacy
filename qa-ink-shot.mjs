export default async function run(page, ui) {
  await page.evaluate(() => localStorage.removeItem("dawak_dark_mode"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".navbar", { timeout: 20000 });
  await page.waitForTimeout(1200);
  const snap = await ui.snapshot();
  const toggle = snap.match(/@(e\d+) button "[^"]*الوضع الليلي"/);
  await ui.click("@" + toggle[1]);
  await page.waitForTimeout(230);
  await page.screenshot({ path: "shot-ink-mid.png" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "shot-ink-end.png" });
  return { ok: true };
}
