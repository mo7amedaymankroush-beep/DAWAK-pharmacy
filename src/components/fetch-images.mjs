import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const DRUGS_FILE = path.resolve("src/data/drugs.js");
const OUT_DIR = path.resolve("public/images/clean");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const raw = fs.readFileSync(DRUGS_FILE, "utf8");
const items = [];
const regex = /\{\s*id:\s*(\d+)[\s\S]*?name:\s*"([^"]+)"[\s\S]*?brand:\s*"([^"]+)"/g;
let match;
while ((match = regex.exec(raw)) !== null) {
  items.push({ id: match.at(1), name: match.at(2), brand: match.at(3) });
}

console.log(`جاري إكمال جلب الصور الحقيقية لـ ${items.length} منتج...\n`);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
});

for (const item of items) {
  const filePath = path.join(OUT_DIR, `${item.id}.jpg`);
  if (fs.existsSync(filePath)) {
    console.log(`[تخطي] #${item.id} (${item.name})`);
    continue;
  }

  const query = `${item.name} ${item.brand} صيدلية`;
  process.stdout.write(`#${item.id} ${item.name}... `);

  try {
    const base = ["https://bing.com", "images", "search"].join("/");
    const searchUrl = base + "?q=" + encodeURIComponent(query) + "&form=HDRSC2";

    await page.goto(searchUrl, {
      waitUntil: "commit",
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    const imgUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a.iusc"));
      for (const a of links) {
        try {
          const meta = JSON.parse(a.getAttribute("m") || "{}");
          if (meta.murl && /\.(jpg|jpeg|png|webp)/i.test(meta.murl)) {
            return meta.murl;
          }
        } catch {}
      }
      return null;
    });

    if (!imgUrl) {
      console.log("❌ لم يتم العثور على صورة");
      continue;
    }

    const res = await fetch(imgUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 3000) throw new Error("ملف صغير");

    fs.writeFileSync(filePath, buffer);
    console.log("✅ تم التحميل");
  } catch (err) {
    console.log(`❌ فشل (${err.message})`);
  }
}

await browser.close();
console.log("\nانتهى التحميل بالكامل! حدّث صفحة المتصفح لمشاهدة الصور.");
