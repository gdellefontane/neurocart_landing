import { animate, inView, scroll, stagger } from "motion";
import { $, $$, REDUCED, bindWaitlist } from "./shared";

const SHOWN = { opacity: 1, transform: "translateY(0px) scale(1)", filter: "blur(0px)" };
const EASE = [0.16, 1, 0.3, 1] as const;

const motion = () => {
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

const form = $<HTMLFormElement>("#candidatura");
const closed = document.documentElement.dataset.pilot === "closed";
const params = new URLSearchParams(location.search);
$$<HTMLInputElement>("[data-utm]").forEach((input) => {
  const value = params.get(input.dataset.utm!) ?? "";
  input.value = /^[\w.-]{1,64}$/.test(value) ? value : "";
});
if (closed) {
  $$<HTMLFieldSetElement>("fieldset").forEach((fieldset) => (fieldset.disabled = true));
  form.dataset.ok = form.dataset.okClosed;
}

bindWaitlist(form, (data) => ({
  ...Object.fromEntries([...data].filter(([key, value]) => value !== "" && key !== "cf-turnstile-response")),
  consent: true,
  pilotTerms: data.has("pilotTerms"),
  marketing: data.has("marketing"),
  source: closed ? "launch" : "pilot",
}));

addEventListener("scroll", () => $("#nav").classList.toggle("mini", scrollY > 40), { passive: true });
motion();
