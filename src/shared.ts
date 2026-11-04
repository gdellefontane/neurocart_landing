import "./styles.css";

export const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
export const $$ = <T extends HTMLElement>(selector: string, root: ParentNode = document) => [...root.querySelectorAll<T>(selector)];

declare global {
  interface Window {
    turnstile?: { reset: (container: Element) => void };
  }
}

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

export const stage = () => {
  if (matchMedia("(max-height: 500px)").matches) return;
  const [nav, scroller, links] = [$("#nav"), $(".scroller"), $("#links")];
  const scenes = $$("section.scene");
  const height = () => $(".stage").clientHeight;
  scroller.style.setProperty("--n", String(scenes.length));
  scroller.insertAdjacentHTML("beforeend", scenes.map((_, n) => `<i class="snap" style="top:${n * 100}svh"></i>`).join(""));
  links.insertAdjacentHTML("beforeend", scenes.filter((scene) => scene.dataset.nav).map((scene) => `<a href="#${scene.id}" style="--c:${scene.style.getPropertyValue("--c")}">${scene.dataset.nav}</a>`).join(""));

  let current = -1;
  let timers: number[] = [];
  const play = (scene: HTMLElement) => {
    timers.forEach(clearTimeout);
    timers = [];
    const seq = $$("[data-seq]", scene).sort((a, b) => +a.dataset.seq! - +b.dataset.seq!);
    const loop = () => {
      seq.forEach((el) => el.classList.remove("in"));
      seq.forEach((el, k) => timers.push(setTimeout(() => el.classList.add("in"), 500 + k * 900)));
      timers.push(setTimeout(loop, 500 + seq.length * 900 + 3800));
    };
    if (seq.length && !REDUCED) loop();
    else seq.forEach((el) => el.classList.add("in"));
    const chips = scene.querySelector<HTMLElement>("[data-cycle]");
    if (!chips || REDUCED) return;
    const rows = [...scene.querySelectorAll(".sets .row")];
    const items = [...chips.children];
    let k = 0;
    const tick = () => {
      k = (k + 1) % items.length;
      items.forEach((chip, j) => chip.classList.toggle("on", j === k));
      rows.forEach((row, j) => row.classList.toggle("on", j === k));
      timers.push(setTimeout(tick, 2600));
    };
    timers.push(setTimeout(tick, 2600));
  };

  const show = (n: number) => {
    if (n === current) return;
    current = n;
    scenes.forEach((scene, k) => {
      scene.classList.toggle("on", k === n);
      scene.inert = k !== n;
    });
    document.body.dataset.s = String(n % 7);
    history.replaceState(null, "", n ? `#${scenes[n].id}` : location.pathname + location.search);
    const active = [...links.children].find((a) => (a as HTMLAnchorElement).hash === `#${scenes[n].id}`);
    [...links.children].forEach((a) => a.toggleAttribute("aria-current", a === active));
    active && links.scrollTo({ left: (active as HTMLElement).offsetLeft - 24, behavior: REDUCED ? "auto" : "smooth" });
    play(scenes[n]);
  };
  const sync = () => {
    show(Math.min(scenes.length - 1, Math.max(0, Math.round(scrollY / height()))));
    nav.classList.toggle("mini", scrollY > 40);
  };
  addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  addEventListener("resize", sync);
  document.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
    const n = link && link.pathname === location.pathname ? scenes.findIndex((scene) => scene.id === (link.hash.slice(1) || "top")) : -1;
    if (n < 0) return;
    event.preventDefault();
    scrollTo({ top: n * height(), behavior: "instant" });
  });
  const start = scenes.findIndex((scene) => scene.id === location.hash.slice(1));
  if (start > 0) scrollTo({ top: start * height(), behavior: "instant" });
  sync();
};
