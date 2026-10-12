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
const newPage = async (options) => {
  const context = await browser.newContext(options);
  await context.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  return context.newPage();
};
const keys = (code) => Object.keys(JSON.parse(readFileSync(`locales/${code}.json`, "utf8"))).sort().join();
const langs = [
  { code: "it", path: "/", last: "vende.", canonical: "https://www.neurocart.it/", ok: "Grazie" },
  { code: "en", path: "/en/", last: "sells.", canonical: "https://www.neurocart.it/en/", ok: "Thank you" },
];

const states = { aperto: "2026-10-20T12:00:00+02:00", chiuso: "2026-10-26T00:00:00+01:00" };

try {
  check("it.json ed en.json hanno le stesse chiavi", keys("it") === keys("en"));
  for (const { code, path, last, canonical, ok } of langs) {
    const url = `http://localhost:4173${path}`;
  for (const [width, height] of [[1280, 800], [390, 844], [568, 320]]) {
    const page = await newPage({ viewport: { width, height } });
    await page.goto(url);
    const label = `${code} ${width}x${height}`;
    check(`${label} lang, canonical e 3 hreflang`, (await page.getAttribute("html", "lang")) === code && (await page.getAttribute("link[rel=canonical]", "href")) === canonical && (await page.locator("link[rel=alternate][hreflang]").count()) === 3);
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
    check(`${label} h1 termina con "${last}" e nessuna parola clippata`, title.text.trim().endsWith(last) && title.clipped === 0);
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
    const tabs = page.locator("#consigli [role=tab]");
    check(`${label} #consigli: 7 tab, uno solo selezionato`, (await tabs.count()) === 7 && (await page.locator('#consigli [aria-selected="true"]').count()) === 1);
    await tabs.nth(4).click();
    await page.waitForTimeout(700);
    const shown = width >= 768 ? tabs.nth(4).locator(".tabtext") : page.locator("#consigli .explain");
    check(`${label} click sul 5° tab: scena cart e spiegazione visibile`, (await page.locator("#consigli .stage").getAttribute("data-scene")) === "cart" && (await shown.isVisible()) && (await shown.textContent()).trim().length > 0 && (await page.getAttribute("#consigli-panel", "aria-labelledby")) === "tab-cart" && (await page.locator("#consigli [role=tablist] [role=tabpanel]").count()) === 0);
    check(`${label} rail motore: 4 voci, una sola aria-current`, (await page.locator("#engine ol li").count()) === 4 && (await page.locator("#engine ol li[aria-current]").count()) === 1);
    check(`${label} nessun prezzo per chat in pagina`, !/0[,.]50/.test(await page.content()));
    check(`${label} i 4 preset card ciclano`, presets.size === 4);
    check(`${label} overflow orizzontale zero a fine scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  }

  const faq = await newPage();
  await faq.goto(url);
  const visible = await faq.$$eval("details", (nodes) => nodes.map((d) => [d.querySelector("summary").textContent.trim(), d.querySelector("p").textContent.trim()]));
  const ld = await faq.$$eval('script[type="application/ld+json"]', (nodes) => JSON.parse(nodes[2].textContent).mainEntity.map((q) => [q.name, q.acceptedAnswer.text]));
  check(`${code} JSON-LD FAQ coincide con il testo visibile`, JSON.stringify(visible) === JSON.stringify(ld));

  const reduced = await newPage({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  await reduced.goto(url);
  const dimmed = await reduced.$$eval("[data-reveal], [data-reveal-stagger] > *, [data-split]", (nodes) => nodes.filter((n) => getComputedStyle(n).opacity !== "1" || getComputedStyle(n).visibility === "hidden").length);
  check(`${code} reduced-motion: nessun elemento nascosto al load`, dimmed === 0);
  await reduced.evaluate(() => document.querySelector("#consigli").scrollIntoView());
  await reduced.waitForTimeout(6000);
  check(`${code} reduced-motion: nessun autoplay nei consigli`, (await reduced.locator("#consigli [role=tab]").first().getAttribute("aria-selected")) === "true");
  check(`${code} reduced-motion: nessuna parola splittata`, (await reduced.locator(".wi").count()) === 0);

  for (const [state, date] of Object.entries(states)) {
    const dated = await newPage();
    await dated.clock.setFixedTime(new Date(date));
    await dated.goto(url);
    check(`${code} fascia pilota ${state === "aperto" && code === "it" ? "visibile" : "assente"} con orologio ${state}`, (await dated.locator(".band").isVisible()) === (state === "aperto" && code === "it"));
  }

  const page = await newPage();
  let homeSent;
  await page.route("**/waitlist", (route) => {
    homeSent = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.goto(url);
  await page.fill("#email", "test@example.com");
  await page.fill("#shopDomain", "demo.myshopify.com");
  await page.selectOption("#productRange", "100_500");
  await page.check("input[name=consent]");
  await page.$eval("#accesso .cf-turnstile", (n) => n.insertAdjacentHTML("beforeend", '<input type="hidden" name="cf-turnstile-response" value="tok">'));
  await page.click("form#accesso button[type=submit]");
  await page.waitForSelector("form#accesso.done");
  check(`${code} form waitlist: testo di successo`, (await page.locator("form#accesso [role=status]").textContent()).startsWith(ok));
  check(`${code} form waitlist: il token Turnstile va in turnstileToken, non nel body`, homeSent.turnstileToken === "tok" && !("cf-turnstile-response" in homeSent));
  }
  const pilotUrl = "http://localhost:4173/pilota-black-friday/?utm_source=linkedin&utm_medium=dm&utm_campaign=pilota_bfcm";
  const unrevealed = (nodes) => nodes.filter((n) => n.checkVisibility() && (getComputedStyle(n).opacity !== "1" || getComputedStyle(n).visibility === "hidden" || !["none", "blur(0px)"].includes(getComputedStyle(n).filter) || !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(getComputedStyle(n).transform))).length;
  for (const [state, date] of Object.entries(states)) {
    const open = state === "aperto";
    for (const [width, height] of [[1280, 800], [390, 844]]) {
      const label = `pilota ${state} ${width}x${height}`;
      const page = await newPage({ viewport: { width, height } });
      let sent;
      await page.route("**/waitlist", (route) => {
        sent = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      });
      await page.clock.setFixedTime(new Date(date));
      await page.goto(pilotUrl);
      const html = await page.content();
      check(`${label} nessuna chiave i18n o variabile env non risolta`, !html.includes("{{") && !html.includes("%VITE_"));
      const h1 = page.locator("h1:visible");
      check(`${label} un solo h1 visibile, col testo dello stato`, (await h1.count()) === 1 && (await h1.textContent()).replace(/\s+/g, " ").trim() === (open ? "Il tuo Black Friday, con i consigli AI." : "Le candidature al pilota sono chiuse."));
      const [shownOpen, shownClosed] = await Promise.all([page.locator("[data-open]:visible").count(), page.locator("[data-closed]:visible").count()]);
      check(`${label} elementi di stato: ${open ? "solo data-open" : "solo data-closed"} visibili`, open ? shownOpen > 0 && shownClosed === 0 : shownOpen === 0 && shownClosed > 0);
      check(`${label} fieldset: #productRange ${open ? "abilitato" : "disabilitato"}, #email abilitato`, (await page.locator("#productRange").isDisabled()) === !open && (await page.locator("#email").isEnabled()));
      check(`${label} form#candidatura e Turnstile presenti`, (await page.locator("form#candidatura").count()) === 1 && (await page.locator("form#candidatura .cf-turnstile").count()) === 1);
      check(`${label} nessuno script di terze parti oltre Turnstile`, await page.$$eval("script[src]", (nodes) => nodes.every((n) => new URL(n.src).origin === location.origin || n.src.startsWith("https://challenges.cloudflare.com/"))));
      if (open) {
        check(`${label} timeline: 5 tappe, un solo elemento arancio (la tappa Black Friday)`, (await page.locator(".timeline li").count()) === 5 && (await page.$$eval(".timeline, .timeline *", (nodes) => nodes.filter((n) => [getComputedStyle(n).backgroundColor, getComputedStyle(n).color].includes("rgb(255, 131, 0)")).length)) === 1);
        check(`${label} contatore: nascosto con data-seats vuoto, visibile con un valore`, await (async () => {
          await page.$$eval(".seats", (nodes) => nodes.forEach((n) => (n.dataset.seats = "")));
          const empty = await page.locator(".seats:visible").count();
          await page.$$eval(".seats", (nodes) => nodes.forEach((n) => (n.dataset.seats = "3")));
          return empty === 0 && (await page.locator(".seats:visible").count()) === 2;
        })());
        await page.fill("#phone", "abc");
        await page.fill("#shopUrl", "mionegozio");
        check(`${label} telefono "abc" e URL senza punto sono invalidi`, await page.$$eval("#phone, #shopUrl", (els) => els.every((el) => !el.checkValidity())));
        check(`${label} hint "Meno di 100" visibile solo con quella scelta`, await (async () => {
          const before = await page.locator(".hint").isVisible();
          await page.selectOption("#productRange", "lte_100");
          return !before && (await page.locator(".hint").isVisible());
        })());
      }
      if (!open) {
        await page.$$eval(".seats", (nodes) => nodes.forEach((n) => (n.dataset.seats = "3")));
        check(`${label} contatore resta nascosto anche con un valore`, (await page.locator(".seats:visible").count()) === 0);
      }
      check(`${label} zero overflow orizzontale in cima`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += height / 3) {
        await page.evaluate((top) => scrollTo(0, top), y);
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(1500);
      check(`${label} ogni reveal visibile finisce a opacity 1, senza blur e a scala 1`, (await page.$$eval("[data-reveal], [data-reveal-stagger] > *", unrevealed)) === 0);
      check(`${label} zero overflow orizzontale a fine scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
      if (open) {
        await page.fill("#fullName", "Mario Rossi");
        await page.selectOption("#role", "owner");
        await page.fill("#phone", "+39 333 1234567");
        await page.fill("#shopUrl", "www.demo-shop.it");
        await page.selectOption("#productRange", "100_500");
        await page.selectOption("#ordersRange", "500_2000");
        await page.selectOption("#sector", "fashion");
        await page.check("input[name=pilotTerms]");
      }
      await page.fill("#email", "test@example.com");
      await page.check("input[name=consent]");
      check(`${label} il link LinkedIn compare solo dopo l'invio`, !(await page.locator("[data-done]").isVisible()));
      await page.$eval("#candidatura .cf-turnstile", (n) => n.insertAdjacentHTML("beforeend", '<input type="hidden" name="cf-turnstile-response" value="tok">'));
      await page.click("form#candidatura button[type=submit]");
      await page.waitForSelector("form#candidatura.done");
      const status = await page.locator("form#candidatura [role=status]").textContent();
      check(`${label} invio: status e link LinkedIn`, status.startsWith(open ? "Candidatura ricevuta" : "Grazie. Ti scriviamo al lancio") && (await page.locator("[data-done]").isVisible()));
      const required = ["fullName", "role", "phone", "shopUrl", "productRange", "ordersRange", "sector", "utmSource", "utmCampaign"];
      check(`${label} payload`, open
        ? sent.source === "pilot" && sent.pilotTerms === true && sent.marketing === false && sent.utmMedium === "dm" && sent.consent === true && required.every((k) => sent[k]) && !("agencyShops" in sent) && sent.turnstileToken === "tok" && !("cf-turnstile-response" in sent)
        : sent.source === "launch" && sent.email === "test@example.com" && sent.consent === true && !("fullName" in sent) && sent.turnstileToken === "tok" && !("cf-turnstile-response" in sent));
    }

    const narrow = await newPage({ viewport: { width: 360, height: 780 } });
    await narrow.clock.setFixedTime(new Date(date));
    await narrow.goto(open ? pilotUrl.replace("utm_medium=dm", "utm_medium=d%20m") : pilotUrl);
    if (open) check("pilota aperto: UTM malformato (utm_medium=d%20m) scartato dagli hidden", (await narrow.$eval("[name=utmMedium]", (el) => el.value)) === "" && (await narrow.$eval("[name=utmSource]", (el) => el.value)) === "linkedin");
    const overflows = () => narrow.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const top = await overflows();
    await narrow.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    check(`pilota ${state} 360x780 zero overflow orizzontale (header compreso)`, !top && !(await overflows()));

    const reduced = await newPage({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    await reduced.clock.setFixedTime(new Date(date));
    await reduced.goto(pilotUrl);
    check(`pilota ${state} reduced-motion: nessun elemento visibile nascosto al load`, (await reduced.$$eval("[data-reveal], [data-reveal-stagger] > *, [data-split]", unrevealed)) === 0 && (await reduced.locator(".wi").count()) === 0);
  }

  for (const [width, height] of [[1280, 800], [390, 844]]) {
    const terms = await newPage({ viewport: { width, height } });
    await terms.goto("http://localhost:4173/condizioni-pilota/");
    check(`condizioni ${width}x${height}: un solo h1, chiavi ed env risolte, 8 sezioni, zero overflow`, (await terms.locator("h1").count()) === 1 && !/\{\{|%VITE_/.test(await terms.content()) && (await terms.locator("main h2").count()) === 8 && (await terms.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)));
  }
  const consent = await newPage();
  await consent.goto("http://localhost:4173/pilota-black-friday/");
  check("pilota: il link delle condizioni nel consenso e nel footer punta alla pagina delle condizioni", (await consent.locator('a[href="/condizioni-pilota/"]').count()) === 2);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  console.log(`${passed.length} controlli passati:\n- ${passed.join("\n- ")}`);
  await browser.close();
  await server.close();
}
