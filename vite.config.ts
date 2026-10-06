import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const locales = Object.fromEntries(["it", "en"].map((lang) => [lang, JSON.parse(readFileSync(`locales/${lang}.json`, "utf8")) as Record<string, string>]));
const mismatch = [...Object.keys(locales.it).filter((key) => !(key in locales.en)), ...Object.keys(locales.en).filter((key) => !(key in locales.it))];
if (mismatch.length) throw new Error(`Chiavi non allineate tra it.json e en.json: ${mismatch.join(", ")}`);

export default defineConfig({
  plugins: [
    {
      name: "i18n",
      transformIndexHtml: {
        order: "pre",
        handler: (_, { filename }) => {
          const lang = dirname(filename) === resolve("en") ? "en" : "it";
          return readFileSync("src/page.html", "utf8").replace(/\{\{([\w.]+)\}\}/g, (_match, key: string) => {
            if (!(key in locales[lang])) throw new Error(`Chiave mancante in ${lang}.json: ${key}`);
            return locales[lang][key];
          });
        },
      },
    },
    tailwindcss(),
  ],
  build: { rollupOptions: { input: { it: resolve("index.html"), en: resolve("en/index.html") } } },
});
