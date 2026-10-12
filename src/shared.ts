import { animate, inView, scroll, stagger } from "motion";
import "./styles.css";

const SHOWN = { opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" };
const EASE = [0.16, 1, 0.3, 1] as const;
export const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
export const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];

declare global {
  interface Window {
    turnstile?: { reset: (container: Element) => void };
  }
}

export const navScroll = () => {
  const nav = $("#nav");
  scroll((_, { y }) => nav.classList.toggle("scrolled", y.current > 80));
};

export const bindWaitlist = (form: HTMLFormElement, body: (data: FormData) => object) =>
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body(data), turnstileToken: data.get("cf-turnstile-response") || undefined }),
    }).catch(() => null);
    if (!res?.ok) window.turnstile?.reset(form.querySelector(".cf-turnstile")!);
    form.classList.toggle("done", !!res?.ok);
    form.querySelector("[role=status]")!.textContent = res?.ok ? form.dataset.ok! : form.dataset.err!;
  });

export const motion = () => {
  if (REDUCED) return;
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

  const [heroText, heroBg] = [$("[data-hero-fade]"), $("[data-hero-bg]")];
  scroll(
    (progress) => {
      const fade = Math.min(progress / 0.6, 1);
      heroText.style.opacity = String(1 - fade);
      heroText.style.transform = `translateY(${-80 * fade}px)`;
      heroBg.style.translate = `0 ${progress * 8}%`;
    },
    { target: $("#hero"), offset: ["start start", "end start"] },
  );
};
