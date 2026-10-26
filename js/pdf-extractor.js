// Extracción de texto de un PDF 100% en el navegador usando pdf.js (vendorizado en /vendor/pdfjs).
import * as pdfjsLib from "../vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

/**
 * Extrae el texto de cada página de un PDF.
 * @param {File|Blob} file - Archivo PDF elegido por el usuario.
 * @param {(page:number,total:number)=>void} [onProgress] - Callback de progreso.
 * @returns {Promise<string[]>} Texto de cada página, en orden (vacío si la página no tiene texto).
 */
export async function extractPagesFromPdf(file, onProgress) {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];

  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();

      let text = "";
      for (const item of content.items) {
        // Los marcadores de marked-content no tienen "str"
        if (typeof item.str !== "string") continue;
        text += item.str;
        text += item.hasEOL ? "\n" : "";
      }
      pages.push(text);
      page.cleanup();
      if (onProgress) onProgress(n, pdf.numPages);
    }
  } finally {
    await loadingTask.destroy(); // libera worker y memoria
  }

  return pages;
}

/**
 * Tokeniza las páginas por separado y anota dónde empieza cada una.
 * - Cada salto de página cierra párrafo, salvo que la página acabe con una palabra
 *   partida por guion ("lec-" | "tura"): se une y la palabra cuenta para la página
 *   anterior, así el inicio de página nunca cae en una palabra que empezó antes.
 * @param {string[]} pages
 * @returns {{words: string[], paragraphEnds: number[], pageStarts: number[]}}
 *   `pageStarts[p]` es el índice de la primera palabra de la página p (0-based); una
 *   página sin texto apunta a la primera palabra de la siguiente.
 */
export function tokenizePages(pages) {
  const words = [];
  const paragraphEnds = [];
  const pageStarts = [];
  for (const raw of pages) {
    const page = tokenizeWithBreaks(raw);
    const last = words.length - 1;
    let offset = words.length;
    if (last >= 0 && /\p{L}[-‐]$/u.test(words[last]) && /^\p{Ll}/u.test(page.words[0] ?? "")) {
      words[last] = words[last].slice(0, -1) + page.words.shift();
      paragraphEnds.pop(); // el párrafo sigue en esta página
      offset = last; // los índices de esta página se desplazan una posición
    }
    pageStarts.push(words.length);
    words.push(...page.words);
    for (const i of page.paragraphEnds) paragraphEnds.push(offset + i);
  }
  return { words, paragraphEnds, pageStarts };
}

/**
 * Convierte texto bruto en un array de palabras.
 * - Une palabras partidas por guion al final de línea ("lec-\ntura" -> "lectura").
 * - Normaliza espacios, saltos de línea y caracteres invisibles.
 * @param {string} raw
 * @returns {string[]}
 */
export function tokenize(raw) {
  return tokenizeWithBreaks(raw).words;
}

/**
 * Como `tokenize()`, pero además indica dónde acaba cada párrafo: una línea en
 * blanco (o un salto de página) separa párrafos.
 * @param {string} raw
 * @returns {{words: string[], paragraphEnds: number[]}} `paragraphEnds` son los
 *   índices de la última palabra de cada párrafo.
 */
export function tokenizeWithBreaks(raw) {
  const cleaned = raw
    .replace(/[­​-‍﻿]/g, "") // guiones blandos y espacios de ancho cero
    .replace(/(\p{L})[-‐]\s*\n\s*(\p{Ll})/gu, "$1$2"); // palabra partida por guion

  const words = [];
  const paragraphEnds = [];
  for (const para of cleaned.split(/\n[^\S\n]*\n/)) {
    const parts = para.split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    words.push(...parts);
    paragraphEnds.push(words.length - 1);
  }
  return { words, paragraphEnds };
}
