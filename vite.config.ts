import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const locales = Object.fromEntries(["it", "en"].map((lang) => [lang, JSON.parse(readFileSync(`locales/${lang}.json`, "utf8")) as Record<string, string>]));
const mismatch = Object.keys(locales.it).filter((key) => !(key in locales.en)).concat(Object.keys(locales.en).filter((key) => !(key in locales.it)));

const i18n = (): Plugin => ({
  name: "i18n",
  transformIndexHtml: {
    order: "pre",
    handler(_, { filename }) {
      if (mismatch.length) throw new Error(`Chiavi non allineate tra it.json e en.json: ${mismatch.join(", ")}`);
      const lang = dirname(filename) === resolve("en") ? "en" : "it";
      return readFileSync("src/page.html", "utf8").replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
        if (!(key in locales[lang])) throw new Error(`Chiave mancante in ${lang}.json: ${key}`);
        return locales[lang][key];
      });
    },
  },
});

export default defineConfig({
  plugins: [i18n(), tailwindcss()],
  build: { rollupOptions: { input: { it: resolve("index.html"), en: resolve("en/index.html") } } },
});
