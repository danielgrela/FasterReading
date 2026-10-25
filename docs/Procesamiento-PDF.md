---
tags:
  - fasterreading
  - pdf
---

# Procesamiento de PDF

Volver a [[Home]]. Código en `js/pdf-extractor.js`.

## Pipeline

1. `file.arrayBuffer()` → `Uint8Array`.
2. `pdfjsLib.getDocument({ data })` crea la tarea de carga; el worker se configura con `GlobalWorkerOptions.workerSrc` apuntando a `vendor/pdfjs/pdf.worker.min.mjs`.
3. Por cada página: `getTextContent()`; se concatenan los `item.str` y se añade `\n` cuando `item.hasEOL`.
4. `loadingTask.destroy()` en `finally` para liberar memoria. Las páginas se unen con una línea en blanco (`\n\n`), de modo que cada salto de página cierra párrafo.
5. `tokenizeWithBreaks()` (y `tokenize()`, que devuelve solo `words`):
   - elimina guiones blandos y caracteres de ancho cero;
   - une palabras partidas por guion de fin de línea (`lec-\ntura` → `lectura`), también entre páginas;
   - separa párrafos por líneas en blanco y, dentro de cada uno, normaliza espacios y divide en palabras;
   - devuelve `{ words, paragraphEnds }`, donde `paragraphEnds` son los índices de la última palabra de cada párrafo. Los usa el modo frases separadas de [[Algoritmo-RSVP]].

## Limitaciones

- **PDF escaneados**: sin capa de texto → la app avisa; haría falta OCR (ver [[Roadmap]]).
- Columnas múltiples, cabeceras y pies de página se leen en el orden interno del PDF.
- Un guion legítimo al final de línea ("ex-\nalumno") se unirá como "exalumno".
- Los párrafos solo se detectan si el PDF deja una línea en blanco entre ellos (o en los saltos de página); si no, el modo frases separadas sigue pausando en cada fin de frase.
- `pdf-extractor.js` importa pdf.js, que necesita el DOM: `tokenizeWithBreaks()` no se puede probar con Node y se comprueba en el navegador.

Alimenta al motor de [[Algoritmo-RSVP]].
