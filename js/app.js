// Controlador de UI: conecta el DOM con el extractor de PDF y el motor RSVP.
// El ?v= debe coincidir con el de index.html (rompe la caché del navegador).
import { extractPagesFromPdf, tokenizePages } from "./pdf-extractor.js?v=11";
import { Reader, findPage, findTarget, formatRemaining, msPerWord, pageAt, pivotIndex } from "./reader.js?v=11";

const $ = (id) => document.getElementById(id);
const el = {
  input: $("pdfInput"),
  fileName: $("fileName"),
  word: $("word"),
  prevWord: $("prevWord"),
  nextWord: $("nextWord"),
  message: $("message"),
  play: $("playBtn"),
  pause: $("pauseBtn"),
  reset: $("resetBtn"),
  wpmRange: $("wpmRange"),
  wpmInput: $("wpmInput"),
  counter: $("counter"),
  gotoInput: $("gotoInput"),
  gotoBtn: $("gotoBtn"),
  pageInput: $("pageInput"),
  pageBtn: $("pageBtn"),
  msOut: $("msOut"),
  progress: $("progress"),
  progressText: $("progressText"),
  theme: $("themeBtn"),
  breakToggle: $("breakToggle"),
  contextToggle: $("contextToggle"),
  options: $("options"),
  drop: $("dropzone"),
};
const wLeft = el.word.querySelector(".w-left");
const wPivot = el.word.querySelector(".w-pivot");
const wRight = el.word.querySelector(".w-right");

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento */
    }
  },
};

// Índice de la primera palabra de cada página del PDF cargado (ver tokenizePages).
let pageStarts = [];

// Partes del contador que se pueden ocultar desde Opciones: casilla y clave de localStorage.
// Todas visibles por defecto.
const COUNTER_PARTS = {
  word: { input: $("hideWord"), key: "fr.hideWord" },
  page: { input: $("hidePage"), key: "fr.hidePage" },
  percent: { input: $("hidePercent"), key: "fr.hidePercent" },
  time: { input: $("hideTime"), key: "fr.hideTime" },
};
const hidden = { word: false, page: false, percent: false, time: false };

// ---------- Motor ----------
const reader = new Reader({
  onWord: renderWord,
  onState: renderState,
  onEnd: () => setMessage("Fin del documento. Pulsa Play para volver a empezar."),
});

function renderWord(word, index, total) {
  el.word.classList.toggle("idle", !word);
  if (!word) {
    wLeft.textContent = "";
    wPivot.textContent = "·";
    wRight.textContent = "";
  } else {
    const chars = [...word];
    const p = pivotIndex(word);
    wLeft.textContent = chars.slice(0, p).join("");
    wPivot.textContent = chars[p];
    wRight.textContent = chars.slice(p + 1).join("");
  }
  // Contexto: palabra anterior encima y siguiente debajo, atenuadas (ver .ctx en el CSS).
  el.prevWord.textContent = word ? (reader.words[index - 1] ?? "") : "";
  el.nextWord.textContent = word ? (reader.words[index + 1] ?? "") : "";
  el.progress.value = index;
  el.progressText.textContent = total
    ? `${index + 1} / ${total} (${Math.round(((index + 1) / total) * 100)}%)`
    : "0 / 0";
  renderCounter(index, total);
}

// Contador superior. También se llama al cambiar el WPM o las frases separadas,
// porque el tiempo restante depende de ambos.
function renderCounter(index = reader.index, total = reader.words.length) {
  const page = total ? pageAt(pageStarts, index) + 1 : 0;
  // Porcentaje leído: la palabra actual cuenta como leída, así la última da 100 %.
  const percent = total ? Math.floor(((index + 1) / total) * 100) : 0;
  // Solo las partes que no se han ocultado en Opciones; sin ninguna, el contador desaparece.
  const parts = [];
  if (!hidden.word)
    parts.push(`Palabra ${total ? (index + 1).toLocaleString("es") : 0} de ${total.toLocaleString("es")}`);
  if (!hidden.page) parts.push(`Página ${page.toLocaleString("es")} de ${pageStarts.length.toLocaleString("es")}`);
  if (!hidden.percent) parts.push(`${percent} % leído`);
  if (!hidden.time) parts.push(`${total ? formatRemaining(reader.remainingMs()) : "0 min"} restantes`);
  // Espacios duros dentro de cada bloque: en pantallas estrechas solo se parte entre bloques.
  el.counter.textContent = parts.map((s) => s.replaceAll(" ", "\u00a0")).join(" · ");
  el.counter.hidden = parts.length === 0;
}

function renderState(playing) {
  const has = reader.words.length > 0;
  el.play.disabled = !has || playing;
  el.pause.disabled = !has || !playing;
  el.reset.disabled = !has;
  // "Ir a" solo se desactiva durante la reproducción.
  el.gotoInput.disabled = playing;
  el.gotoBtn.disabled = playing;
  el.pageInput.disabled = playing;
  el.pageBtn.disabled = playing;
  if (playing) setMessage("");
}

function setMessage(text, isError = false) {
  el.message.textContent = text;
  el.message.classList.toggle("error", isError);
}

// ---------- WPM ----------
const WPM_MIN = 50;
const WPM_MAX = 700;

function applyWpm(value) {
  const wpm = Math.max(WPM_MIN, Math.min(WPM_MAX, Math.round(Number(value)) || 300));
  el.wpmRange.value = wpm;
  el.wpmInput.value = wpm;
  el.msOut.textContent = `${msPerWord(wpm).toFixed(0)} ms/palabra`;
  reader.setWpm(wpm);
  store.set("fr.wpm", String(wpm));
  renderCounter();
}
el.wpmRange.addEventListener("input", (e) => applyWpm(e.target.value));
// Valor manual: mientras se escribe, el slider lo sigue en cuanto el número es válido;
// al confirmar (Enter o al salir del campo) se ajusta al rango.
el.wpmInput.addEventListener("input", (e) => {
  const v = Number(e.target.value);
  if (e.target.value !== "" && v >= WPM_MIN && v <= WPM_MAX) {
    el.wpmRange.value = v;
    el.msOut.textContent = `${msPerWord(v).toFixed(0)} ms/palabra`;
    reader.setWpm(v);
    store.set("fr.wpm", String(v));
    renderCounter();
  }
});
el.wpmInput.addEventListener("change", (e) => applyWpm(e.target.value));

// ---------- Frases separadas ----------
const BREAK_FACTOR = 2; // pausa extra tras cada frase y párrafo: el doble de los ms/palabra

function applyBreakMode(on) {
  el.breakToggle.checked = on;
  reader.setBreakFactor(on ? BREAK_FACTOR : 0);
  store.set("fr.breaks", on ? "1" : "0");
  renderCounter();
}
el.breakToggle.addEventListener("change", (e) => {
  applyBreakMode(e.target.checked);
  e.target.blur(); // devuelve los atajos de teclado (Espacio = play/pausa)
});

// ---------- Palabras de contexto (anterior y siguiente) ----------
function applyContext(on) {
  el.contextToggle.checked = on;
  el.prevWord.hidden = !on;
  el.nextWord.hidden = !on;
  store.set("fr.context", on ? "1" : "0");
}
el.contextToggle.addEventListener("change", (e) => {
  applyContext(e.target.checked);
  e.target.blur(); // devuelve los atajos de teclado
});

// ---------- Opciones: ocultar partes del contador ----------
function applyHidden(part, on) {
  hidden[part] = on;
  COUNTER_PARTS[part].input.checked = on;
  store.set(COUNTER_PARTS[part].key, on ? "1" : "0");
  renderCounter();
}
for (const [part, { input }] of Object.entries(COUNTER_PARTS)) {
  input.addEventListener("change", (e) => {
    applyHidden(part, e.target.checked);
    e.target.blur(); // devuelve los atajos de teclado
  });
}

// ---------- Menú de opciones ----------
const optionsSummary = el.options.querySelector("summary");
// Con el ratón se quita el foco al abrir o cerrar, para que Espacio siga siendo play/pausa;
// con el teclado (detail === 0) se mantiene, para poder recorrer el menú.
optionsSummary.addEventListener("click", (e) => {
  if (e.detail > 0) optionsSummary.blur();
});
// Se cierra al hacer clic fuera o con Escape.
document.addEventListener("click", (e) => {
  if (el.options.open && !el.options.contains(e.target)) el.options.open = false;
});
el.options.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && el.options.open) {
    el.options.open = false;
    optionsSummary.focus();
  }
});

// ---------- Carga de PDF ----------
async function loadFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    setMessage("El archivo no es un PDF.", true);
    return;
  }
  reader.pause();
  el.fileName.textContent = file.name;
  el.fileName.title = file.name;
  setMessage("Leyendo PDF…");

  try {
    const pages = await extractPagesFromPdf(file, (p, t) => setMessage(`Extrayendo texto… página ${p} de ${t}`));
    const { words, paragraphEnds, pageStarts: starts } = tokenizePages(pages);

    if (words.length === 0) {
      clearDocument();
      setMessage("No se encontró texto. Puede ser un PDF escaneado (solo imágenes) y requeriría OCR.", true);
      return;
    }

    pageStarts = starts;
    reader.load(words, paragraphEnds);
    el.progress.max = words.length - 1;
    el.progress.disabled = false;
    renderState(false);
    setMessage(`${words.length.toLocaleString("es")} palabras listas. Pulsa Play (o Espacio).`);
  } catch (err) {
    console.error(err);
    clearDocument();
    setMessage(`No se pudo leer el PDF: ${err.message || err}`, true);
  }
}

// Vacía el lector y deja la barra de progreso como al inicio.
function clearDocument() {
  pageStarts = [];
  reader.load([]);
  el.progress.max = 0;
  el.progress.disabled = true;
  renderState(false);
}

el.input.addEventListener("change", (e) => {
  loadFile(e.target.files[0]);
  e.target.value = ""; // permite volver a elegir el mismo archivo
});

// Arrastrar y soltar
let dragDepth = 0;
window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragDepth++;
  el.drop.hidden = false;
});
window.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    el.drop.hidden = true;
  }
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  el.drop.hidden = true;
  loadFile(e.dataTransfer.files[0]);
});

// ---------- Controles ----------
el.play.addEventListener("click", () => reader.play());
el.pause.addEventListener("click", () => reader.pause());
el.reset.addEventListener("click", () => {
  reader.reset();
  setMessage("");
});
el.progress.addEventListener("input", (e) => reader.seek(Number(e.target.value)));

// Ir a una posición (número) o a la siguiente aparición de una palabra.
// Sin <form>: así nunca hay un envío que recargue la página y descarte el PDF.
function goTo() {
  if (reader.playing) return;
  if (!reader.words.length) {
    setMessage("Sube un PDF primero.", true);
    return;
  }
  const i = findTarget(reader.words, el.gotoInput.value, reader.index);
  if (i < 0) {
    setMessage(`No se encontró «${el.gotoInput.value.trim()}».`, true);
    return;
  }
  reader.seek(i);
  setMessage(`Palabra ${i + 1}. Pulsa Play para seguir desde aquí.`);
  el.gotoInput.blur(); // devuelve los atajos de teclado
}
el.gotoBtn.addEventListener("click", goTo);
el.gotoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    goTo();
  }
});

// Ir al principio de una página: su primera línea, nunca el final de una frase de la anterior.
function goToPage() {
  if (reader.playing) return;
  if (!reader.words.length) {
    setMessage("Sube un PDF primero.", true);
    return;
  }
  const asked = Number(el.pageInput.value);
  if (el.pageInput.value.trim() === "" || !Number.isInteger(asked)) {
    setMessage("Escribe un número de página.", true);
    return;
  }
  const target = findPage(pageStarts, asked, reader.words.length);
  if (!target) {
    setMessage(`No hay texto a partir de la página ${asked}.`, true);
    return;
  }
  reader.seek(target.index);
  const clamped = Math.max(1, Math.min(pageStarts.length, asked));
  setMessage(
    target.page === clamped
      ? `Página ${target.page}. Pulsa Play para seguir desde aquí.`
      : `La página ${clamped} no tiene texto: vas a la página ${target.page}. Pulsa Play para seguir.`,
  );
  el.pageInput.blur(); // devuelve los atajos de teclado
}
el.pageBtn.addEventListener("click", goToPage);
el.pageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    goToPage();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // no interferir con Ctrl+R, etc.
  if (e.target instanceof HTMLInputElement && e.target.type === "range" && e.key.startsWith("Arrow")) return; // deja a los sliders su comportamiento
  if (e.target instanceof HTMLInputElement && e.target.type !== "range") return; // se está escribiendo en un campo
  if (e.key === " " && e.target instanceof Element && e.target.closest("button, summary")) return; // el botón (o el menú) ya gestiona su click
  switch (e.key) {
    case " ":
      e.preventDefault();
      if (reader.words.length) reader.toggle();
      break;
    case "r":
    case "R":
      reader.reset();
      break;
    case "ArrowLeft":
      reader.skip(-10);
      break;
    case "ArrowRight":
      reader.skip(10);
      break;
    case "ArrowUp":
      e.preventDefault();
      applyWpm(reader.wpm + 10);
      break;
    case "ArrowDown":
      e.preventDefault();
      applyWpm(reader.wpm - 10);
      break;
    default:
      return;
  }
});

// ---------- Tema (oscuro por defecto) ----------
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set("fr.theme", t);
}
el.theme.addEventListener("click", () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"),
);

// ---------- Init ----------
setTheme(store.get("fr.theme") === "light" ? "light" : "dark");
applyWpm(store.get("fr.wpm") || 300);
applyBreakMode(store.get("fr.breaks") !== "0"); // activado por defecto
applyContext(store.get("fr.context") !== "0"); // activado por defecto
for (const [part, { key }] of Object.entries(COUNTER_PARTS)) applyHidden(part, store.get(key) === "1"); // visibles por defecto
renderWord("", 0, 0);
renderState(false);

// Exponer para pruebas
window.__reader = reader;
