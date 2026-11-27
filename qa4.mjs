export default async function run(page) {
  const out = {};

  // 1) إضافة منتج للعربة
  await page.getByRole("button", { name: "إضافة للعربة" }).first().click();
  await page.waitForTimeout(300);
  out.addToCart = await page.evaluate(() => {
    const el = document.querySelector(".toast");
    const card = el?.querySelector(".toast-card");
    if (!el || !card) return null;
    const r = el.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    const s = getComputedStyle(card);
    const icon = el.querySelector(".toast-check");
    return {
      text: card.innerText.trim(),
      overlay:
        getComputedStyle(el).position +
        "/" +
        getComputedStyle(el).display +
        "/" +
        getComputedStyle(el).alignItems +
        "/" +
        getComputedStyle(el).justifyContent,
      centered:
        Math.abs(cr.x + cr.width / 2 - innerWidth / 2) < 2 &&
        Math.abs(cr.y + cr.height / 2 - innerHeight / 2) < 2,
      cardSize: { w: cr.width, h: cr.height },
      cardBg: s.backgroundColor,
      radius: s.borderRadius,
      shadow: s.boxShadow,
      iconColor: icon ? getComputedStyle(icon).color : null,
      hasIcon: !!icon,
    };
  });
  await page.screenshot({
    path: "e:/MY PRO VS code/DAWAK-pharmacy/qa-toast-add.png",
  });

  // يختفي بعد 2.5 ثانية تقريبًا
  await page.waitForTimeout(2500);
  out.hiddenAfter2500 = await page.evaluate(
    () => !document.querySelector(".toast"),
  );

  // 2) رفع صورة الروشتة
  await page.setInputFiles("#hero-prescription-input", {
    name: "rx.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.waitForTimeout(300);
  out.prescription = await page.evaluate(
    () => document.querySelector(".toast-message")?.innerText.trim() || null,
  );
  await page.screenshot({
    path: "e:/MY PRO VS code/DAWAK-pharmacy/qa-toast-rx.png",
  });
  await page.waitForTimeout(2500);

  // 3) تحديد الموقع (التحديد اليدوي)
  await page
    .getByRole("button", { name: /تحديد الموقع/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  const snap = await page.locator(".loc-modal").innerText();
  out.locationModalFound = !!snap;
  await page.getByText("تحديد يدوي").first().click();
  await page.waitForTimeout(500);
  const selects = page.locator(".loc-modal select");
  out.selectCount = await selects.count();
  if (out.selectCount >= 1) {
    const gov = await selects.nth(0).locator("option").allInnerTexts();
    await selects.nth(0).selectOption({ index: 1 });
    await page.waitForTimeout(400);
    if (out.selectCount >= 2) {
      const cities = await selects.nth(1).locator("option").allInnerTexts();
      if (cities.length > 1) await selects.nth(1).selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }
    if (out.selectCount >= 3) {
      const areas = await selects.nth(2).locator("option").allInnerTexts();
      if (areas.length > 1) await selects.nth(2).selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }
    out.govOptions = gov.slice(0, 4);
  }
  await page
    .getByRole("button", { name: /تأكيد الموقع/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  out.locationToastSeen = await page.evaluate(
    () => document.querySelector(".toast-message")?.innerText.trim() || null,
  );
  await page.screenshot({
    path: "e:/MY PRO VS code/DAWAK-pharmacy/qa-toast-loc.png",
  });

  return out;
}
