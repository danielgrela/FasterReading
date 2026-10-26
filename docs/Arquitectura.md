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
<input file> → extractPagesFromPdf() → tokenizePages() → Reader.load(words, paragraphEnds)
                                                       └→ pageStarts (en app.js)
Menú "Opciones" (<details>): velocidad, "Frases separadas", palabras de contexto, tipo de letra y tamaño, y casillas "Ocultar …" del contador
Casilla "Mostrar palabra anterior y siguiente" → app.applyContext() → atributo hidden de #prevWord / #nextWord
"Tipo de letra" / "Tamaño" → app.applyFont() / app.applySize() → variables CSS --word-font / --word-scale en :root
Casilla "Frases separadas" → Reader.setBreakFactor(2 | 0) → delayAfter(i)
Casillas "Ocultar …" → app.applyHidden() → app.renderCounter() (omite esas partes; sin ninguna, oculta el contador)
Reader --onWord--> app.renderWord() --> DOM (3 spans + palabras anterior/siguiente)
Reader --onState-> app.renderState() -> botones y campos "Ir a" / "Página" (desactivados en play)
"Ir a" (botón o Enter, sin <form>) → findTarget() → Reader.seek(i)
"Página" (botón o Enter) → findPage(pageStarts, n) → Reader.seek(i)
Reader --onWord--> contador "Palabra N de M · Página P de T · X % leído · ≈ Z min restantes" (pageAt, remainingMs) y barra de progreso
Cambio de WPM o de "Frases separadas" → app.renderCounter() → recalcula el tiempo restante
```

## Decisiones

- **Vanilla JS sin build**: cero dependencias de tooling; se ejecuta con cualquier servidor estático.
- **pdf.js vendorizado**: funciona sin conexión y la versión queda fijada.
- **Sin backend**: el PDF nunca sale del equipo (privacidad).
- **Centrado exacto**: CSS grid `minmax(0, 1fr) auto minmax(0, 1fr)`; el pivote siempre queda en el eje central y las marcas de fijación cuelgan del propio pivote.
- **Palabras de contexto** (`#prevWord` / `#nextWord`, clase `.ctx`): posicionadas en absoluto respecto al centro del escenario, así nunca desplazan la palabra actual. Miden el 45 % de `--word-size` con opacidad 0,3; `.stage` es contenedor de tamaño (`container-type: size`) y la fuente se limita con `cqh` para no invadir el contador ni el mensaje (llega a 0 si no hay sitio).
- **Diseño responsive** (solo CSS, en `css/style.css`): el tamaño de la palabra se limita por ancho y por alto (`min(9vw, 16vh)`), así cabe también en horizontal. Hasta 1100 px de ancho (tablet, incluida 16:9 horizontal) los controles forman una rejilla de 2 filas (botones y Opciones arriba, «Ir a» y «Página» abajo); hasta 600 px (móvil vertical), una sola columna a todo el ancho; con menos de 500 px de alto en horizontal (móvil girado), el panel se compacta. En pantallas táctiles los botones y campos miden al menos 44 px y se oculta la ayuda de atajos. La altura usa `100dvh` y los márgenes respetan `env(safe-area-inset-*)` (muescas).
- **Menú de opciones** (`#options`): un `<details>` nativo, sin librerías. El panel (`.options-menu`) se abre hacia arriba porque el pie de página está abajo; `app.js` lo cierra al hacer clic fuera o con Escape y quita el foco del botón tras un clic de ratón para que Espacio siga siendo play/pausa. En tablet va a la derecha de Play/Pause/Reset y en móvil ocupa todo el ancho.
- **Tipo de letra y tamaño**: `app.js` solo escribe dos variables CSS en `:root`: `--word-font` (una pila de fuentes del sistema, sin descargas) y `--word-scale`, que multiplica `--word-size`. Como las palabras de contexto se calculan a partir de `--word-size`, escalan con la actual y conservan su límite por altura. El centrado del pivote no depende de que la fuente sea monoespaciada: la rejilla de 3 columnas lo mantiene en el eje con cualquier fuente.
- **Estado en `Reader`**: la UI es una vista pasiva de callbacks, lo que facilita probarlo.
