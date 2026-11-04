import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { preview } from "vite";

const graphNodes = [...readFileSync("src/graph.svg", "utf8").matchAll(/<circle cx="(\d+)" cy="(\d+)"/g)].map(([, x, y]) => [+x, +y]);

const passed = [];
const check = (name, condition) => {
  if (!condition) throw new Error(`FAIL ${name}`);
  passed.push(name);
};

const unrevealed = (nodes) => nodes.filter((n) => n.checkVisibility() && (getComputedStyle(n).opacity !== "1" || getComputedStyle(n).visibility === "hidden" || !["none", "blur(0px)"].includes(getComputedStyle(n).filter) || !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(getComputedStyle(n).transform))).length;
const navIsDarkGlass = () => {
  const style = getComputedStyle(document.querySelector("#nav"));
  const [r, g, b, a = 1] = style.backgroundColor.match(/[\d.]+/g).map(Number);
  return a >= 0.3 && a <= 0.8 && (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.1 && style.backdropFilter.includes("blur");
};
const sceneIsGlass = (selector) => {
  const scene = document.querySelector(selector);
  const alphas = [...getComputedStyle(scene).backgroundImage.matchAll(/rgba\(255, 255, 255, ([\d.]+)\)/g)].map((m) => +m[1]);
  const products = [...scene.querySelectorAll("img")].filter((img) => !img.closest(".ba"));
  return alphas.length > 0 && alphas.every((a) => a <= 0.2) && getComputedStyle(scene).backgroundColor === "rgba(0, 0, 0, 0)" && getComputedStyle(scene).backdropFilter.includes("blur") && products.length > 0 && products.every((img) => img.src.includes("/img/cut/"));
};
const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch();
const newPage = async (options) => {
  const context = await browser.newContext(options);
  await context.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  return context.newPage();
};
const keys = (code) => Object.keys(JSON.parse(readFileSync(`locales/${code}.json`, "utf8"))).filter((key) => !key.startsWith("seo.")).sort().join();
const seoKeys = (code, id) => Object.keys(JSON.parse(readFileSync(`locales/${code}.json`, "utf8"))).filter((key) => key.startsWith(`seo.${id}.`)).map((key) => key.split(".").slice(2).join(".")).sort().join();
const base = "https://www.neurocart.it";
const seoPages = [
  { path: "/chatbot-shopify/", code: "it", h1: /chatbot ai per shopify/i, pair: "/en/shopify-ai-chatbot/", links: ["/upsell-cross-sell-shopify/", "/#accesso"] },
  { path: "/en/shopify-ai-chatbot/", code: "en", h1: /ai chatbot for shopify/i, pair: "/chatbot-shopify/", links: ["/en/shopify-upsell-cross-sell/", "/en/#accesso"] },
  { path: "/upsell-cross-sell-shopify/", code: "it", h1: /upsell e cross-sell su shopify/i, pair: "/en/shopify-upsell-cross-sell/", links: ["/chatbot-shopify/", "/#accesso"] },
  { path: "/en/shopify-upsell-cross-sell/", code: "en", h1: /upsell and cross-sell for shopify/i, pair: "/upsell-cross-sell-shopify/", links: ["/en/shopify-ai-chatbot/", "/en/#accesso"] },
  { path: "/en/shopify-related-products/", code: "en", h1: /shopify related products/i, links: ["/en/shopify-upsell-cross-sell/", "/en/#accesso"] },
  { path: "/come-aumentare-scontrino-medio-shopify/", code: "it", h1: /come aumentare lo scontrino medio su shopify/i, guide: true, links: ["/upsell-cross-sell-shopify/", "/chatbot-shopify/", "/#accesso"] },
];
const langs = [
  { code: "it", path: "/", last: "vende.", canonical: "https://www.neurocart.it/", ok: "Grazie" },
  { code: "en", path: "/en/", last: "sells.", canonical: "https://www.neurocart.it/en/", ok: "Thank you" },
];

const states = { aperto: "2026-10-20T12:00:00+02:00", chiuso: "2026-10-26T00:00:00+01:00" };

try {
  check("it.json ed en.json hanno le stesse chiavi (le pagine in una sola lingua escluse)", keys("it") === keys("en") && ["chatbot", "upsell"].every((id) => seoKeys("it", id) === seoKeys("en", id) && seoKeys("it", id).length > 0));
  for (const { code, path, last, canonical, ok } of langs) {
    const url = `http://localhost:4173${path}`;
  for (const [width, height] of [[1280, 800], [1024, 768], [390, 844], [360, 780], [568, 320]]) {
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
    check(`${label} nav in vetro scuro semi-trasparente da scrollata`, await page.evaluate(navIsDarkGlass));
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    check(`${label} nav trasparente in cima`, await page.locator("#nav.scrolled").count() === 0);
    check(`${label} nav in vetro scuro semi-trasparente in cima`, await page.evaluate(navIsDarkGlass));
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
    const [slides, segments, counter] = [page.locator("#servizi .vs[aria-label]"), page.locator("#servizi .vsegs button"), page.locator("#servizi .vhint b")];
    check(`${label} vetrina: 11 slide, 11 segmenti, 11 Dettagli, un solo h2 e una sola slide attiva`, (await slides.count()) === 11 && (await segments.count()) === 11 && (await page.locator("#servizi .vcta").count()) === 11 && (await page.locator("#servizi h2").count()) === 1 && (await page.locator("#servizi .vs[data-on]").count()) === 1);
    check(`${label} vetrina: frecce visibili solo sopra 820px, segmenti >= 44px`, (await page.locator("#servizi .next").isVisible()) === (width > 820) && (await segments.evaluateAll((nodes) => nodes.every((n) => n.offsetHeight >= 44))));
    await segments.nth(5).click();
    await page.waitForTimeout(4600);
    check(`${label} vetrina: il click sul 6° segmento attiva la 6ª slide (contatore 06, solo lei non inerte)`, (await counter.textContent()) === "06" && (await slides.nth(5).getAttribute("data-on")) !== null && (await page.locator("#servizi .vs[inert]").count()) === 10 && (await segments.nth(5).getAttribute("aria-current")) === "true");
    check(`${label} vetrina: sfondo della slide attiva scuro e segmenti attivi non bianchi`, await page.evaluate(() => {
      const [r, g, b] = getComputedStyle(document.querySelector("#servizi .vs[data-on]")).backgroundColor.match(/\d+/g).map(Number);
      const fill = getComputedStyle(document.querySelector("#servizi .vsegs .run u"), "::after").backgroundColor;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.1 && fill !== "rgb(255, 255, 255)";
    }));
    check(`${label} vetrina: scena della slide attiva in vetro (mai chiara) e prodotti da /img/cut/`, await page.evaluate(sceneIsGlass, "#servizi .vs[data-on] .vscene"));
    if (width >= 360 && height >= 640) {
      check(`${label} vetrina: scena e "Dettagli" della slide attiva interamente dentro il pannello, scena non tagliata`, await page.evaluate(() => {
        const [panel, scene, cta] = ["#servizi", "#servizi .vs[data-on] .vscene", "#servizi .vs[data-on] .vcta"].map((s) => document.querySelector(s).getBoundingClientRect());
        const inside = (r) => r.left >= panel.left - 1 && r.right <= panel.right + 1 && r.top >= panel.top - 1 && r.bottom <= panel.bottom + 1;
        const el = document.querySelector("#servizi .vs[data-on] .vscene");
        return inside(scene) && inside(cta) && el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
      }));
    }
    await segments.nth(10).click();
    if (width > 820) {
      await page.locator("#servizi .next").click();
      await page.waitForTimeout(1500);
      check(`${label} vetrina: "avanti" dall'ultima slide torna alla prima (loop)`, (await counter.textContent()) === "01" && (await slides.nth(0).getAttribute("data-on")) !== null);
      await page.locator("#servizi .prev").click();
      await page.waitForTimeout(1500);
      check(`${label} vetrina: "indietro" dalla prima slide porta all'ultima`, (await counter.textContent()) === "11");
    }
    if (width === 1280) {
      await segments.nth(0).click();
      const box = await page.locator("#servizi").boundingBox();
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.5 - 200, box.y + box.height * 0.5, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(1500);
      check(`${label} vetrina: il trascinamento (> 40px) porta alla slide successiva`, (await counter.textContent()) === "02");
      await page.waitForTimeout(2200);
      const image = await page.locator("#servizi .vs[data-on] .vscene img").first().boundingBox();
      await page.mouse.move(image.x + image.width / 2, image.y + image.height / 2);
      await page.mouse.down();
      await page.mouse.move(image.x + image.width / 2 - 200, image.y + image.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(1500);
      check(`${label} vetrina: il trascinamento che parte da un'immagine della slide 2 porta alla 3`, (await counter.textContent()) === "03");
    }
    check(`${label} vetrina: nessun overflow orizzontale della pagina`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    check(`${label} #insights nella piattaforma e colonne Soluzioni/Risorse nel footer`, (await page.locator("#piattaforma #insights").count()) === 1 && (await page.locator("footer .footlinks a").count()) >= 8);
    check(`${label} rail motore: la barra di avanzamento ha larghezza > 0`, (await page.locator("#engine .fill").evaluate((n) => n.getBoundingClientRect().width)) > 0);
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

  const linker = await newPage();
  await linker.goto(url);
  const hrefs = await linker.$$eval("#servizi .vcta", (nodes) => nodes.map((a) => a.getAttribute("href")));
  const resolved = [];
  for (const href of hrefs) {
    const [path, hash] = href.split("#");
    await linker.goto(path ? `http://localhost:4173${path}` : url);
    resolved.push(!hash || (await linker.locator(`#${hash}`).count()) === 1);
  }
  check(`${code} vetrina: i 11 Dettagli puntano a pagine e ancore esistenti`, hrefs.length === 11 && resolved.every(Boolean) && hrefs.every((h) => h.startsWith("#") || h.startsWith(code === "en" ? "/en/" : "/")));
  check(`${code} vetrina: Dettagli verso chatbot, upsell e prodotti consigliati/umano come da piano`, JSON.stringify(hrefs.slice(0, 4)) === JSON.stringify(code === "it" ? ["/chatbot-shopify/", "/upsell-cross-sell-shopify/", "#consigli", "/chatbot-shopify/#operatore"] : ["/en/shopify-ai-chatbot/", "/en/shopify-upsell-cross-sell/", "/en/shopify-related-products/", "#umano"]) && hrefs[10] === "#insights");
  const auto = await newPage({ viewport: { width: 1280, height: 800 } });
  await auto.goto(url);
  await auto.addStyleTag({ content: "#servizi { --dur: 0.6s; }" });
  await auto.evaluate(() => scrollTo({ top: document.querySelector("#servizi").getBoundingClientRect().top + scrollY - 40, behavior: "instant" }));
  const count = () => auto.locator("#servizi .vhint b").textContent();
  await auto.waitForFunction(() => !document.querySelector("#servizi").classList.contains("hold"));
  const changed = (from) => auto.waitForFunction((value) => document.querySelector("#servizi .vhint b").textContent !== value, from, { timeout: 3000 }).then(() => true, () => false);
  check(`${code} autoplay: dopo l'intervallo passa alla slide successiva`, await changed(await count()));
  await auto.mouse.move(640, 400);
  check(`${code} autoplay: nessuna pausa al passaggio del mouse`, await changed(await count()));
  await auto.locator("#servizi .vsegs button").nth(10).click();
  check(`${code} autoplay: dopo l'11 torna alla 1 (loop)`, await auto.waitForFunction(() => document.querySelector("#servizi .vhint b").textContent === "01", null, { timeout: 3000 }).then(() => true, () => false));
  await auto.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await auto.waitForTimeout(500);
  const away = await count();
  await auto.waitForTimeout(1500);
  check(`${code} autoplay: con la vetrina fuori vista si ferma`, (await count()) === away);
  await auto.evaluate(() => scrollTo({ top: document.querySelector("#servizi").getBoundingClientRect().top + scrollY - 40, behavior: "instant" }));
  await auto.locator("#servizi .vsegs button").nth(0).click();
  await auto.mouse.move(5, 5);
  await auto.evaluate(() => document.activeElement.blur());
  for (let i = 0; i < 60 && !(await auto.evaluate(() => document.activeElement?.closest("#servizi"))); i++) await auto.keyboard.press("Tab");
  const focused = await count();
  await auto.waitForTimeout(1500);
  check(`${code} autoplay: con il focus da tastiera dentro la vetrina è in pausa`, (await auto.evaluate(() => document.querySelector("#servizi").classList.contains("hold"))) && (await count()) === focused);
  await auto.evaluate(() => document.activeElement.blur());
  check(`${code} autoplay: esce il focus e riparte`, await changed(focused));
  for (const [width, height] of [[1440, 900], [1280, 800], [390, 844], [360, 640]]) {
    const tour = await newPage({ reducedMotion: "reduce", viewport: { width, height } });
    await tour.goto(url);
    const bad = await tour.evaluate(async () => {
      const [panel, segs, bar] = [document.querySelector("#servizi"), [...document.querySelectorAll("#servizi .vsegs button")], document.querySelector("#servizi .vsegs")];
      const out = [];
      for (const [n, seg] of segs.entries()) {
        seg.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
        const [p, top] = [panel.getBoundingClientRect(), bar.getBoundingClientRect()];
        const slide = document.querySelector("#servizi .vs[data-on]");
        const [scene, cta, text, stage] = [".vscene", ".vcta", ".vtext", ".vstage"].map((s) => slide.querySelector(s).getBoundingClientRect());
        const el = slide.querySelector(".vscene");
        const inside = (r) => r.left >= p.left - 1 && r.right <= p.right + 1 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
        const kids = [...el.children];
        const empty = (el.getBoundingClientRect().bottom - Math.max(...kids.map((k) => k.getBoundingClientRect().bottom))) / el.getBoundingClientRect().height;
        if (innerWidth >= 1440 && empty > 0.2) out.push(`${n + 1}:vuoto ${Math.round(empty * 100)}%`);
        if (!(inside(scene) && inside(cta) && el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1 && text.top >= top.bottom - 1 && stage.top >= top.bottom - 1)) out.push(n + 1);
      }
      return out;
    });
    check(`${code} ${width}x${height} vetrina (reduced): scena e Dettagli dentro il pannello, scena non tagliata e testo sotto la barra in tutte le 11 slide (slide fuori: ${bad})`, bad.length === 0);
  }
  const reduced = await newPage({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  await reduced.goto(url);
  await reduced.locator("#servizi .vsegs button").nth(7).click();
  await reduced.waitForTimeout(100);
  check(`${code} reduced-motion: nessun autoplay né transizioni, resta navigabile`, (await reduced.locator("#servizi .vtrack").evaluate((n) => getComputedStyle(n).transitionDuration)) === "0s" && (await reduced.locator("#servizi .vhint b").textContent()) === "08" && (await (async () => { await reduced.waitForTimeout(6500); return reduced.locator("#servizi .vhint b").textContent(); })()) === "08");
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
  const sitemap = readFileSync("dist/sitemap.xml", "utf8");
  check("sitemap: home e le 6 nuove pagine, alternate hreflang solo per le coppie", ["/", "/en/", ...seoPages.map((p) => p.path)].every((path) => sitemap.includes(`<loc>${base}${path}</loc>`)) && (sitemap.match(/<xhtml:link/g) ?? []).length === 6 + 2 * 3 * 2 && (sitemap.match(/<loc>/g) ?? []).length === 8);
  for (const { path, code, h1, pair, guide, links } of seoPages) {
    for (const [width, height] of [[1280, 800], [390, 844], [360, 780]]) {
      const label = `${path} ${width}x${height}`;
      const page = await newPage({ viewport: { width, height } });
      const status = (await page.goto(`http://localhost:4173${path}`)).status();
      const html = await page.content();
      check(`${label} 200, nessuna chiave i18n o variabile env non risolta`, status === 200 && !/\{\{|%VITE_/.test(html));
      check(`${label} lang ${code} e un solo h1 con la ricerca principale`, (await page.getAttribute("html", "lang")) === code && (await page.locator("h1").count()) === 1 && h1.test((await page.locator("h1").textContent()).replace(/\s+/g, " ")));
      const [title, description] = [await page.title(), await page.getAttribute("meta[name=description]", "content")];
      check(`${label} title <= 60 e description <= 155 (${title.length}/${description.length})`, title.length <= 60 && description.length <= 155 && title.length > 20 && description.length > 80);
      check(`${label} canonical su se stessa`, (await page.getAttribute("link[rel=canonical]", "href")) === `${base}${path}` && (await page.getAttribute("meta[property='og:url']", "content")) === `${base}${path}`);
      const [itPath, enPath] = code === "it" ? [path, pair] : [pair, path];
      const alternates = await page.$$eval("link[rel=alternate][hreflang]", (nodes) => nodes.map((n) => `${n.hreflang}=${n.href}`).sort());
      check(`${label} hreflang ${pair ? "reciproci (it, en, x-default)" : "assenti"}`, JSON.stringify(alternates) === JSON.stringify(pair ? [`en=${base}${enPath}`, `it=${base}${itPath}`, `x-default=${base}${itPath}`] : []));
      const ld = await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes.map((n) => JSON.parse(n.textContent)["@type"]));
      check(`${label} JSON-LD leggibile (${ld.join(", ")})`, JSON.stringify(ld) === JSON.stringify(guide ? ["BreadcrumbList", "Article"] : ["BreadcrumbList", "FAQPage"]));
      check(`${label} zero overflow orizzontale`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
      check(`${label} nav in vetro scuro semi-trasparente`, await page.evaluate(navIsDarkGlass));
      if (!guide) check(`${label} scena dell'hero in vetro (mai chiara) e prodotti da /img/cut/`, await page.evaluate(sceneIsGlass, "#hero .vscene"));
      if (width === 390) {
        check(`${label} CTA e link interni raggiungibili`, (await Promise.all(links.map((href) => page.locator(`a[href="${href}"]`).count()))).every((n) => n > 0) && (await page.locator("footer .footlinks a").count()) >= 5);
        const targets = await page.$$eval("main a[href^='/'], header a[href^='/']", (nodes) => [...new Set(nodes.map((n) => n.getAttribute("href").split("#")[0]))]);
        const codes = await Promise.all(targets.map(async (target) => (await page.request.get(`http://localhost:4173${target}`)).status()));
        check(`${label} tutti i link interni (${targets.length}) esistono`, codes.every((status) => status === 200));
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < total; y += height / 3) {
          await page.evaluate((top) => scrollTo(0, top), y);
          await page.waitForTimeout(100);
        }
        await page.waitForTimeout(1500);
        check(`${label} reveal a opacity 1 e zero overflow a fine scroll`, (await page.$$eval("[data-reveal], [data-reveal-stagger] > *", unrevealed)) === 0 && (await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)));
        check(`${label} testo base >= 16px`, (await page.$eval("main .prose-p, main article p", (n) => parseFloat(getComputedStyle(n).fontSize))) >= 16);
        if (!guide) {
          const visible = await page.$$eval("details", (nodes) => nodes.map((d) => [d.querySelector("summary").textContent.trim(), d.querySelector("p").textContent.trim()]));
          const faq = await page.$$eval('script[type="application/ld+json"]', (nodes) => JSON.parse(nodes[1].textContent).mainEntity.map((q) => [q.name, q.acceptedAnswer.text]));
          check(`${label} JSON-LD FAQ coincide con il testo visibile (5 domande)`, visible.length === 5 && JSON.stringify(visible) === JSON.stringify(faq));
          check(`${label} "Scopri anche": 3 link, nessuno verso la pagina stessa`, (await page.$$eval("a.alsoc", (nodes) => nodes.map((n) => n.getAttribute("href")))).length === 3 && !(await page.locator(`a.alsoc[href="${path}"]`).count()));
          check(`${label} 3 passi, 6 blocchi, scena animata e switch lingua ${pair ? "presente" : "assente"}`, (await page.locator("#come li").count()) === 3 && (await page.locator("#cosa article").count()) === 6 && (await page.locator("#hero .vscene img").count()) > 0 && (await page.locator(`header a[hreflang]`).count()) === (pair ? 1 : 0));
        } else {
          check(`${label} guida: nessuna sezione "Scopri anche" (una sola sezione su Neurocart)`, (await page.locator("a.alsoc").count()) === 0);
          check(`${label} guida: 1.200-1.800 parole e link ai prodotti`, await page.$eval("article", (n) => { const words = n.textContent.trim().split(/\s+/).length; return words >= 1200 && words <= 1800; }));
        }
      }
      if (width === 1280) {
        const reduced = await newPage({ reducedMotion: "reduce", viewport: { width, height } });
        await reduced.goto(`http://localhost:4173${path}`);
        check(`${label} reduced-motion: nessun elemento nascosto al load e scena ferma`, (await reduced.$$eval("[data-reveal], [data-reveal-stagger] > *, [data-split]", unrevealed)) === 0 && (await reduced.evaluate(() => document.getAnimations().filter((a) => a instanceof CSSAnimation).length)) === 0);
      }
    }
  }
  const pilotUrl = "http://localhost:4173/pilota-black-friday/?utm_source=linkedin&utm_medium=dm&utm_campaign=pilota_bfcm";
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
    check(`condizioni ${width}x${height}: nav in vetro scuro`, await terms.evaluate(navIsDarkGlass));
    check(`condizioni ${width}x${height}: un solo h1, chiavi ed env risolte, 8 sezioni, zero overflow`, (await terms.locator("h1").count()) === 1 && !/\{\{|%VITE_/.test(await terms.content()) && (await terms.locator("main h2").count()) === 8 && (await terms.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)));
  }
  const consent = await newPage();
  await consent.goto("http://localhost:4173/pilota-black-friday/");
  check("pilota: il link delle condizioni nel consenso e nel footer punta alla pagina delle condizioni", (await consent.locator('a[href="/condizioni-pilota/"]').count()) === 2);
  await consent.goto("http://localhost:4173/condizioni-pilota/");
  check("condizioni: il footer riporta al programma pilota", (await consent.locator('footer a[href="/pilota-black-friday/"]').count()) === 1);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  console.log(`${passed.length} controlli passati:\n- ${passed.join("\n- ")}`);
  await browser.close();
  await server.close();
}
