import "@fontsource-variable/roboto";
import { handle, readImport, expireSimulation } from "./actions";
import { render, searchHtml } from "./page";
import { boot } from "./store";
import "./styles.css";
import "./academy.css";

const app = document.querySelector<HTMLElement>("#app");

function draw() {
  if (!app) return;
  const path = (location.hash || "#/").replace(/^#/, "");
  const focusId = document.activeElement?.id;
  app.innerHTML = render(path.startsWith("/") ? path : `/${path}`);
  if (focusId === "search") {
    const input = document.querySelector<HTMLInputElement>("#search");
    if (input) {
      input.focus();
      const value = input.value;
      input.setSelectionRange(value.length, value.length);
    }
  }
}

boot();
draw();
window.addEventListener("hashchange", () => {
  draw();
  document.querySelector<HTMLElement>("#contenido")?.focus();
  window.scrollTo(0, 0);
});

window.setInterval(() => {
  const timer = document.querySelector<HTMLElement>("#sim-timer");
  if (!timer) return;
  const remaining = Math.max(0, Math.ceil((Number(timer.dataset.deadline) - Date.now()) / 1000));
  timer.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  if (!remaining && expireSimulation()) draw();
}, 250);

app?.addEventListener("click", (event) => {
  if ((event.target as HTMLElement).closest("[data-skip]")) {
    event.preventDefault();
    document.querySelector<HTMLElement>("#contenido")?.focus();
    return;
  }
  const node = (event.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!node) return;
  const path = location.hash;
  handle(node.dataset.act || "", node);
  if (path === location.hash) {
    draw();
    const focus = document.querySelector<HTMLElement>("#feedback:not(:empty)") ?? document.querySelector<HTMLElement>("#contenido");
    focus?.focus();
  }
});

app?.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  if (target.id === "practice-subject" || target.id === "sim-subject") {
    const subject = (target as HTMLSelectElement).value;
    const concept = document.querySelector<HTMLSelectElement>(target.id === "practice-subject" ? "#practice-concept" : "#sim-concept");
    if (concept) concept.value = "";
    if (target.id === "sim-subject") {
      document.querySelectorAll<HTMLElement>("[data-sim-history]").forEach((history) => {
        history.hidden = history.dataset.simHistory !== subject;
      });
      const scoring = document.querySelector<HTMLDetailsElement>(".sim-ad");
      if (scoring) {
        scoring.hidden = subject !== "ad";
        scoring.open = subject === "ad";
      }
    }
    concept?.querySelectorAll<HTMLOptionElement>("option").forEach((option) => {
      option.hidden = !!option.dataset.subject && option.dataset.subject !== subject;
    });
  }
  if (target.id === "import-file") {
    const file = (target as HTMLInputElement).files?.[0];
    if (file) readImport(file);
  }
});

app?.addEventListener("input", (event) => {
  const target = event.target as HTMLElement;
  if (target.id === "java-draft") {
    localStorage.setItem("programate.java-draft", (target as HTMLTextAreaElement).value);
    return;
  }
  if (target.id !== "search") return;
  const out = document.querySelector("#search-out");
  if (out) out.innerHTML = searchHtml((target as HTMLInputElement).value);
});

document.addEventListener("keydown", (event) => {
  const tag = (event.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
  if (!location.hash.startsWith("#/sesion")) return;
  const letter = event.key.toLowerCase();
  if ("abcdef".includes(letter) && letter.length === 1) {
    const input = document.querySelector<HTMLInputElement>(`#ops input[value="${letter}"]`);
    if (!input || input.disabled) return;
    if (input.type === "radio") input.checked = true;
    else input.checked = !input.checked;
  }
  if (event.key === "Enter") {
    const button = document.querySelector<HTMLButtonElement>("[data-act='check'], [data-act='next'], [data-act='sim-next']");
    button?.click();
  }
});
