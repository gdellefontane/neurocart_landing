import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const locales = Object.fromEntries(["it", "en"].map((lang) => [lang, JSON.parse(readFileSync(`locales/${lang}.json`, "utf8")) as Record<string, string>]));

type Page = { template: string; lang: "it" | "en"; id?: string; pair?: string; listed?: false };
const pages: Record<string, Page> = {
  "": { template: "src/page.html", lang: "it", pair: "en" },
  en: { template: "src/page.html", lang: "en", pair: "" },
  "pilota-black-friday": { template: "src/pilota.html", lang: "it", id: "pilota", listed: false },
  "condizioni-pilota": { template: "src/condizioni.html", lang: "it", id: "condizioni", listed: false },
  "chatbot-shopify": { template: "src/seo.html", lang: "it", id: "chatbot", pair: "en/shopify-ai-chatbot" },
  "upsell-cross-sell-shopify": { template: "src/seo.html", lang: "it", id: "upsell", pair: "en/shopify-upsell-cross-sell" },
  "come-aumentare-scontrino-medio-shopify": { template: "src/guida.html", lang: "it" },
  "en/shopify-ai-chatbot": { template: "src/seo.html", lang: "en", id: "chatbot", pair: "chatbot-shopify" },
  "en/shopify-upsell-cross-sell": { template: "src/seo.html", lang: "en", id: "upsell", pair: "upsell-cross-sell-shopify" },
  "en/shopify-related-products": { template: "src/seo.html", lang: "en", id: "related" },
};

const ids = Object.fromEntries(["it", "en"].map((lang) => [lang, new Set(Object.keys(locales[lang]).filter((key) => key.startsWith("seo.")).map((key) => key.split(".")[1]))]));
const mismatch = [["it", "en"], ["en", "it"]].flatMap(([lang, other]) =>
  Object.keys(locales[lang]).filter((key) => !(key in locales[other]) && (!key.startsWith("seo.") || ids[other].has(key.split(".")[1]))),
);
if (mismatch.length) throw new Error(`Chiavi non allineate tra it.json e en.json: ${mismatch.join(", ")}`);

const url = (dir: string) => `https://www.neurocart.it/${dir && `${dir}/`}`;
const twins = (dir: string) => (pages[dir].lang === "it" ? [dir, pages[dir].pair!] : [pages[dir].pair!, dir]);

const render = (html: string, dir: string): string => {
  const { lang, id = "", pair } = pages[dir];
  const [it, en] = pair === undefined ? [dir, dir] : twins(dir);
  const vars: Record<string, string> = { url: url(dir), it: url(it), en: url(en), other: `/${pair && `${pair}/`}`, otherLang: lang === "it" ? "en" : "it" };
  return html.replace(/\{\{(>?)([\w.$@-]+)\}\}/g, (_match, partial: string, key: string) => {
    if (key.startsWith("@")) return vars[key.slice(1)];
    if (partial) {
      const name = key.replace("$id", id).replace("$lang", lang);
      const file = `src/partials/${name}.html`;
      return (name.startsWith("pair-") && pair === undefined) || !existsSync(file) ? "" : render(readFileSync(file, "utf8"), dir);
    }
    const full = key.startsWith("p.") ? `seo.${id}.${key.slice(2)}` : key;
    if (!(full in locales[lang])) throw new Error(`Chiave mancante in ${lang}.json: ${full}`);
    return locales[lang][full];
  });
};

const alternate = (hreflang: string, dir: string) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${url(dir)}" />\n`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${Object.entries(pages)
  .filter(([, page]) => page.listed !== false)
  .map(([dir, { pair }]) => `  <url>\n    <loc>${url(dir)}</loc>\n${pair === undefined ? "" : alternate("it", twins(dir)[0]) + alternate("en", twins(dir)[1]) + alternate("x-default", twins(dir)[0])}  </url>\n`)
  .join("")}</urlset>`;

export default defineConfig({
  plugins: [
    {
      name: "i18n",
      transformIndexHtml: {
        order: "pre",
        handler: (_, { filename }) => {
          const dir = relative(process.cwd(), dirname(filename));
          return render(readFileSync(pages[dir].template, "utf8"), dir);
        },
      },
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });
      },
    },
    tailwindcss(),
  ],
  build: { rollupOptions: { input: Object.fromEntries(Object.keys(pages).map((dir) => [dir || "home", resolve(dir, "index.html")])) } },
});
