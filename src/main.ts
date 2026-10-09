import { animate, inView, scroll, stagger } from "motion";
import "./styles.css";

const SHOWN = { opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" };
const EASE = [0.16, 1, 0.3, 1] as const;
const PRESETS = ["editorial", "glass", "minimal", "frame"];
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];

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

const nav = $("#nav");
scroll((_, { y }) => nav.classList.toggle("scrolled", y.current > 80));

if (import.meta.env.VITE_INSTALL_URL) {
  $$<HTMLAnchorElement>("[data-cta]").forEach((a) => Object.assign(a, { href: import.meta.env.VITE_INSTALL_URL, textContent: a.dataset.install }));
}

declare global {
  interface Window {
    turnstile?: { reset: (container: Element) => void };
  }
}

const form = $<HTMLFormElement>("#accesso");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const turnstileToken = formData.get("cf-turnstile-response") || undefined;
  const res = await fetch(`${import.meta.env.VITE_API_URL}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: formData.get("email"),
      shopDomain: formData.get("shopDomain"),
      productRange: formData.get("productRange"),
      turnstileToken,
      source: "landing",
      consent: true,
    }),
  }).catch(() => null);
  if (!res?.ok) window.turnstile?.reset(form.querySelector(".cf-turnstile")!);
  form.classList.toggle("done", !!res?.ok);
  form.querySelector("[role=status]")!.textContent = res?.ok ? form.dataset.ok! : form.dataset.err!;
});

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  $$("[data-split]").forEach((heading) => {
    heading.setAttribute("aria-label", heading.textContent!.replace(/\s+/g, " ").trim());
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    texts.forEach((text) =>
      text.replaceWith(
        ...text.data.split(/(\s+)/).map((word) => {
          if (!word.trim()) return word;
          const outer = Object.assign(document.createElement("span"), { className: "w" });
          outer.setAttribute("aria-hidden", "true");
          outer.append(Object.assign(document.createElement("span"), { className: "wi", textContent: word }));
          return outer;
        }),
      ),
    );
    heading.style.visibility = "visible";
    inView(
      heading,
      () => {
        animate(heading.querySelectorAll(".wi"), { transform: "translateY(0%)" }, { duration: 0.9, ease: EASE, delay: stagger(0.07) });
      },
      { amount: 0.3 },
    );
  });

  const show = (targets: Element[]) => animate(targets, SHOWN, { duration: 0.9, ease: EASE, delay: stagger(0.12) });
  inView("[data-reveal]", (el) => void show([el]), { amount: 0.3 });
  inView("[data-reveal-stagger]", (el) => void show([...el.children]), { margin: "0px 0px -30% 0px" });

  inView("[data-grow]", (bar) => void animate(bar, { transform: "scaleX(1)" }, { duration: 0.9, ease: EASE }));
  $$("[data-count]").forEach((counter) =>
    inView(counter, () => {
      animate(0, Number(counter.dataset.count), { duration: 1.8, ease: "easeOut", onUpdate: (value) => (counter.textContent = String(Math.round(value))) });
    }),
  );

  const hero = $("#hero");
  const [heroText, heroBg] = [$("[data-hero-fade]"), $("[data-hero-bg]")];
  scroll(
    (progress) => {
      const fade = Math.min(progress / 0.6, 1);
      heroText.style.opacity = String(1 - fade);
      heroText.style.transform = `translateY(${-80 * fade}px)`;
      heroBg.style.translate = `0 ${progress * 8}%`;
    },
    { target: hero, offset: ["start start", "end start"] },
  );

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
