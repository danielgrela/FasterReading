// Motor RSVP: gestiona el índice actual y el temporizador.
// Fórmula exacta: intervalo (ms) = (60 / WPM) * 1000
// (+ la pausa de "frases separadas" tras fin de frase o párrafo, si está activa:
//  breakFactor × ese mismo intervalo)

export function msPerWord(wpm) {
  return (60 / wpm) * 1000;
}

/**
 * Índice del carácter "pivote" (ORP, Optimal Recognition Point) de una palabra.
 * Es la letra que se resalta y que queda alineada en el centro de la pantalla.
 */
export function pivotIndex(word) {
  const len = [...word].length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

// Abreviaturas frecuentes cuyo punto no cierra la frase.
const ABBREVIATIONS = new Set([
  "sr",
  "sra",
  "srta",
  "dr",
  "dra",
  "ud",
  "uds",
  "vd",
  "vds",
  "pág",
  "págs",
  "núm",
  "nº",
  "art",
  "cap",
  "fig",
  "vol",
  "ej",
  "aprox",
  "mr",
  "mrs",
  "ms",
  "vs",
]);

/**
 * ¿La palabra cierra una frase? Termina en . ! ? o …, aunque detrás vengan
 * comillas o paréntesis de cierre. Ignora iniciales ("J.") y abreviaturas ("Sr.").
 */
export function endsSentence(word) {
  const m = /^(.*?)([.!?…]+)["'»”’)\]]*$/u.exec(word);
  if (!m) return false;
  if (m[2] === ".") {
    const base = m[1].replace(/^[("'«“‘¿¡\[]+/u, "").toLowerCase();
    if (/^\p{L}$/u.test(base) || ABBREVIATIONS.has(base)) return false;
  }
  return true;
}

// Normaliza para comparar: minúsculas, sin tildes y sin signos de puntuación.
function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Resuelve el destino de "Ir a": un número (posición 1-based) o una palabra.
 * Una palabra se busca a partir de `from + 1` y, si no aparece, desde el principio.
 * @returns {number} índice 0-based, o -1 si no se encuentra.
 */
export function findTarget(words, query, from = -1) {
  const q = query.trim();
  if (!q || words.length === 0) return -1;
  if (/^\d+$/.test(q)) return Math.max(0, Math.min(words.length - 1, Number(q) - 1));
  const needle = normalize(q);
  if (!needle) return -1;
  const n = words.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k + n) % n;
    if (normalize(words[i]) === needle) return i;
  }
  return -1;
}

/**
 * Página (0-based) a la que pertenece la palabra `index`: la última cuyo inicio es <= index.
 * Las páginas sin texto comparten inicio con la siguiente y nunca se devuelven.
 * @param {number[]} pageStarts - índice de la primera palabra de cada página.
 * @returns {number} página 0-based, o -1 si no hay páginas.
 */
export function pageAt(pageStarts, index) {
  let lo = 0;
  let hi = pageStarts.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pageStarts[mid] <= index) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/**
 * Resuelve el destino de "Ir a página": la primera palabra de la página `page` (1-based,
 * acotada al número de páginas). Si la página no tiene texto, la siguiente que lo tenga.
 * @returns {{index:number, page:number}|null} índice 0-based y página 1-based a la que se
 *   llega, o null si no hay texto desde esa página hasta el final.
 */
export function findPage(pageStarts, page, total) {
  if (!pageStarts.length || !Number.isFinite(page)) return null;
  const p = Math.max(1, Math.min(pageStarts.length, Math.round(page)));
  const index = pageStarts[p - 1];
  if (index >= total) return null;
  return { index, page: pageAt(pageStarts, index) + 1 };
}

/**
 * Texto aproximado del tiempo restante: minutos redondeados hacia arriba
 * ("≈ 12 min", "≈ 1 h 05 min") o "< 1 min" si queda menos de un minuto.
 */
export function formatRemaining(ms) {
  if (ms < 60000) return "< 1 min";
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `≈ ${min} min`;
  return `≈ ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

export class Reader {
  /**
   * @param {object} hooks
   * @param {(word:string,index:number,total:number)=>void} hooks.onWord
   * @param {(playing:boolean)=>void} hooks.onState
   * @param {()=>void} hooks.onEnd
   */
  constructor({ onWord, onState, onEnd }) {
    this.onWord = onWord;
    this.onState = onState;
    this.onEnd = onEnd;
    this.words = [];
    this.index = 0;
    this.wpm = 300;
    this.playing = false;
    this._timer = null;
    this._nextAt = 0; // marca de tiempo (performance.now) de la próxima palabra
    this.breakFactor = 0; // pausa extra tras fin de frase o de párrafo, en múltiplos de ms/palabra (0 = desactivado)
    this._paragraphEnds = new Set();
    this._breaksFrom = [0]; // _breaksFrom[i]: nº de palabras con pausa de frase en [i, final)
  }

  /**
   * @param {string[]} words
   * @param {number[]} [paragraphEnds] - índices de la última palabra de cada párrafo.
   */
  load(words, paragraphEnds = []) {
    this.pause();
    this.words = words;
    this._paragraphEnds = new Set(paragraphEnds);
    // Precuenta de pausas de frase (dependen solo del texto): así remainingMs() es O(1).
    this._breaksFrom = new Array(words.length + 1).fill(0);
    for (let i = words.length - 2; i >= 0; i--) {
      const isBreak = this._paragraphEnds.has(i) || endsSentence(words[i]);
      this._breaksFrom[i] = this._breaksFrom[i + 1] + (isBreak ? 1 : 0);
    }
    this.index = 0;
    this._emit();
  }

  /** Tiempo estimado (ms) para terminar desde la palabra actual (incluida), al WPM actual. */
  remainingMs() {
    const left = this.words.length - this.index;
    if (left <= 0) return 0;
    const ms = msPerWord(this.wpm);
    return left * ms + this._breaksFrom[this.index] * ms * this.breakFactor;
  }

  // Modo frases separadas: pausa extra tras cada frase y cada párrafo, igual a
  // `factor` veces los ms/palabra (así escala con la velocidad).
  setBreakFactor(factor) {
    this.breakFactor = Math.max(0, factor);
  }

  /** Tiempo (ms) que la palabra `i` permanece en pantalla antes de pasar a la siguiente. */
  delayAfter(i) {
    const ms = msPerWord(this.wpm);
    const isLast = i >= this.words.length - 1;
    if (this.breakFactor > 0 && !isLast && (this._paragraphEnds.has(i) || endsSentence(this.words[i] ?? ""))) {
      return ms + ms * this.breakFactor;
    }
    return ms;
  }

  setWpm(wpm) {
    this.wpm = wpm;
    // Si está reproduciendo, reprograma con el nuevo intervalo sin perder el ritmo.
    if (this.playing) {
      clearTimeout(this._timer);
      this._nextAt = performance.now() + this.delayAfter(this.index);
      this._schedule();
    }
  }

  play() {
    if (this.playing || this.words.length === 0) return;
    if (this.index >= this.words.length - 1) this.index = 0; // reiniciar si ya terminó
    this.playing = true;
    this.onState(true);
    this._emit();
    this._nextAt = performance.now() + this.delayAfter(this.index);
    this._schedule();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    clearTimeout(this._timer);
    this._timer = null;
    this.onState(false);
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  reset() {
    this.pause();
    this.index = 0;
    this._emit();
  }

  seek(i) {
    if (this.words.length === 0) return;
    this.index = Math.max(0, Math.min(this.words.length - 1, Math.round(i)));
    if (this.playing) {
      clearTimeout(this._timer);
      this._nextAt = performance.now() + this.delayAfter(this.index);
      this._schedule();
    }
    this._emit();
  }

  skip(delta) {
    this.seek(this.index + delta);
  }

  // Bucle de renderizado: setTimeout autocorregido.
  // En vez de encadenar "esperar N ms" (que acumula deriva), cada paso se calcula
  // contra una marca absoluta _nextAt, de modo que el tiempo medio por palabra
  // converge exactamente a (60 / WPM) * 1000 ms.
  _schedule() {
    const delay = Math.max(0, this._nextAt - performance.now());
    this._timer = setTimeout(() => this._tick(), delay);
  }

  _tick() {
    if (!this.playing) return;

    if (this.index >= this.words.length - 1) {
      this.playing = false;
      this._timer = null;
      this.onState(false);
      this.onEnd();
      return;
    }

    this.index += 1;
    this._emit();
    this._nextAt += this.delayAfter(this.index);

    // Si la pestaña estuvo en segundo plano y vamos muy retrasados, resincroniza
    // en lugar de disparar una ráfaga de palabras.
    const now = performance.now();
    if (this._nextAt < now - 250) this._nextAt = now + this.delayAfter(this.index);

    this._schedule();
  }

  _emit() {
    this.onWord(this.words[this.index] ?? "", this.index, this.words.length);
  }
}
