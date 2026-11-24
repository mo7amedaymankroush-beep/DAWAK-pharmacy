export default async function run(page, ui) {
  const snap = await ui.snapshot();
  const cta = snap.match(/@(e\d+) button "[^"]*تحديد الموقع"/);
  await ui.click("@" + cta[1]);
  await page.waitForTimeout(800);
  const snap2 = await ui.snapshot();
  const manual = snap2.match(/@(e\d+) button "[^"]*تحديد يدوي/);
  await ui.click("@" + manual[1]);
  await page.waitForTimeout(600);
  await page.selectOption(".loc-modal select >> nth=0", { index: 1 });
  await page.waitForTimeout(200);
  await page.selectOption(".loc-modal select >> nth=1", { index: 1 });
  await page.waitForTimeout(200);
  await page.selectOption(".loc-modal select >> nth=2", { index: 1 });
  await page.waitForTimeout(200);
  const snap3 = await ui.snapshot();
  const confirm = snap3.match(/@(e\d+) button "[^"]*تأكيد الموقع/);
  await ui.click("@" + confirm[1]);
  await page.waitForTimeout(700);

  return page.evaluate(() => {
    const info = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: cs.display,
        cols: cs.gridTemplateColumns,
        pad: cs.padding,
        minH: cs.minHeight,
        text: el.innerText.replace(/\s+/g, " ").trim().slice(0, 50),
      };
    };
    const modal = document.querySelector(".loc-modal");
    const content = document.querySelector(".reflective-card__content");
    return {
      card: info(".loc-card"),
      content: info(".reflective-card__content"),
      modal: {
        ...info(".loc-modal"),
        scrollH: modal.scrollHeight,
        clientH: modal.clientHeight,
      },
      body: info(".loc-body"),
      actions: info(".loc-actions"),
      btnPrimary: info(".loc-btn--primary"),
      saveClose: info(".loc-save-close"),
      delivery: info(".loc-delivery"),
      row: info(".loc-delivery-row"),
      skip: info(".loc-skip"),
      viewport: { w: innerWidth, h: innerHeight },
    };
  });
}
