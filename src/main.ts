import { handle, readImport } from "./actions";
import { render, searchHtml } from "./page";
import { boot } from "./store";
import "./styles.css";

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
window.addEventListener("hashchange", draw);

app?.addEventListener("click", (event) => {
  const node = (event.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!node) return;
  handle(node.dataset.act || "", node);
  draw();
});

app?.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  if (target.id === "practice-subject") {
    const subject = (target as HTMLSelectElement).value;
    document.querySelectorAll<HTMLOptionElement>("#practice-concept option").forEach((option) => {
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
  if (target.id !== "search") return;
  const out = document.querySelector("#search-out");
  if (out) out.innerHTML = searchHtml((target as HTMLInputElement).value);
});

document.addEventListener("keydown", (event) => {
  const tag = (event.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
