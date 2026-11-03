import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const locales = Object.fromEntries(["it", "en"].map((lang) => [lang, JSON.parse(readFileSync(`locales/${lang}.json`, "utf8")) as Record<string, string>]));

const pages: Record<string, { template: string; lang: "it" | "en"; id?: string }> = {
  "": { template: "src/page.html", lang: "it" },
  en: { template: "src/page.html", lang: "en" },
  "pilota-black-friday": { template: "src/pilota.html", lang: "it" },
  "condizioni-pilota": { template: "src/condizioni.html", lang: "it" },
  "chatbot-shopify": { template: "src/seo.html", lang: "it", id: "chatbot" },
  "upsell-cross-sell-shopify": { template: "src/seo.html", lang: "it", id: "upsell" },
  "come-aumentare-scontrino-medio-shopify": { template: "src/guida.html", lang: "it", id: "guida-aov" },
  "en/shopify-ai-chatbot": { template: "src/seo.html", lang: "en", id: "chatbot" },
  "en/shopify-upsell-cross-sell": { template: "src/seo.html", lang: "en", id: "upsell" },
  "en/shopify-related-products": { template: "src/seo.html", lang: "en", id: "related" },
};

const seoIds = (lang: string) => new Set(Object.keys(locales[lang]).filter((key) => key.startsWith("seo.")).map((key) => key.split(".")[1]));
const comparable = (lang: string, other: string) => Object.keys(locales[lang]).filter((key) => !key.startsWith("seo.") || seoIds(other).has(key.split(".")[1]));
const mismatch = [["it", "en"], ["en", "it"]].flatMap(([lang, other]) => comparable(lang, other).filter((key) => !(key in locales[other])));
if (mismatch.length) throw new Error(`Chiavi non allineate tra it.json e en.json: ${mismatch.join(", ")}`);

const render = (html: string, lang: string, id?: string): string =>
  html.replace(/\{\{(>?)([\w.-]+)\}\}/g, (_match, partial: string, key: string) => {
    if (partial) return render(readFileSync(`src/partials/${key === "p" ? id : key}.html`, "utf8"), lang, id);
    const full = key.startsWith("p.") ? `seo.${id}.${key.slice(2)}` : key;
    if (!(full in locales[lang])) throw new Error(`Chiave mancante in ${lang}.json: ${full}`);
    return locales[lang][full];
  });

export default defineConfig({
  plugins: [
    {
      name: "i18n",
      transformIndexHtml: {
        order: "pre",
        handler: (_, { filename }) => {
          const { template, lang, id } = pages[relative(process.cwd(), dirname(filename))];
          return render(readFileSync(template, "utf8"), lang, id);
        },
      },
    },
    tailwindcss(),
  ],
  build: { rollupOptions: { input: Object.fromEntries(Object.keys(pages).map((dir) => [dir || "home", resolve(dir, "index.html")])) } },
});
