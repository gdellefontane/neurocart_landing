import { $$, bindWaitlist, stage } from "./shared";

stage();

if (import.meta.env.VITE_INSTALL_URL) {
  $$<HTMLAnchorElement>("[data-cta]").forEach((a) => Object.assign(a, { href: import.meta.env.VITE_INSTALL_URL, textContent: a.dataset.install }));
}

const form = document.querySelector<HTMLFormElement>("#richiesta");
if (form) {
  bindWaitlist(form, (data) => ({ email: data.get("email"), shopDomain: data.get("shopDomain"), productRange: data.get("productRange"), source: "landing", consent: true }));
}
