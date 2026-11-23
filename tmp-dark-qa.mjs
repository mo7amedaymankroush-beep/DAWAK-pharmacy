export default async function run(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.waitForSelector(".theme-ink-btn", { timeout: 20000 });
  await page.waitForTimeout(600);

  // switch to dark via the ink transition
  await page.click(".theme-ink-btn");
  await page.waitForTimeout(1200);

  const tokens = await page.evaluate(() => {
    const cs = (sel) => getComputedStyle(document.querySelector(sel));
    const body = cs("body");
    const navbar = cs(".navbar");
    return {
      theme: document.documentElement.getAttribute("data-theme"),
      bodyBg: body.backgroundColor,
      bodyColor: body.color,
      navbarBg: navbar.backgroundColor,
      navbarBorder: navbar.borderBottomColor,
      backdrop: navbar.backdropFilter || navbar.webkitBackdropFilter,
      brandName: cs(".navbar .brand-name strong").color,
      activeLink: (() => {
        const a = document.querySelector(".nav-links a.active");
        return a ? getComputedStyle(a).color : "n/a";
      })(),
      cartBtn: cs(".navbar .cart-button").backgroundColor,
      cartBtnText: cs(".navbar .cart-button").color,
      addBtn: (() => {
        const b = document.querySelector(".product-add-button, .add-button");
        return b
          ? [getComputedStyle(b).backgroundColor, getComputedStyle(b).color]
          : "not-on-home";
      })(),
      footer: (() => {
        const f = document.querySelector(".dawak-footer");
        if (!f) return "n/a";
        const s = getComputedStyle(f);
        return {
          bg: s.backgroundColor,
          borderTop: s.borderTopColor,
          h2: getComputedStyle(f.querySelector("h2") || f).color,
        };
      })(),
    };
  });

  await page.screenshot({
    path: "e:/MY PRO VS code/DAWAK-pharmacy/tmp-dark-home.png",
  });

  // scroll to footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({
    path: "e:/MY PRO VS code/DAWAK-pharmacy/tmp-dark-footer.png",
  });

  // chatbot in dark
  await page.click(".chatbot-launcher");
  await page.waitForTimeout(900);
  const chat = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector(".chatbot-panel"));
    const hdr = getComputedStyle(document.querySelector(".chatbot-header"));
    return {
      panel: s.backgroundColor,
      header: hdr.backgroundColor,
      bd: hdr.borderBottomColor,
    };
  });
  await page.screenshot({
    path: "e:/MY PRO VS code/DAWAK-pharmacy/tmp-dark-chat.png",
  });

  // light mode unchanged check
  await page.click(".theme-ink-btn");
  await page.waitForTimeout(1200);
  const light = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    navbar: getComputedStyle(document.querySelector(".navbar")).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor,
  }));

  return { tokens, chat, light, errors };
}
