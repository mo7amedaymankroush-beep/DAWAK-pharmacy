export default async function run(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1600);

  const out = { errors, light: null, manual: null };

  // --- الوضع النهاري: نافذة الموقع ---
  await page.locator(".promo-cta").first().click({ force: true });
  await page.waitForTimeout(900);

  out.light = await page.evaluate(() => {
    const card = document.querySelector(".loc-modal");
    const rc = document.querySelector(".reflective-card");
    const g = (s, p = "backgroundColor") => {
      const e = document.querySelector(s);
      return e ? getComputedStyle(e)[p] : null;
    };
    return {
      opened: !!card,
      cardWidth: rc ? Math.round(rc.getBoundingClientRect().width) : null,
      cardHeight: rc ? Math.round(rc.getBoundingClientRect().height) : null,
      backdrop: g(".loc-backdrop"),
      blur: g(".loc-backdrop", "backdropFilter"),
      title: g(".loc-title", "color"),
      primaryBg: g(".loc-btn--primary"),
      primaryColor: g(".loc-btn--primary", "color"),
      ghostBorder: g(".loc-btn--ghost", "borderTopColor"),
      badge: g(".loc-badge"),
      skipColor: g(".loc-skip", "color"),
      titleText: card?.querySelector(".loc-title")?.textContent || null,
      buttons: [...document.querySelectorAll(".loc-btn")].map((b) =>
        b.textContent.trim(),
      ),
    };
  });
  await page.screenshot({ path: ".shot-loc-light.png" });

  // --- الاختيار اليدوي ---
  await page.locator(".loc-btn--ghost").first().click({ force: true });
  await page.waitForTimeout(700);
  out.manual = await page.evaluate(() => {
    const g = (s, p = "backgroundColor") => {
      const e = document.querySelector(s);
      return e ? getComputedStyle(e)[p] : null;
    };
    return {
      selects: document.querySelectorAll(
        ".loc-modal .pharmacy-location-fields select",
      ).length,
      selectBg: g(".loc-modal .pharmacy-location-fields select"),
      selectHeight: (() => {
        const e = document.querySelector(
          ".loc-modal .pharmacy-location-fields select",
        );
        return e ? Math.round(e.getBoundingClientRect().height) : null;
      })(),
      inputBg: g(".loc-input"),
      inputHeight: (() => {
        const e = document.querySelector(".loc-input");
        return e ? Math.round(e.getBoundingClientRect().height) : null;
      })(),
    };
  });
  await page.screenshot({ path: ".shot-loc-manual.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // --- مقارنة مع بطاقة تسجيل الدخول ---
  await page.locator(".account-button").first().click({ force: true });
  await page.waitForTimeout(1000);
  out.loginRef = await page.evaluate(() => {
    const rc = document.querySelector(".phone-login-backdrop .reflective-card");
    return {
      opened: !!document.querySelector(".phone-login"),
      width: rc ? Math.round(rc.getBoundingClientRect().width) : null,
      height: rc ? Math.round(rc.getBoundingClientRect().height) : null,
    };
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  return out;
}
