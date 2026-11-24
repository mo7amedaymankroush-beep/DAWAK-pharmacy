export default async function run(page, ui) {
  const out = {};
  // زائر => guest storage
  await page.evaluate(() => {
    localStorage.removeItem("dawak_dark_mode");
    localStorage.setItem(
      "dawak-monthly-guest",
      JSON.stringify([
        {
          id: "rx-1",
          items: [
            { id: "m1", name: "كونكور 5 ملجم", price: 42, quantity: 1 },
            { id: "m2", name: "جلوكوفاج 500", price: 31, quantity: 2 },
          ],
          deliveryDay: 10,
          remindBefore: true,
          paused: false,
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000,
        },
        {
          id: "rx-2",
          items: [{ id: "m3", name: "أتور 20 ملجم", price: 55, quantity: 1 }],
          deliveryDay: 25,
          remindBefore: true,
          paused: true,
          createdAt: Date.now() - 172800000,
          updatedAt: Date.now() - 172800000,
        },
      ]),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".navbar", { timeout: 30000 });
  await page.waitForTimeout(1200);

  out.lightNav = await page.evaluate(() => {
    const btn = document.querySelector(".monthly-rx-button");
    return {
      text: btn?.innerText.replace(/\s+/g, " ").trim(),
      badge: getComputedStyle(btn, "::after").content,
    };
  });

  out.lightCard = await page.evaluate(() => {
    document.querySelector("#rx-tab-monthly")?.click();
    return {
      badge: document.querySelector(".rx-monthly-count")?.innerText,
      gradient: getComputedStyle(document.querySelector(".submit-prescription"))
        .backgroundImage,
    };
  });
  await page
    .locator(".prescription-card")
    .screenshot({ path: "shot-card.png" });

  // open the modal from the nav button
  await page.locator(".monthly-rx-button").click();
  await page.waitForSelector(".mpx-modal", { timeout: 10000 });
  await page.waitForTimeout(700);
  out.modalLight = await page.evaluate(() => ({
    activeTab: document
      .querySelector(".mpx-tab.is-active")
      ?.innerText.replace(/\s+/g, " ")
      .trim(),
    historyItems: document.querySelectorAll(".mpx-history-item").length,
    headGradient: getComputedStyle(document.querySelector(".mpx-head"))
      .backgroundImage,
    count: document.querySelector(".mpx-tab-count")?.innerText,
  }));
  await page
    .locator(".mpx-modal")
    .screenshot({ path: "shot-modal-history.png" });

  // switch to the "new" tab
  await page.evaluate(() =>
    [...document.querySelectorAll(".mpx-tab")]
      .find((t) => t.innerText.includes("إضافة"))
      ?.click(),
  );
  await page.waitForTimeout(500);
  await page.locator(".mpx-modal").screenshot({ path: "shot-modal-new.png" });

  // save a new rx and watch the badge update
  await page.evaluate(() => {
    [...document.querySelectorAll(".mpx-tab")]
      .find((t) => t.innerText.includes("إضافة"))
      ?.click();
  });
  await page.fill(".mpx-manual input", "دواء تجربة");
  await page.evaluate(() =>
    [...document.querySelectorAll(".mpx-manual button")][0]?.click(),
  );
  await page.evaluate(() =>
    [...document.querySelectorAll(".mpx-actions .mpx-save")][0]?.click(),
  );
  await page.waitForTimeout(600);
  out.afterSave = await page.evaluate(() => ({
    badge: getComputedStyle(
      document.querySelector(".monthly-rx-button"),
      "::after",
    ).content,
    historyItems: document.querySelectorAll(".mpx-history-item").length,
  }));

  // delete one and watch it drop
  await page.locator(".mpx-history-delete").first().click();
  await page.waitForTimeout(500);
  out.afterDelete = await page.evaluate(() => ({
    badge: getComputedStyle(
      document.querySelector(".monthly-rx-button"),
      "::after",
    ).content,
    historyItems: document.querySelectorAll(".mpx-history-item").length,
  }));
  await page.locator(".mpx-modal").screenshot({ path: "shot-modal-after.png" });

  // close modal, toggle dark, reopen
  await page.locator(".mpx-close").click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    localStorage.setItem("dawak_dark_mode", "true");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.waitForTimeout(400);
  await page.locator(".monthly-rx-button").click();
  await page.waitForSelector(".mpx-modal", { timeout: 10000 });
  await page.waitForTimeout(700);
  out.darkModal = await page.evaluate(() => ({
    headBg: getComputedStyle(document.querySelector(".mpx-head"))
      .backgroundImage,
    itemBg: getComputedStyle(document.querySelector(".mpx-history-item"))
      .backgroundColor,
    activeTabBg: getComputedStyle(document.querySelector(".mpx-tab.is-active"))
      .backgroundImage,
  }));
  await page.locator(".mpx-modal").screenshot({ path: "shot-modal-dark.png" });
  await page
    .locator(".prescription-card")
    .screenshot({ path: "shot-card-dark.png" });
  return out;
}
