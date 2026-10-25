---
tags:
  - fasterreading
  - arquitectura
aliases:
  - Arquitectura del Sistema
---

# Arquitectura

Volver a [[Home]].

## Árbol de archivos

```
FasterReading/
├── index.html
├── css/style.css
├── js/
│   ├── app.js            # UI y eventos
│   ├── reader.js         # motor RSVP (temporizador)
│   └── pdf-extractor.js  # pdf.js + tokenización
├── vendor/pdfjs/         # pdf.js (build ESM + worker)
├── tests/reader.test.mjs
├── docs/                 # vault de Obsidian (.obsidian/ incluido)
├── CLAUDE.md             # instrucciones para Claude Code
├── .editorconfig
├── .prettierrc.json
├── .gitignore
└── README.md
```

## Módulos

| Módulo             | Responsabilidad                                   | Detalle               |
| ------------------ | ------------------------------------------------- | --------------------- |
| `pdf-extractor.js` | File → texto → `string[]`                         | [[Procesamiento-PDF]] |
| `reader.js`        | Índice actual, play/pause/reset, temporizador     | [[Algoritmo-RSVP]]    |
| `app.js`           | Conecta DOM ↔ módulos, atajos, tema, persistencia | [[Uso]]               |

## Flujo de datos

```
<input file> → extractTextFromPdf() → tokenizeWithBreaks() → Reader.load(words, paragraphEnds)
Casilla "Frases separadas" → Reader.setBreakPause(1000 | 0) → delayAfter(i)
Reader --onWord--> app.renderWord() --> DOM (3 spans)
Reader --onState-> app.renderState() -> botones y campo "Ir a" (desactivado en play)
"Ir a" (botón o Enter, sin <form>) → findTarget() → Reader.seek(i)
Reader --onWord--> contador "Palabra N de M" y barra de progreso
```

## Decisiones

- **Vanilla JS sin build**: cero dependencias de tooling; se ejecuta con cualquier servidor estático.
- **pdf.js vendorizado**: funciona sin conexión y la versión queda fijada.
- **Sin backend**: el PDF nunca sale del equipo (privacidad).
- **Centrado exacto**: CSS grid `minmax(0, 1fr) auto minmax(0, 1fr)`; el pivote siempre queda en el eje central y las marcas de fijación cuelgan del propio pivote.
- **Diseño responsive** (solo CSS, en `css/style.css`): el tamaño de la palabra se limita por ancho y por alto (`min(9vw, 16vh)`), así cabe también en horizontal. Hasta 1100 px de ancho (tablet, incluida 16:9 horizontal) los controles forman una rejilla de 2 filas; hasta 600 px (móvil vertical), una sola columna a todo el ancho; con menos de 500 px de alto en horizontal (móvil girado), el panel se compacta. En pantallas táctiles los botones y campos miden al menos 44 px y se oculta la ayuda de atajos. La altura usa `100dvh` y los márgenes respetan `env(safe-area-inset-*)` (muescas).
- **Estado en `Reader`**: la UI es una vista pasiva de callbacks, lo que facilita probarlo.
