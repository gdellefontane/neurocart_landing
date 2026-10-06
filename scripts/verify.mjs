import { chromium } from "playwright";
import { preview } from "vite";

const passed = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`FAIL ${name}`);
  passed.push(name);
};

const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch();
const url = "http://localhost:4173/";

try {
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
    await page.goto(url);
    const label = `${width}x${height}`;
    check(`${label} un solo h1`, (await page.locator("h1").count()) === 1);
    check(`${label} JSON-LD parsabile (3 blocchi)`, await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes.length === 3 && nodes.every((n) => JSON.parse(n.textContent))));
    await page.evaluate(() => scrollTo(0, 120));
    await page.waitForTimeout(300);
    check(`${label} nav scrolled dopo 120px`, await page.locator("#nav.scrolled").count() === 1);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    check(`${label} nav trasparente in cima`, await page.locator("#nav.scrolled").count() === 0);
    check(`${label} zero overflow orizzontale`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));

    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const phases = new Set();
    const presets = new Set();
    for (let y = 0; y < total; y += height / 3) {
      await page.evaluate((top) => scrollTo(0, top), y);
      await page.waitForTimeout(120);
      phases.add(await page.locator("#engine").getAttribute("data-phase"));
      presets.add(await page.locator("#chat").getAttribute("data-preset"));
    }
    await page.waitForTimeout(1500);
    const hidden = await page.$$eval("[data-reveal], [data-reveal-stagger] > *", (nodes) =>
      nodes.filter((n) => { const s = getComputedStyle(n); return s.opacity !== "1" || !["none", "blur(0px)"].includes(s.filter) || !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(s.transform); }).length);
    check(`${label} ogni reveal finisce a opacity 1, senza blur e a scala 1`, hidden === 0);
    check(`${label} le 4 fasi del motore si alternano`, ["1", "2", "3", "4"].every((p) => phases.has(p)));
    check(`${label} i 4 preset card ciclano`, presets.size === 4);
    check(`${label} overflow orizzontale zero a fine scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  }

  const reduced = await (await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } })).newPage();
  await reduced.goto(url);
  const dimmed = await reduced.$$eval("[data-reveal], [data-reveal-stagger] > *, [data-split]", (nodes) => nodes.filter((n) => getComputedStyle(n).opacity !== "1" || getComputedStyle(n).visibility === "hidden").length);
  check("reduced-motion: nessun elemento nascosto al load", dimmed === 0);
  check("reduced-motion: nessuna parola splittata", (await reduced.locator(".wi").count()) === 0);

  const page = await (await browser.newContext()).newPage();
  await page.route("**/waitlist", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.goto(url);
  await page.fill("#email", "test@example.com");
  await page.check("input[name=consent]");
  await page.click("form#accesso button[type=submit]");
  await page.waitForSelector("form#accesso.done");
  check("form waitlist: testo di successo", (await page.locator("form#accesso [role=status]").textContent()).startsWith("Grazie"));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  console.log(`${passed.length} controlli passati:\n- ${passed.join("\n- ")}`);
  await browser.close();
  await server.close();
}
