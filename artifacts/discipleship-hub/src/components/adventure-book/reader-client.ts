/* Client behaviour for the Adventure web-book prototype.
   Everything is stored in this browser only (localStorage). No network calls
   except fetching Scripture text from the site's own /api/bible endpoint. */
import { fetchPassage, errMsg } from "@/components/bible-reader/reader-utils";
import type { Translation } from "@/components/bible-reader/study-storage";

const KEY = "jo-adventure-book";
const LAST = `${KEY}:last`;
const PREFS = `${KEY}:prefs`;
const noteKey = (slug: string) => `${KEY}:note:${slug}`;

type Prefs = { size: number; dark: boolean };

function safeGet(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string): boolean {
  try { window.localStorage.setItem(k, v); return true; } catch { return false; }
}
function safeRemove(k: string): boolean {
  try { window.localStorage.removeItem(k); return true; } catch { return false; }
}

export function readPrefs(): Prefs {
  try {
    const p = JSON.parse(safeGet(PREFS) || "{}");
    const size = Number.isInteger(p.size) && p.size >= 1 && p.size <= 4 ? p.size : 2;
    return { size, dark: p.dark === true };
  } catch { return { size: 2, dark: false }; }
}

/* ---------------- intro / contents page ---------------- */
export function initResume(root: HTMLElement) {
  const slot = root.querySelector<HTMLElement>("[data-resume]");
  if (!slot) return;
  let valid: Record<string, string> = {};
  try { valid = JSON.parse(slot.dataset.readings || "{}"); } catch { valid = {}; }
  const saved = safeGet(LAST);
  // Only accept a slug we actually publish; never build a URL from raw storage.
  if (!saved || !Object.prototype.hasOwnProperty.call(valid, saved)) return;
  const link = slot.querySelector<HTMLAnchorElement>("a");
  const label = slot.querySelector<HTMLElement>("[data-resume-title]");
  if (!link || !label) return;
  link.href = `${slot.dataset.base}/${saved}`;
  label.textContent = valid[saved];
  slot.hidden = false;
}

/* ---------------- reading page ---------------- */
export function initReading(root: HTMLElement) {
  const slug = root.dataset.slug!;
  safeSet(LAST, slug);
  initPrefs(root);
  initReflection(root, slug);
  initToc(root);
  initScripture(root);
}

function initPrefs(root: HTMLElement) {
  const prefs = readPrefs();
  const apply = () => {
    root.dataset.size = String(prefs.size);
    root.dataset.surface = prefs.dark ? "dark" : "light";
    const dec = root.querySelector<HTMLButtonElement>("[data-size-dec]");
    const inc = root.querySelector<HTMLButtonElement>("[data-size-inc]");
    const dark = root.querySelector<HTMLButtonElement>("[data-dark]");
    if (dec) dec.disabled = prefs.size <= 1;
    if (inc) inc.disabled = prefs.size >= 4;
    if (dark) {
      dark.setAttribute("aria-pressed", String(prefs.dark));
      const t = dark.querySelector("[data-dark-label]");
      if (t) t.textContent = prefs.dark ? "Light page" : "Dark page";
    }
    safeSet(PREFS, JSON.stringify(prefs));
  };
  root.querySelector("[data-size-dec]")?.addEventListener("click", () => { prefs.size = Math.max(1, prefs.size - 1); apply(); });
  root.querySelector("[data-size-inc]")?.addEventListener("click", () => { prefs.size = Math.min(4, prefs.size + 1); apply(); });
  root.querySelector("[data-dark]")?.addEventListener("click", () => { prefs.dark = !prefs.dark; apply(); });
  apply();
}

function initReflection(root: HTMLElement, slug: string) {
  const box = root.querySelector<HTMLElement>("[data-reflection]");
  if (!box) return;
  const ta = box.querySelector<HTMLTextAreaElement>("textarea")!;
  const status = box.querySelector<HTMLElement>("[data-status]")!;
  const clearBtn = box.querySelector<HTMLButtonElement>("[data-clear]")!;
  const mailBtn = box.querySelector<HTMLAnchorElement>("[data-mail-note]")!;
  const prompt = box.dataset.prompt || "";
  const title = root.dataset.title || "";

  const setStatus = (text: string, state: "idle" | "saved" | "error" = "idle") => {
    status.textContent = text;
    status.dataset.state = state;
  };
  const time = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const refreshMail = () => {
    const text = ta.value.trim();
    clearBtn.disabled = text.length === 0;
    mailBtn.setAttribute("aria-disabled", String(text.length === 0));
    const body = `${title}\n\n${prompt}\n\n${ta.value}\n\n${window.location.href}`;
    mailBtn.href = `mailto:?subject=${encodeURIComponent(`My reflection: ${title}`)}&body=${encodeURIComponent(body)}`;
  };

  const stored = safeGet(noteKey(slug));
  let storageOk = true;
  try { window.localStorage.getItem("__t"); } catch { storageOk = false; }
  if (!storageOk) {
    setStatus("This browser is blocking local storage, so your note cannot be saved here. Copy it somewhere safe before leaving.", "error");
  } else if (stored) {
    ta.value = stored;
    setStatus("Saved earlier in this browser.", "saved");
  }
  refreshMail();

  const save = () => {
    const v = ta.value;
    const ok = v.trim() ? safeSet(noteKey(slug), v) : safeRemove(noteKey(slug));
    if (ok) setStatus(v.trim() ? `Saved in this browser at ${time()}.` : "Nothing saved for this reading.", "saved");
    else setStatus("Could not save. Your browser storage may be full or blocked. Copy your note before leaving this page.", "error");
    refreshMail();
  };
  // Write synchronously on every input so nothing is lost on navigation.
  ta.addEventListener("input", save);
  window.addEventListener("pagehide", () => { if (ta.value.trim()) safeSet(noteKey(slug), ta.value); });

  clearBtn.addEventListener("click", () => {
    if (!ta.value.trim()) return;
    if (!window.confirm("Clear your note for this reading? This removes it from this browser and cannot be undone.")) return;
    ta.value = "";
    if (safeRemove(noteKey(slug))) setStatus("Note cleared from this browser.", "saved");
    else setStatus("Could not clear the saved note. Your browser storage may be blocked.", "error");
    refreshMail();
    ta.focus();
  });
  mailBtn.addEventListener("click", e => {
    if (!ta.value.trim()) { e.preventDefault(); setStatus("Write something first, then you can email it to yourself.", "idle"); }
  });
}

function initToc(root: HTMLElement) {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(".rd-toc a[data-sec]"));
  if (!links.length || !("IntersectionObserver" in window)) return;
  const map = new Map(links.map(a => [a.dataset.sec!, a]));
  const heads = Array.from(map.keys()).map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  const set = (id: string) => links.forEach(a => a.setAttribute("aria-current", String(a.dataset.sec === id)));
  const io = new IntersectionObserver(entries => {
    const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (vis[0]) set(vis[0].target.id);
  }, { rootMargin: "-90px 0px -65% 0px" });
  heads.forEach(h => io.observe(h));
}

/* ---------------- Scripture overlay (local NET Bible) ---------------- */
function initScripture(root: HTMLElement) {
  const dialog = document.querySelector<HTMLDialogElement>("#rd-scripture");
  if (!dialog || typeof dialog.showModal !== "function") return; // links still navigate to /bible
  const titleEl = dialog.querySelector<HTMLElement>("[data-title]")!;
  const body = dialog.querySelector<HTMLElement>("[data-body]")!;
  const attr = dialog.querySelector<HTMLElement>("[data-attr]")!;
  const open = dialog.querySelector<HTMLAnchorElement>("[data-open]")!;
  const baseUrl = root.dataset.base || "/";
  let controller: AbortController | null = null;
  let lastTrigger: HTMLElement | null = null;

  const load = async (a: HTMLAnchorElement) => {
    const book = a.dataset.refBook!;
    const chapter = Number(a.dataset.refChapter);
    const verse = a.dataset.refVerse ? Number(a.dataset.refVerse) : undefined;
    const end = a.dataset.refEnd ? Number(a.dataset.refEnd) : verse;
    titleEl.textContent = `${book} ${chapter}${verse ? `:${verse}${end && end !== verse ? `–${end}` : ""}` : ""}`;
    open.href = a.href;
    attr.textContent = "NET Bible";
    body.innerHTML = '<div class="rd-skel"></div><div class="rd-skel"></div><div class="rd-skel" style="width:70%"></div>';
    controller?.abort();
    controller = new AbortController();
    try {
      const p = await fetchPassage(baseUrl, { book, chapter, translation: "net" as Translation }, controller.signal);
      const frag = document.createDocumentFragment();
      const list = verse ? p.verses.filter(v => v.verse >= verse && v.verse <= (end ?? verse)) : p.verses;
      (list.length ? list : p.verses).forEach(v => {
        const para = document.createElement("p");
        const sup = document.createElement("sup");
        sup.textContent = String(v.verse);
        para.append(sup, document.createTextNode(v.text));
        frag.append(para);
      });
      body.replaceChildren(frag);
      if (p.attribution) attr.textContent = p.attribution;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      body.replaceChildren();
      const msg = document.createElement("p");
      msg.textContent = errMsg(e, "The passage could not be loaded.");
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "rd-btn";
      retry.style.marginTop = "0.75rem";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => load(a));
      body.append(msg, retry);
    }
  };

  root.addEventListener("click", e => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.scripture-ref");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    lastTrigger = a;
    dialog.showModal();
    void load(a);
  });
  dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => { controller?.abort(); lastTrigger?.focus(); });
}
