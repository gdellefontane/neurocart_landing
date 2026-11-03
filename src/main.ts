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
const [track, pillBox, pillBar, progress, counter] = [$("#servizi .svc-track"), $("#servizi .pills"), $("#servizi .pillbar"), $("#servizi .prog i"), $("#servizi .count b")];
const [prev, next] = [$("#servizi [data-prev]"), $("#servizi [data-next]")];
let pinned = -1;
const show = (i: number) => {
  pills.forEach((pill, n) => (pill.ariaCurrent = String(n === i)));
  cards.forEach((card, n) => card.toggleAttribute("data-on", n === i));
  Object.assign(pillBar.style, { width: `${pills[i].offsetWidth}px`, transform: `translateX(${pills[i].offsetLeft}px)` });
  pillBox.scrollLeft = pills[i].offsetLeft - (pillBox.clientWidth - pills[i].offsetWidth) / 2;
  counter.textContent = String(i + 1).padStart(2, "0");
  prev.ariaDisabled = String(i === 0);
  next.ariaDisabled = String(i === cards.length - 1);
};
const activeIndex = () => cards.findIndex((card) => card.hasAttribute("data-on"));
const go = (index: number) => {
  pinned = Math.max(0, Math.min(cards.length - 1, index));
  show(pinned);
  track.scrollTo({ left: cards[pinned].offsetLeft - (track.clientWidth - cards[pinned].offsetWidth) / 2, behavior: REDUCED ? "instant" : "smooth" });
};
const centered = new IntersectionObserver(
  (entries) => entries.forEach(({ isIntersecting, target }) => isIntersecting && pinned < 0 && show(cards.indexOf(target as HTMLElement))),
  { root: track, rootMargin: "0px -49% 0px -49%" },
);
cards.forEach((card) => centered.observe(card));
track.addEventListener("scroll", () => (progress.style.transform = `scaleX(${track.scrollLeft / (track.scrollWidth - track.clientWidth)})`), { passive: true });
["pointerdown", "wheel", "keydown"].forEach((type) => track.addEventListener(type, () => (pinned = -1), { passive: true }));
pills.forEach((pill, i) => pill.addEventListener("click", () => go(i)));
prev.addEventListener("click", () => go(activeIndex() - 1));
next.addEventListener("click", () => go(activeIndex() + 1));
addEventListener("resize", () => show(activeIndex()));
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
const themeScene = $("[data-cycle]");
if (!REDUCED) {
  setInterval(() => {
    if (!themeScene.closest("[data-live] [data-on]")) return;
    const preset = PRESETS[(PRESETS.indexOf(themeScene.dataset.preset!) + 1) % PRESETS.length];
    themeScene.dataset.preset = preset;
    themeScene.querySelector(".chip")!.textContent = preset;
  }, 2200);
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
