// Motor RSVP: gestiona el índice actual y el temporizador.
// Fórmula exacta: intervalo (ms) = (60 / WPM) * 1000
// (+ la pausa de "frases separadas" tras fin de frase o párrafo, si está activa)

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
    this.breakPause = 0; // ms extra tras fin de frase o de párrafo (0 = desactivado)
    this._paragraphEnds = new Set();
  }

  /**
   * @param {string[]} words
   * @param {number[]} [paragraphEnds] - índices de la última palabra de cada párrafo.
   */
  load(words, paragraphEnds = []) {
    this.pause();
    this.words = words;
    this._paragraphEnds = new Set(paragraphEnds);
    this.index = 0;
    this._emit();
  }

  // Modo frases separadas: pausa extra (ms) tras cada frase y cada párrafo.
  setBreakPause(ms) {
    this.breakPause = Math.max(0, ms);
  }

  /** Tiempo (ms) que la palabra `i` permanece en pantalla antes de pasar a la siguiente. */
  delayAfter(i) {
    let ms = msPerWord(this.wpm);
    const isLast = i >= this.words.length - 1;
    if (this.breakPause > 0 && !isLast && (this._paragraphEnds.has(i) || endsSentence(this.words[i] ?? ""))) {
      ms += this.breakPause;
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
    if (this.playing) this._nextAt = performance.now() + this.delayAfter(this.index);
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
