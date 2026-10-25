// Ejecutar con: node tests/reader.test.mjs
import assert from "node:assert/strict";
import { Reader, endsSentence, findTarget, msPerWord, pivotIndex } from "../js/reader.js";

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

// Fin de frase: . ! ? … (también con comillas o paréntesis detrás), salvo iniciales y abreviaturas.
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
r2.setBreakPause(1000);
assert.equal(r2.delayAfter(0), 200);
assert.equal(r2.delayAfter(1), 1200); // fin de frase
assert.equal(r2.delayAfter(2), 1200); // fin de párrafo sin punto
assert.equal(r2.delayAfter(3), 200);
assert.equal(r2.delayAfter(4), 200); // última palabra

console.log("OK: reader.js");
