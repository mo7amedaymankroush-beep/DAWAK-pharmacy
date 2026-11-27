export default async function run(page) {
  const add = await page
    .locator(".hero-cards")
    .getByRole("button")
    .allInnerTexts();
  const buttons = await page.locator("button").allInnerTexts();
  return { buttons: buttons.slice(0, 40), hero: add };
}
