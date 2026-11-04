import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { preview } from "vite";

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
const sceneFit = () => {
  const nav = document.querySelector("#nav").getBoundingClientRect();
  const scene = document.querySelector("section.scene.on");
  const bad = [...scene.querySelectorAll("*")].filter((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.closest("svg") && el.tagName !== "svg" || el.closest(".cf-turnstile") || (el.closest("details:not([open])") && !el.closest("summary") && el.tagName !== "DETAILS")) return false;
    return r.bottom > innerHeight + 1 || r.top < nav.bottom - 1 || r.left < -1 || r.right > innerWidth + 1;
  });
  const cut = [...scene.querySelectorAll(".body, .pc, .win")].filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
  const wins = [...scene.querySelectorAll(".win")].filter((win) => win.getClientRects().length);
  const overlap = wins.flatMap((win) => [...scene.children].filter((c) => c !== win && !c.contains(win) && !win.contains(c) && c.getClientRects().length && c.className !== "foot").flatMap((c) => [...c.querySelectorAll("h1, h2, .lbl, .how, .more, .lead")].filter((t) => { const a = win.getBoundingClientRect(); const b = t.getBoundingClientRect(); return a.left < b.right && b.left < a.right && a.top < b.bottom - 1 && b.top < a.bottom - 1; })));
  const foot = scene.querySelector(".foot");
  const onFoot = foot ? [...scene.querySelectorAll("h1, h2, p, li, button, input, select, label, summary, .b, .cf-turnstile")].filter((el) => !el.closest(".foot") && el.getClientRects().length && !el.closest("details:not([open])") && (() => { const a = foot.getBoundingClientRect(); const b = el.getBoundingClientRect(); return b.width && a.left < b.right && b.left < a.right && a.top < b.bottom - 1 && b.top < a.bottom - 1; })()) : [];
  const chatCut = [...scene.querySelectorAll(".chatb")].filter((body) => [...body.children].some((c) => c.getClientRects().length && c.getBoundingClientRect().top < body.getBoundingClientRect().top - 1));
  return [...bad, ...cut, ...overlap, ...onFoot, ...chatCut].map((el) => `${el.tagName}.${el.className}`).slice(0, 4).join(" | ");
};
const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch();
const newPage = async (options) => {
  const context = await browser.newContext(options);
  await context.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: `document.querySelectorAll(".cf-turnstile").forEach((n) => n.insertAdjacentHTML("afterbegin", '<div style="width:300px;height:65px"></div>'));` }));
  return context.newPage();
};
const closeAll = () => Promise.all(browser.contexts().map((context) => context.close()));
const keys = (code) => Object.keys(JSON.parse(readFileSync(`locales/${code}.json`, "utf8"))).filter((key) => !key.startsWith("seo.")).sort().join();
const base = "https://www.neurocart.it";
const pages = [
  { path: "/", code: "it", scenes: 14, h1: /l'ai che vende/i, pair: "/en/", ld: ["Organization", "SoftwareApplication", "FAQPage"] },
  { path: "/en/", code: "en", scenes: 14, h1: /the ai that sells/i, pair: "/", ld: ["Organization", "SoftwareApplication", "FAQPage"] },
  { path: "/prezzi/", code: "it", scenes: 7, h1: /un prezzo chiaro/i, pair: "/en/pricing/" },
  { path: "/en/pricing/", code: "en", scenes: 7, h1: /clear pricing/i, pair: "/prezzi/" },
  { path: "/chatbot-shopify/", code: "it", scenes: 7, h1: /chatbot ai per shopify/i, pair: "/en/shopify-ai-chatbot/" },
  { path: "/en/shopify-ai-chatbot/", code: "en", scenes: 7, h1: /ai chatbot for shopify/i, pair: "/chatbot-shopify/" },
  { path: "/upsell-cross-sell-shopify/", code: "it", scenes: 7, h1: /upsell e cross-sell su shopify/i, pair: "/en/shopify-upsell-cross-sell/" },
  { path: "/en/shopify-upsell-cross-sell/", code: "en", scenes: 7, h1: /upsell and cross-sell for shopify/i, pair: "/upsell-cross-sell-shopify/" },
  { path: "/en/shopify-related-products/", code: "en", scenes: 7, h1: /shopify related products/i },
  { path: "/contenuti-ai-shopify/", code: "it", scenes: 7, h1: /descrizioni prodotto con ai per shopify/i, pair: "/en/shopify-ai-product-content/" },
  { path: "/en/shopify-ai-product-content/", code: "en", scenes: 7, h1: /ai product images and descriptions for shopify/i, pair: "/contenuti-ai-shopify/" },
  { path: "/insights-shopify/", code: "it", scenes: 7, h1: /report del tuo negozio shopify/i, pair: "/en/shopify-ai-insights/" },
  { path: "/en/shopify-ai-insights/", code: "en", scenes: 7, h1: /shopify store's report/i, pair: "/insights-shopify/" },
  { path: "/come-aumentare-scontrino-medio-shopify/", code: "it", scenes: 14, h1: /come aumentare lo scontrino medio su shopify/i, guide: true },
];
const viewports = [[1440, 900], [1280, 800], [1024, 768], [412, 839], [390, 844], [390, 664], [360, 640]];
const states = { aperto: "2026-10-20T12:00:00+02:00", chiuso: "2026-10-26T00:00:00+01:00" };

try {
  check("it.json ed en.json hanno le stesse chiavi (le pagine in una sola lingua escluse)", keys("it") === keys("en"));
  const sitemap = readFileSync("dist/sitemap.xml", "utf8");
  check("sitemap: tutte le pagine elencate, hreflang solo per le coppie", pages.every((p) => sitemap.includes(`<loc>${base}${p.path}</loc>`)) && (sitemap.match(/<loc>/g) ?? []).length === pages.length && (sitemap.match(/<xhtml:link/g) ?? []).length === 3 * pages.filter((p) => p.pair).length);
  for (const { path, code, scenes, h1, pair, ld, guide } of pages) {
    const url = `http://localhost:4173${path}`;
    const home = path === "/" || path === "/en/";
    const page = await newPage();
    const status = (await page.goto(url)).status();
    const html = await page.content();
    check(`${path} 200, nessuna chiave i18n o variabile env non risolta`, status === 200 && !/\{\{|%VITE_/.test(html));
    check(`${path} lang ${code}, un solo h1 con la ricerca principale, un h2 per scena (tranne la prima)`, (await page.getAttribute("html", "lang")) === code && (await page.locator("h1").count()) === 1 && h1.test((await page.locator("h1").textContent()).replace(/\s+/g, " ")) && (await page.$$eval("section.scene", (nodes) => nodes.slice(1).every((n) => n.querySelectorAll("h2").length === 1))));
    const [title, description] = [await page.title(), await page.getAttribute("meta[name=description]", "content")];
    check(`${path} title <= 60 e description <= 155 (${title.length}/${description.length})`, title.length <= 60 && description.length <= 155 && title.length > 20 && description.length > 80);
    check(`${path} canonical su se stessa, hreflang ${pair ? "reciproci" : "assenti"}`, (await page.getAttribute("link[rel=canonical]", "href")) === `${base}${path}` && (await page.locator("link[rel=alternate][hreflang]").count()) === (pair ? 3 : 0) && (!pair || (await page.getAttribute("header a[hreflang]", "href")) === pair));
    const types = await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes.map((n) => JSON.parse(n.textContent)["@type"]));
    check(`${path} JSON-LD leggibile (${types.join(", ")})`, JSON.stringify(types) === JSON.stringify(ld ?? (guide ? ["BreadcrumbList", "Article"] : ["BreadcrumbList", "FAQPage"])));
    if (!guide) {
      const visible = await page.$$eval("details", (nodes) => nodes.map((d) => [d.querySelector("summary").textContent.trim(), d.querySelector("p").textContent.trim()]));
      const faq = await page.$$eval('script[type="application/ld+json"]', (nodes) => JSON.parse(nodes.at(-1).textContent).mainEntity.map((q) => [q.name, q.acceptedAnswer.text]));
      check(`${path} JSON-LD FAQ coincide con il testo visibile`, home ? JSON.stringify(visible) === JSON.stringify(faq) : JSON.stringify(visible.slice(-faq.length)) === JSON.stringify(faq));
    } else {
      check(`${path} guida: 1.200-1.800 parole nelle scene e link ai prodotti`, await page.$$eval(".guide", (nodes) => { const words = nodes.map((n) => n.textContent).join(" ").trim().split(/\s+/).length; return words >= 1200 && words <= 1800; }) && (await page.locator('.guide a[href="/upsell-cross-sell-shopify/"], .guide a[href="/chatbot-shopify/"]').count()) >= 2);
    }
    check(`${path} nessun prezzo per chat in pagina`, !/0[,.]50/.test(html));
    const hrefs = await page.$$eval("a[href^='/']", (nodes) => [...new Set(nodes.map((n) => n.getAttribute("href").split("#")[0].split("?")[0]).filter(Boolean))]);
    check(`${path} tutti i link interni (${hrefs.length}) esistono`, (await Promise.all(hrefs.map(async (h) => (await page.request.get(`http://localhost:4173${h}`)).status()))).every((s) => s === 200));
    const targets = await page.$$eval("a[href*='#']", (nodes) => nodes.map((n) => n.getAttribute("href")).filter((h) => !h.startsWith("%")));
    const ids = await page.$$eval("[id]", (nodes) => nodes.map((n) => n.id));
    check(`${path} gli hash della pagina puntano a scene esistenti`, targets.filter((h) => h.startsWith("#")).every((h) => ids.includes(h.slice(1))));

    for (const [width, height] of viewports) {
      const label = `${path} ${width}x${height}`;
      const p = await newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      await p.goto(url);
      check(`${label} ${scenes} scene, altrettanti snap, una sola attiva, le altre inerti`, (await p.locator("section.scene").count()) === scenes && (await p.locator(".snap").count()) === scenes && (await p.locator("section.scene.on").count()) === 1 && (await p.locator("section.scene[inert]").count()) === scenes - 1);
      const bad = [];
      for (let i = 0; i < scenes; i++) {
        await p.evaluate((n) => scrollTo({ top: n * document.querySelector(".stage").clientHeight, behavior: "instant" }), i);
        await p.waitForFunction((n) => document.querySelectorAll("section.scene")[n].classList.contains("on"), i, { timeout: 3000 }).catch(() => null);
        await p.waitForTimeout(60);
        let out = await p.evaluate(sceneFit);
        for (const n of await p.locator("section.scene.on details").count() ? [...Array(await p.locator("section.scene.on details").count()).keys()] : []) {
          await p.evaluate((k) => document.querySelectorAll("section.scene.on details").forEach((d, j) => (d.open = j === k)), n);
          out ||= (await p.evaluate(sceneFit)) && `faq ${n}: ${await p.evaluate(sceneFit)}`;
        }
        await p.evaluate(() => document.querySelectorAll("section.scene.on details").forEach((d) => (d.open = false)));
        if (out) bad.push(`${i}: ${out}`);
      }
      check(`${label} ogni scena entra nello schermo, sotto la nav, senza testo o finestre tagliate (${bad.join(" // ")})`, bad.length === 0);
      if (home) {
        await p.route("**/waitlist", (route) => route.fulfill({ status: 500, body: "{}" }));
        await p.evaluate(() => scrollTo({ top: [...document.querySelectorAll("section.scene")].findIndex((s) => s.id === "accesso") * document.querySelector(".stage").clientHeight, behavior: "instant" }));
        await p.waitForFunction(() => document.querySelector("section.scene.on")?.id === "accesso");
        await p.fill("#email", "test@example.com");
        await p.fill("#shopDomain", "demo.myshopify.com");
        await p.selectOption("#productRange", "100_500");
        await p.check("input[name=consent]");
        await p.click("form#richiesta button[type=submit]");
        await p.waitForFunction(() => document.querySelector("#richiesta [role=status]").textContent.length > 0);
        check(`${label} form in errore: testo nello status, form visibile e dentro lo schermo (Turnstile 300x65 incluso) (${await p.evaluate(sceneFit)})`, !(await p.evaluate(sceneFit)) && (await p.locator("#richiesta button[type=submit]").isVisible()) && (await p.evaluate(() => document.querySelector("#richiesta .cf-turnstile").getBoundingClientRect().height)) >= 65);
        for (const need of ["consulting", "build"]) {
          await p.check(`input[value=${need}]`, { force: true });
          check(`${label} modulo "${need}": dentro lo schermo con Turnstile 65px (${await p.evaluate(sceneFit)})`, !(await p.evaluate(sceneFit)) && (await p.locator("#richiesta button[type=submit]").isVisible()));
        }
      }
      check(`${label} zero overflow orizzontale, nav senza overflow e a tutta larghezza`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector("#nav").scrollWidth <= document.querySelector("#nav").clientWidth && Math.round(document.querySelector("#nav").getBoundingClientRect().width) === innerWidth));
      check(`${label} nav in vetro scuro e sfondo fisso`, (await p.evaluate(navIsDarkGlass)) && (await p.evaluate(() => getComputedStyle(document.querySelector(".bg")).position)) === "fixed");
      await p.context().close();
    }

    const live = await newPage({ viewport: { width: 1440, height: 900 } });
    await live.goto(url);
    await live.waitForTimeout(600);
    const topH = await live.$eval("#nav", (n) => n.getBoundingClientRect().height);
    await live.evaluate(() => scrollTo({ top: document.querySelector(".stage").clientHeight, behavior: "instant" }));
    await live.waitForFunction(() => { scrollTo({ top: document.querySelector(".stage").clientHeight, behavior: "instant" }); return document.querySelector("#nav.mini"); }, null, { timeout: 4000 }).catch(() => null);
    await live.waitForTimeout(900);
    check(`${path} la nav si abbassa scorrendo e resta a tutta larghezza`, (await live.$eval("#nav", (n) => n.getBoundingClientRect().height)) < topH && (await live.$eval("#nav", (n) => Math.round(n.getBoundingClientRect().width))) === 1440);
    if (home || path.startsWith("/prezzi") || path.startsWith("/en/pricing")) {
      const pose = () => live.$eval(".bg .a", (n) => getComputedStyle(n).transform);
      const before = await pose();
      await live.waitForTimeout(2800);
      check(`${path} lo sfondo fisso cambia posa tra due scene (${before} -> ${await pose()})`, (await pose()) !== before);
    }
    const navLinks = await live.$$eval("#links a", (nodes) => nodes.map((n) => n.getAttribute("href")));
    const order = await live.$$eval("section.scene", (nodes) => nodes.map((n) => n.id));
    let linkOk = navLinks.length > 0;
    for (const href of navLinks) {
      await live.click(`#links a[href="${href}"]`);
      await live.waitForFunction((id) => document.querySelector("section.scene.on")?.id === id, href.slice(1), { timeout: 3000 }).catch(() => null);
      await live.waitForTimeout(150);
      const ok = (await live.locator("section.scene.on").getAttribute("id")) === href.slice(1) && (await live.locator(`#links a[aria-current][href="${href}"]`).count()) === 1 && (await live.evaluate(() => location.hash)) === (href === "#top" ? "" : href);
      linkOk &&= ok;
    }
    check(`${path} i ${navLinks.length} link della nav portano alla scena giusta e la sottolineano`, linkOk);
    if (home) await live.click("a.logo");
    await live.waitForTimeout(200);
    if (home) check(`${path} il logo riporta alla prima scena`, (await live.locator("section.scene.on").getAttribute("id")) === "top");
    await live.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await live.waitForTimeout(300);
    await live.keyboard.press("PageDown");
    await live.waitForFunction((id) => document.querySelector("section.scene.on")?.id === id, order[1], { timeout: 3000 }).catch(() => null);
    check(`${path} PagGiù porta alla scena successiva (snap nativo)`, (await live.locator("section.scene.on").getAttribute("id")) === order[1]);
    const direct = await newPage({ viewport: { width: 1280, height: 800 } });
    await direct.goto(`${url}#${order[2]}`);
    await direct.waitForTimeout(400);
    check(`${path} apertura diretta su #${order[2]}`, (await direct.locator("section.scene.on").getAttribute("id")) === order[2]);

    if (home) {
      const fam = await live.$$eval(".famlist a", (nodes) => nodes.map((n) => n.getAttribute("href")));
      let famOk = fam.length === 4;
      for (const href of fam) {
        await live.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await live.waitForFunction(() => document.querySelector("section.scene.on")?.id === "top");
        await live.click(`.famlist a[href="${href}"]`);
        famOk &&= await live.waitForFunction((id) => document.querySelector("section.scene.on")?.id === id, href.slice(1), { timeout: 3000 }).then(() => true, () => false);
      }
      check(`${path} i 4 link della colonna servizi portano alla scena giusta`, famOk);
    }
    const seqScene = await live.evaluate(() => [...document.querySelectorAll("section.scene")].findIndex((s) => s.querySelector("[data-seq]")));
    if (seqScene > 0) {
      await live.evaluate((n) => scrollTo({ top: n * document.querySelector(".stage").clientHeight, behavior: "instant" }), seqScene);
      await live.waitForTimeout(2600);
      const counts = () => live.evaluate((n) => document.querySelectorAll("section.scene")[n].querySelectorAll("[data-seq].in").length, seqScene);
      const playing = await counts();
      await live.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await live.waitForTimeout(600);
      const frozen = await counts();
      await live.waitForTimeout(2500);
      check(`${path} i loop partono da soli sulla scena attiva e si fermano quando cambia (${playing}/${frozen})`, playing > 0 && (await counts()) === frozen);
    }

    const still = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    await still.goto(url);
    await still.waitForTimeout(600);
    check(`${path} reduced-motion: nessuna animazione, stato finale visibile`, (await still.evaluate(() => document.getAnimations().filter((a) => a instanceof CSSAnimation).length)) === 0 && (await still.$$eval("[data-seq]", (nodes) => nodes.every((n) => getComputedStyle(n).opacity === "1"))) && (await still.$$eval("svg.sp path", (nodes) => nodes.every((n) => parseFloat(getComputedStyle(n).strokeDashoffset) === 0))));

    const landscape = await newPage({ viewport: { width: 740, height: 360 } });
    await landscape.goto(url);
    await landscape.waitForTimeout(400);
    check(`${path} telefono in orizzontale (740x360): layout impilato con scroll normale, nessuna scena inerte`, await landscape.$$eval("section.scene", (nodes) => nodes.every((n, i) => { const s = getComputedStyle(n); return s.position !== "absolute" && s.opacity === "1" && !n.inert && n.getBoundingClientRect().height > 100; }) && getComputedStyle(document.documentElement).scrollSnapType === "none" && document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    const rot = await newPage({ viewport: { width: 390, height: 844 } });
    await rot.goto(url);
    await rot.waitForTimeout(400);
    await rot.setViewportSize({ width: 844, height: 390 });
    await rot.waitForTimeout(500);
    const flat = await rot.$$eval("section.scene", (nodes) => nodes.every((n) => !n.inert && getComputedStyle(n).position !== "absolute"));
    await rot.setViewportSize({ width: 390, height: 844 });
    await rot.waitForTimeout(700);
    const hrefs2 = await rot.$$eval("#links a", (nodes) => nodes.map((n) => n.getAttribute("href")));
    let rotOk = flat && (await rot.locator("section.scene.on").count()) === 1 && (await rot.locator("section.scene.on").evaluate((n) => getComputedStyle(n).opacity === "1" && getComputedStyle(n).visibility === "visible"));
    if (hrefs2.length) {
      await rot.click(`#links a[href="${hrefs2.at(-1)}"]`);
      await rot.waitForFunction((id) => document.querySelector("section.scene.on")?.id === id, hrefs2.at(-1).slice(1), { timeout: 3000 }).catch(() => null);
      rotOk &&= (await rot.locator("section.scene.on").getAttribute("id")) === hrefs2.at(-1).slice(1);
    }
    check(`${path} rotazione 390x844 -> 844x390 -> 390x844: in orizzontale nessuna scena inerte, in verticale una scena attiva visibile e i link nav funzionano`, rotOk);
    const plain = await newPage({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    await plain.goto(url);
    check(`${path} senza JS le scene sono impilate e leggibili`, await plain.$$eval("section.scene", (nodes) => nodes.every((n, i) => { const s = getComputedStyle(n); const r = n.getBoundingClientRect(); return s.opacity === "1" && s.visibility === "visible" && s.position !== "absolute" && r.height > 100 && (i === 0 || r.top >= n.previousElementSibling.getBoundingClientRect().bottom - 1); })));
    await closeAll();
  }

  for (const { code, path, ok } of [{ code: "it", path: "/", ok: "Grazie" }, { code: "en", path: "/en/", ok: "Thank you" }]) {
    for (const [state, date] of Object.entries(states)) {
      const dated = await newPage();
      await dated.clock.setFixedTime(new Date(date));
      await dated.goto(`http://localhost:4173${path}`);
      check(`${code} home ${state}: nessuna fascia pilota (rimossa)`, (await dated.locator(".band").count()) === 0);
    }
    const page = await newPage({ viewport: { width: 1280, height: 800 } });
    let sent;
    await page.route("**/waitlist", (route) => {
      sent = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.goto(`http://localhost:4173${path}#accesso`);
    await page.waitForTimeout(300);
    await page.fill("#email", "test@example.com");
    await page.fill("#shopDomain", "demo.myshopify.com");
    await page.selectOption("#productRange", "100_500");
    await page.check("input[name=consent]");
    await page.$eval("#richiesta .cf-turnstile", (n) => n.insertAdjacentHTML("beforeend", '<input type="hidden" name="cf-turnstile-response" value="tok">'));
    await page.click("form#richiesta button[type=submit]");
    await page.waitForSelector("form#richiesta.done");
    check(`${code} form: testo di successo, consenso e token Turnstile in turnstileToken`, (await page.locator("form#richiesta [role=status]").textContent()).startsWith(ok) && sent.consent === true && sent.source === "landing" && sent.turnstileToken === "tok" && !("cf-turnstile-response" in sent));
    for (const [need, [domain, site]] of Object.entries({ neurocart: [true, false], consulting: [false, true], build: [false, false] })) {
      await page.reload();
      await page.waitForTimeout(300);
      await page.check(`input[value=${need}]`, { force: true });
      await page.fill("#email", "test@example.com");
      await page.check("input[name=consent]");
      const state = await page.evaluate(() => ["#shopDomain", "#shopUrl", "#productRange"].map((id) => [!!document.querySelector(id).offsetParent, document.querySelector(id).required && !document.querySelector(id).disabled]));
      const valid = () => page.$eval("#richiesta", (f) => f.checkValidity());
      const [emptyValid] = [await valid()];
      if (domain) await page.fill("#shopDomain", "demo.myshopify.com");
      if (site) await page.fill("#shopUrl", "www.demo-shop.it");
      await page.selectOption("#productRange", "100_500");
      await page.$eval("#richiesta .cf-turnstile", (n) => n.insertAdjacentHTML("beforeend", '<input type="hidden" name="cf-turnstile-response" value="tok">'));
      await page.click("form#richiesta button[type=submit]");
      await page.waitForSelector("form#richiesta.done");
      check(`${code} modulo "${need}": campi visibili e required giusti, payload con need e solo i campi pertinenti`, JSON.stringify(state) === JSON.stringify([[domain, domain], [site, false], [true, need === "neurocart"]]) && emptyValid === !domain && sent.need === need && ("shopDomain" in sent) === domain && sent.shopUrl === (site ? "www.demo-shop.it" : undefined) && sent.productRange === "100_500" && sent.turnstileToken === "tok");
    }
    await page.evaluate(() => scrollTo({ top: [...document.querySelectorAll("section.scene")].findIndex((n) => n.id === "partner") * document.querySelector(".stage").clientHeight, behavior: "instant" }));
    await page.waitForFunction(() => document.querySelector("section.scene.on")?.id === "partner");
    await page.click("#partner a[data-pick]");
    await page.waitForFunction(() => document.querySelector("section.scene.on")?.id === "accesso", null, { timeout: 3000 });
    check(`${code} la CTA della scena partner porta al modulo con "build" già selezionato`, (await page.locator("input[value=build]").isChecked()) && !(await page.locator("#shopDomain").isVisible()));
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
