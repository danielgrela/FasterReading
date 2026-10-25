// Controlador de UI: conecta el DOM con el extractor de PDF y el motor RSVP.
// El ?v= debe coincidir con el de index.html (rompe la caché del navegador).
import { extractTextFromPdf, tokenizeWithBreaks } from "./pdf-extractor.js?v=4";
import { Reader, findTarget, msPerWord, pivotIndex } from "./reader.js?v=4";

const $ = (id) => document.getElementById(id);
const el = {
  input: $("pdfInput"),
  fileName: $("fileName"),
  word: $("word"),
  message: $("message"),
  play: $("playBtn"),
  pause: $("pauseBtn"),
  reset: $("resetBtn"),
  wpmRange: $("wpmRange"),
  wpmInput: $("wpmInput"),
  counter: $("counter"),
  gotoInput: $("gotoInput"),
  gotoBtn: $("gotoBtn"),
  msOut: $("msOut"),
  progress: $("progress"),
  progressText: $("progressText"),
  theme: $("themeBtn"),
  breakToggle: $("breakToggle"),
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
  el.progress.value = index;
  el.progressText.textContent = total
    ? `${index + 1} / ${total} (${Math.round(((index + 1) / total) * 100)}%)`
    : "0 / 0";
  el.counter.textContent = `Palabra ${total ? (index + 1).toLocaleString("es") : 0} de ${total.toLocaleString("es")}`;
}

function renderState(playing) {
  const has = reader.words.length > 0;
  el.play.disabled = !has || playing;
  el.pause.disabled = !has || !playing;
  el.reset.disabled = !has;
  // "Ir a" solo se desactiva durante la reproducción.
  el.gotoInput.disabled = playing;
  el.gotoBtn.disabled = playing;
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
  }
});
el.wpmInput.addEventListener("change", (e) => applyWpm(e.target.value));

// ---------- Frases separadas ----------
const BREAK_PAUSE_MS = 1000; // pausa extra tras cada frase y cada párrafo

function applyBreakMode(on) {
  el.breakToggle.checked = on;
  reader.setBreakPause(on ? BREAK_PAUSE_MS : 0);
  store.set("fr.breaks", on ? "1" : "0");
}
el.breakToggle.addEventListener("change", (e) => {
  applyBreakMode(e.target.checked);
  e.target.blur(); // devuelve los atajos de teclado (Espacio = play/pausa)
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
    const raw = await extractTextFromPdf(file, (p, t) => setMessage(`Extrayendo texto… página ${p} de ${t}`));
    const { words, paragraphEnds } = tokenizeWithBreaks(raw);

    if (words.length === 0) {
      clearDocument();
      setMessage("No se encontró texto. Puede ser un PDF escaneado (solo imágenes) y requeriría OCR.", true);
      return;
    }

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

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // no interferir con Ctrl+R, etc.
  if (e.target instanceof HTMLInputElement && e.target.type === "range" && e.key.startsWith("Arrow")) return; // deja a los sliders su comportamiento
  if (e.target instanceof HTMLInputElement && e.target.type !== "range") return; // se está escribiendo en un campo
  if (e.key === " " && e.target instanceof HTMLButtonElement) return; // el botón ya gestiona su click
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
renderWord("", 0, 0);
renderState(false);

// Exponer para pruebas
window.__reader = reader;
