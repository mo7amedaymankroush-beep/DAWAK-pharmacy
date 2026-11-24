export default async function run(page, ui) {
  const banner = page.locator(".ad-banner");
  await banner.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await banner.screenshot({
    path: "e:/MY PRO VS code/DAWAK-pharmacy/.qa-ad-only.png",
  });
  const box = await banner.boundingBox();
  const title = await page.locator(".ad-banner-title").innerText();
  const text = await page.locator(".ad-banner-text").innerText();
  const flex = await banner.evaluate((el) => getComputedStyle(el).display);
  const pad = await banner.evaluate((el) => getComputedStyle(el).padding);
  // افتح النافذة للتحقق
  await page.getByRole("button", { name: "أعلن الآن" }).click();
  await page.waitForTimeout(400);
  const modalFields = await page
    .locator(".ad-modal .ad-form input, .ad-modal .ad-form select")
    .count();
  await page
    .locator(".ad-modal")
    .screenshot({ path: "e:/MY PRO VS code/DAWAK-pharmacy/.qa-ad-modal.png" });
  return { box, title, text, flex, pad, modalFields };
}
