// Extracción de texto de un PDF 100% en el navegador usando pdf.js (vendorizado en /vendor/pdfjs).
import * as pdfjsLib from "../vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

/**
 * Extrae el texto de todas las páginas de un PDF.
 * @param {File|Blob} file - Archivo PDF elegido por el usuario.
 * @param {(page:number,total:number)=>void} [onProgress] - Callback de progreso.
 * @returns {Promise<string>} Texto completo del documento.
 */
export async function extractTextFromPdf(file, onProgress) {
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

  // Línea en blanco entre páginas: el salto de página cuenta como fin de párrafo.
  return pages.join("\n\n");
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
