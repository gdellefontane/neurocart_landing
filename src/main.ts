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

const cards = $$("#servizi .svc");
const pills = $$("#servizi [data-pill]");
const [track, pillBox, pillBar, progress, counter] = [$("#servizi .track"), $("#servizi .pills"), $("#servizi .pillbar"), $("#servizi .prog i"), $("#servizi .count b")];
const [prev, next] = [$<HTMLButtonElement>("#servizi [data-prev]"), $<HTMLButtonElement>("#servizi [data-next]")];
let active = 0;
let pinned = -1;
const show = (i: number) => {
  active = i;
  pills.forEach((pill, n) => (pill.ariaCurrent = String(n === i)));
  cards.forEach((card, n) => card.toggleAttribute("data-on", n === i));
  Object.assign(pillBar.style, { width: `${pills[i].offsetWidth}px`, transform: `translateX(${pills[i].offsetLeft}px)` });
  pillBox.scrollLeft = pills[i].offsetLeft - (pillBox.clientWidth - pills[i].offsetWidth) / 2;
  counter.textContent = String(i + 1).padStart(2, "0");
  prev.disabled = i === 0;
  next.disabled = i === cards.length - 1;
};
const go = (i: number) => {
  pinned = i;
  show(i);
  track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: REDUCED ? "instant" : "smooth" });
};
track.addEventListener("scroll", () => {
  const max = track.scrollWidth - track.clientWidth;
  progress.style.transform = `scaleX(${track.scrollLeft / max})`;
  if (pinned >= 0) return;
  const step = cards[1].offsetLeft - cards[0].offsetLeft;
  show(track.scrollLeft >= max - 2 ? cards.length - 1 : Math.round(track.scrollLeft / step));
}, { passive: true });
["pointerdown", "wheel", "keydown"].forEach((type) => track.addEventListener(type, () => (pinned = -1), { passive: true }));
pills.forEach((pill, i) => pill.addEventListener("click", () => go(i)));
prev.addEventListener("click", () => go(active - 1));
next.addEventListener("click", () => go(active + 1));
addEventListener("resize", () => show(active));
show(0);
const showcase = $("#servizi");
inView(showcase, () => {
  showcase.dataset.live = "";
  return () => delete showcase.dataset.live;
}, { amount: 0.2 });
const insights = $("#insights");
inView(insights, () => {
  insights.classList.add("play");
  return () => insights.classList.remove("play");
});
if (!REDUCED) {
  $$("[data-cycle]").forEach((scene) =>
    setInterval(() => {
      if (!scene.closest("[data-live] [data-on]")) return;
      const preset = PRESETS[(PRESETS.indexOf(scene.dataset.preset!) + 1) % PRESETS.length];
      scene.dataset.preset = preset;
      scene.querySelector(".chip")!.textContent = preset;
    }, 2200),
  );
}

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
