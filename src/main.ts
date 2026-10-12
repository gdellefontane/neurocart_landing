import { inView, scroll } from "motion";
import { $, $$, REDUCED, bindWaitlist, motion, navScroll } from "./shared";

const PRESETS = ["editorial", "glass", "minimal", "frame"];

const tabs = $$("#consigli [role=tab]");
const [list, panel, stage, bar, label] = [$("#consigli [role=tablist]"), $("#consigli-panel"), $("#consigli .stage"), $("#consigli .tabbar"), $("#consigli .reclabel")];
const [explainText, explainChip] = [$("#consigli .explain span"), $("#consigli .explain .chip")];
let current = 0;
const select = (index: number) => {
  current = index;
  tabs.forEach((tab, i) => Object.assign(tab, { ariaSelected: String(i === index), tabIndex: i === index ? 0 : -1 }));
  Object.assign(stage.dataset, tabs[index].dataset);
  panel.setAttribute("aria-labelledby", tabs[index].id);
  label.textContent = tabs[index].dataset.label!;
  explainText.textContent = tabs[index].querySelector(".tabdesc")!.textContent;
  explainChip.textContent = tabs[index].querySelector(".chip")!.textContent;
  bar.style.transform = `translateY(${index * 3}rem)`;
  list.scrollLeft = tabs[index].offsetLeft - (list.clientWidth - tabs[index].offsetWidth) / 2;
};
tabs.forEach((tab, i) => tab.addEventListener("click", () => select(i)));
select(0);
list.addEventListener("keydown", (event) => {
  const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[event.key];
  if (!step) return;
  event.preventDefault();
  select((current + step + tabs.length) % tabs.length);
  tabs[current].focus();
});

navScroll();

if (import.meta.env.VITE_INSTALL_URL) {
  $$<HTMLAnchorElement>("[data-cta]").forEach((a) => Object.assign(a, { href: import.meta.env.VITE_INSTALL_URL, textContent: a.dataset.install }));
}

bindWaitlist($<HTMLFormElement>("#accesso"), (data) => ({
  email: data.get("email"),
  shopDomain: data.get("shopDomain"),
  productRange: data.get("productRange"),
  source: "landing",
  consent: true,
}));

motion();

if (!REDUCED) {
  const [engine, fill] = [$("#engine"), $("#engine .fill")];
  const phased = $$("[data-p]");
  const railItems = $$("#engine ol li");
  scroll(
    (progress) => {
      const phase = Math.ceil(progress * 4);
      const shown = Math.max(1, phase);
      fill.style.transform = `scaleY(${progress})`;
      railItems.forEach((item, i) => (item.ariaCurrent = i + 1 === shown ? "step" : null));
      phased.forEach((el) => {
        el.classList.toggle("on", Number(el.dataset.p) <= phase);
        el.classList.toggle("cur", Number(el.dataset.p) === shown);
      });
    },
    { target: engine, offset: ["start start", "end end"] },
  );

  let timer = 0;
  const stopAutoplay = () => (clearInterval(timer), (timer = -1));
  inView("#consigli", () => {
    if (timer !== -1) timer = window.setInterval(() => select((current + 1) % tabs.length), 5000);
    return () => timer !== -1 && clearInterval(timer);
  });
  ["click", "mouseenter", "focusin"].forEach((type) => list.addEventListener(type, stopAutoplay, { once: true }));

  const surfaces = $("#chat");
  scroll((progress) => (surfaces.dataset.preset = PRESETS[Math.min(3, Math.floor(progress * 4))]), {
    target: surfaces,
    offset: ["start 60%", "end 40%"],
  });
}
