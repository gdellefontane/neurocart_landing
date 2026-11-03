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

const showcase = $("#servizi");
const slides = $$("#servizi .vs[aria-label]");
const segments = $$("#servizi .vsegs button");
const [track, halo, counter, prev, next] = [$("#servizi .vtrack"), $(".halo"), $("#servizi .vhint b"), $("#servizi .prev"), $("#servizi .next")];
let at = 0;
let visible = false;
const go = (index: number) => {
  at = (index + slides.length) % slides.length;
  track.style.transform = `translateX(calc(${-at} * (100% - var(--peek))))`;
  halo.style.setProperty("--halo", slides[at].style.getPropertyValue("--b2"));
  slides.forEach((slide, n) => {
    slide.toggleAttribute("data-on", n === at);
    slide.inert = n !== at;
  });
  segments.forEach((segment, n) => {
    segment.toggleAttribute("aria-current", n === at);
    segment.classList.toggle("done", n < at);
    segment.classList.remove("run");
  });
  void showcase.offsetWidth;
  segments[at].classList.add("run");
  counter.textContent = String(at + 1).padStart(2, "0");
};
const hold = () => showcase.classList.toggle("hold", REDUCED || !visible || document.hidden);
showcase.querySelector(".vsegs")!.addEventListener("animationend", () => go(at + 1));
segments.forEach((segment, n) => segment.addEventListener("click", () => go(n)));
prev.addEventListener("click", () => go(at - 1));
next.addEventListener("click", () => go(at + 1));
let dragFrom: number | null = null;
showcase.addEventListener("pointerdown", (event) => (dragFrom = (event.target as Element).closest("a, button") ? null : event.clientX));
addEventListener("pointerup", ({ clientX }) => {
  if (dragFrom !== null && Math.abs(clientX - dragFrom) > 40) go(at + (clientX < dragFrom ? 1 : -1));
  dragFrom = null;
});
new IntersectionObserver(([entry]) => ((visible = entry.isIntersecting), hold()), { threshold: 0.4 }).observe(showcase);
document.addEventListener("visibilitychange", hold);
go(0);
const insights = $("#insights");
inView(insights, () => {
  insights.classList.add("play");
  return () => insights.classList.remove("play");
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
