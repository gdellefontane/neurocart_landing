import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { preview } from "vite";

const graphNodes = [...readFileSync("src/graph.svg", "utf8").matchAll(/<circle cx="(\d+)" cy="(\d+)"/g)].map(([, x, y]) => [+x, +y]);

const passed = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`FAIL ${name}`);
  passed.push(name);
};

const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch();
const url = "http://localhost:4173/";

try {
  for (const [width, height] of [[1280, 800], [390, 844], [568, 320]]) {
    const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
    await page.goto(url);
    const label = `${width}x${height}`;
    check(`${label} un solo h1`, (await page.locator("h1").count()) === 1);
    check(`${label} JSON-LD parsabile (3 blocchi)`, await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes.length === 3 && nodes.every((n) => JSON.parse(n.textContent))));
    const title = await page.evaluate((nodes) => {
      const box = document.querySelector(".hero-graph").getBoundingClientRect();
      const scale = Math.min(box.width / 800, box.height / 600);
      const wordEls = [...document.querySelectorAll("h1 .w")];
      const rects = wordEls.map((w) => w.getBoundingClientRect());
      const hits = nodes.filter(([x, y]) => {
        const [px, py] = [box.right - (800 - x) * scale, box.top + y * scale];
        return rects.some((r) => px > r.left - 8 && px < r.right + 8 && py > r.top - 8 && py < r.bottom + 8);
      });
      const clipped = wordEls.filter((w) => w.scrollWidth > w.clientWidth + 2);
      return { words: wordEls.length, hits: hits.length, clipped: clipped.length, text: document.querySelector("h1").textContent };
    }, graphNodes);
    check(`${label} h1 splittata, nessun nodo del grafo sopra`, title.words > 0 && title.hits === 0);
    check(`${label} h1 contiene "vende." e nessuna parola clippata`, title.text.includes("vende.") && title.clipped === 0);
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
      phases.add(await page.evaluate(() => [...document.querySelectorAll("#engine ol li")].findIndex((li) => li.ariaCurrent === "step") + 1));
      presets.add(await page.locator("#chat").getAttribute("data-preset"));
    }
    await page.waitForTimeout(1500);
    const hidden = await page.$$eval("[data-reveal], [data-reveal-stagger] > *", (nodes) =>
      nodes.filter((n) => { const s = getComputedStyle(n); return s.opacity !== "1" || !["none", "blur(0px)"].includes(s.filter) || !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(s.transform); }).length);
    check(`${label} ogni reveal finisce a opacity 1, senza blur e a scala 1`, hidden === 0);
    check(`${label} le 4 fasi del motore si alternano`, [1, 2, 3, 4].every((p) => phases.has(p)));
    check(`${label} #consigli con 7 tile`, (await page.locator("#consigli article.card").count()) === 7);
    check(`${label} rail motore: 4 voci, una sola aria-current`, (await page.locator("#engine ol li").count()) === 4 && (await page.locator("#engine ol li[aria-current]").count()) === 1);
    check(`${label} nessun prezzo per chat in pagina`, !(await page.content()).includes("0,50"));
    check(`${label} i 4 preset card ciclano`, presets.size === 4);
    check(`${label} overflow orizzontale zero a fine scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  }

  const faq = await (await browser.newContext()).newPage();
  await faq.goto(url);
  const visible = await faq.$$eval("details", (nodes) => nodes.map((d) => [d.querySelector("summary").textContent.trim(), d.querySelector("p").textContent.trim()]));
  const ld = await faq.$$eval('script[type="application/ld+json"]', (nodes) => JSON.parse(nodes[2].textContent).mainEntity.map((q) => [q.name, q.acceptedAnswer.text]));
  check("JSON-LD FAQ coincide con il testo visibile", JSON.stringify(visible) === JSON.stringify(ld));

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
