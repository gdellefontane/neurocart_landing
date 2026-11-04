import { $$, bindWaitlist, stage } from "./shared";

stage();

if (import.meta.env.VITE_INSTALL_URL) {
  $$<HTMLAnchorElement>("[data-cta]").forEach((a) => Object.assign(a, { href: import.meta.env.VITE_INSTALL_URL, textContent: a.dataset.install }));
}

const form = document.querySelector<HTMLFormElement>("#richiesta");
if (form) {
  const need = form.elements.namedItem("need") as RadioNodeList;
  const [range, rangeLabel] = [form.querySelector<HTMLSelectElement>("#productRange")!, form.querySelector<HTMLElement>("#rangeLabel")!];
  const syncNeed = () => {
    $$<HTMLElement>("[data-need]").forEach((slot) => {
      const on = slot.dataset.need === need.value;
      slot.hidden = !on;
      slot.querySelectorAll("input").forEach((input) => (input.disabled = !on));
    });
    range.required = need.value === "neurocart";
    rangeLabel.textContent = range.options[0].textContent = need.value === "build" ? rangeLabel.dataset.build! : rangeLabel.dataset.ask!;
  };
  form.addEventListener("change", syncNeed);
  $$<HTMLAnchorElement>("[data-pick]").forEach((a) => a.addEventListener("click", () => {
    need.value = a.dataset.pick!;
    syncNeed();
  }));
  bindWaitlist(form, (data) => {
    const field = (name: string) => data.get(name) || undefined;
    return { email: data.get("email"), need: data.get("need"), shopDomain: field("shopDomain"), shopUrl: field("shopUrl"), productRange: field("productRange"), source: "landing", consent: true };
  });
}
