// Ejecutar con: node tests/reader.test.mjs
import assert from "node:assert/strict";
import {
  Reader,
  endsSentence,
  findPage,
  findTarget,
  formatRemaining,
  msPerWord,
  pageAt,
  pivotIndex,
} from "../js/reader.js";

assert.equal(msPerWord(300), 200);
assert.equal(msPerWord(600), 100);
assert.equal(msPerWord(100), 600);
assert.equal(msPerWord(1000), 60);
assert.equal(pivotIndex("a"), 0);
assert.equal(pivotIndex("hola"), 1);
assert.equal(pivotIndex("lectura"), 2);

// Al terminar el documento, Play vuelve a empezar desde la primera palabra.
const reader = new Reader({ onWord() {}, onState() {}, onEnd() {} });
reader.load(["uno", "dos", "tres"]);
reader.seek(2);
reader.play();
assert.equal(reader.index, 0);
reader.pause();

// "Ir a": número (1-based, acotado) o palabra (siguiente aparición, sin tildes ni puntuación).
const words = ["Hola", "mundo,", "adiós", "hola."];
assert.equal(findTarget(words, "2"), 1);
assert.equal(findTarget(words, "99"), 3);
assert.equal(findTarget(words, "0"), 0);
assert.equal(findTarget(words, "mundo"), 1);
assert.equal(findTarget(words, "ADIOS"), 2);
assert.equal(findTarget(words, "hola", 0), 3);
assert.equal(findTarget(words, "hola", 3), 0); // vuelve al principio
assert.equal(findTarget(words, "nada"), -1);
assert.equal(findTarget(words, "  "), -1);

// Páginas: inicio de cada una (la 3 no tiene texto y comparte inicio con la 4).
const starts = [0, 4, 6, 6];
assert.equal(pageAt(starts, 0), 0);
assert.equal(pageAt(starts, 3), 0);
assert.equal(pageAt(starts, 4), 1);
assert.equal(pageAt(starts, 7), 3); // nunca la página vacía
assert.equal(pageAt([], 0), -1);
assert.deepEqual(findPage(starts, 2, 8), { index: 4, page: 2 });
assert.deepEqual(findPage(starts, 3, 8), { index: 6, page: 4 }); // salta a la siguiente con texto
assert.deepEqual(findPage(starts, 0, 8), { index: 0, page: 1 });
assert.deepEqual(findPage(starts, 99, 8), { index: 6, page: 4 });
assert.equal(findPage([0, 3], 2, 3), null); // la última página no tiene texto
assert.equal(findPage([], 1, 0), null);

// Fin de frase:. ! ? … (también con comillas o paréntesis detrás), salvo iniciales y abreviaturas.
assert.equal(endsSentence("fin."), true);
assert.equal(endsSentence("¿qué?"), true);
assert.equal(endsSentence("¡ya!»"), true);
assert.equal(endsSentence("dijo.)"), true);
assert.equal(endsSentence("pausa…"), true);
assert.equal(endsSentence("coma,"), false);
assert.equal(endsSentence("palabra"), false);
assert.equal(endsSentence("J."), false);
assert.equal(endsSentence("Sr."), false);
assert.equal(endsSentence("(pág."), false);

// Modo frases separadas: +pausa tras fin de frase y de párrafo, nunca tras la última palabra.
const r2 = new Reader({ onWord() {}, onState() {}, onEnd() {} });
r2.load(["Uno", "dos.", "Título", "tres", "fin."], [2, 4]);
r2.setWpm(300);
assert.equal(r2.delayAfter(1), 200); // desactivado por defecto
r2.setBreakFactor(2); // pausa extra = 2 × 200 ms
assert.equal(r2.delayAfter(0), 200);
assert.equal(r2.delayAfter(1), 600); // fin de frase
assert.equal(r2.delayAfter(2), 600); // fin de párrafo sin punto
assert.equal(r2.delayAfter(3), 200);
assert.equal(r2.delayAfter(4), 200); // última palabra
r2.setWpm(600); // la pausa escala con la velocidad: 100 + 2 × 100
assert.equal(r2.delayAfter(1), 300);

// Saltar durante la reproducción: la palabra de destino dura su intervalo completo.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r3 = new Reader({ onWord() {}, onState() {}, onEnd() {} });
r3.load(Array.from({ length: 10 }, (_, i) => `p${i}`));
r3.setWpm(300); // 200 ms por palabra
r3.play();
await sleep(150);
r3.seek(5);
await sleep(100); // 250 ms: el temporizador antiguo (200 ms) ya habría avanzado
assert.equal(r3.index, 5);
r3.pause();

// Tiempo restante: palabras que quedan (actual incluida) × ms/palabra, más las pausas de frase.
assert.equal(formatRemaining(59999), "< 1 min");
assert.equal(formatRemaining(60000), "≈ 1 min");
assert.equal(formatRemaining(60001), "≈ 2 min");
assert.equal(formatRemaining(85 * 60000), "≈ 1 h 25 min");
assert.equal(formatRemaining(61 * 60000), "≈ 1 h 01 min");
const r4 = new Reader({ onWord() {}, onState() {}, onEnd() {} });
r4.load(["Uno", "dos.", "Tres", "cuatro", "fin."], [3]);
r4.setWpm(300); // 200 ms/palabra
assert.equal(r4.remainingMs(), 5 * 200);
r4.setBreakFactor(2); // pausas tras "dos." y tras el fin de párrafo en "cuatro" (no tras la última)
assert.equal(r4.remainingMs(), 5 * 200 + 2 * 400);
r4.seek(3);
assert.equal(r4.remainingMs(), 2 * 200 + 1 * 400);
r4.seek(4);
assert.equal(r4.remainingMs(), 200);
r4.load([]);
assert.equal(r4.remainingMs(), 0);

console.log("OK: reader.js");
