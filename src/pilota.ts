import { $, $$, bindWaitlist, motion, navScroll } from "./shared";

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

navScroll();
motion();
