export default async function run(page, ui) {
  const snap = await ui.snapshot();
  const cta = snap.match(/@(e\d+) button "[^"]*تحديد الموقع"/);
  await ui.click("@" + cta[1]);
  await page.waitForTimeout(800);
  const snap2 = await ui.snapshot();
  const manual = snap2.match(/@(e\d+) button "[^"]*تحديد يدوي/);
  await ui.click("@" + manual[1]);
  await page.waitForTimeout(600);

  // choose governorate then city via the native selects
  await page.selectOption(".loc-modal select >> nth=0", { index: 1 });
  await page.waitForTimeout(250);
  await page.selectOption(".loc-modal select >> nth=1", { index: 1 });
  await page.waitForTimeout(250);
  await page.selectOption(".loc-modal select >> nth=2", { index: 1 });
  await page.waitForTimeout(250);

  const snap3 = await ui.snapshot();
  const confirm = snap3.match(/@(e\d+) button "[^"]*تأكيد الموقع/);
  await ui.click("@" + confirm[1]);
  await page.waitForTimeout(700);

  const result = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".loc-delivery-row")].map((r) =>
      r.innerText.replace(/\s+/g, " ").trim(),
    );
    return {
      rows,
      pharmacy: document.querySelector(".loc-pharmacy-name")?.innerText,
      success: document.querySelector(".loc-success")?.innerText,
      cardH: Math.round(
        document.querySelector(".loc-card").getBoundingClientRect().height,
      ),
      overflow:
        document.querySelector(".loc-modal").scrollHeight >
        document.querySelector(".loc-modal").clientHeight + 2,
    };
  });
  await page.screenshot({ path: "shot-result.png" });
  return result;
}
