export default async function run(page) {
  const res = await page.evaluate(() => ({
    hasWin: typeof window.showToast,
    shell: !!document.querySelector(".app-shell"),
    toastCard: !!document.querySelector(".toast-card"),
    rootKeys: Object.keys(document.getElementById("root") || {}).slice(0, 8),
  }));
  return res;
}
